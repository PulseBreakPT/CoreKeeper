/** Desenho da arena, da serpente e dos efeitos, em Canvas 2D. */

import { PASSO_INICIAL, PASSO_MINIMO, vetor, type Jogo, type Ponto } from './logica';

/** Matiz do corpo parado (esmeralda) e à velocidade máxima (turquesa). */
const MATIZ_LENTO = 83;
const MATIZ_RAPIDO = 155;
/** A cor só aquece a sério na parte final da curva de velocidade. */
const CURVA_MATIZ = 1.8;

const COR_COMIDA = '#f8bd91';
const COR_COMIDA_BORDA = '#ed956d';
const COR_MORTE = '#ff6b7a';

const LETRA = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';

/** Distância entre amostras do corpo, em células: mais fino, mais suave. */
const ESPACAMENTO = 0.3;
/** Tecto de amostras, para a serpente comprida não custar quadros. */
const AMOSTRAS_MAXIMAS = 170;
/** Quanto do caminho à frente conta para a inclinação da cabeça, em células. */
const OLHAR = 0.65;

interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  total: number;
  raio: number;
  cor: string;
}

interface Anel {
  x: number;
  y: number;
  vida: number;
  cor: string;
  alcance: number;
}

interface Flutuante {
  x: number;
  y: number;
  texto: string;
  vida: number;
  cor: string;
  escala: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function limitar(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/**
 * Arredonda os cantos rectos da grelha, puxando cada amostra na direcção das
 * vizinhas. A cabeça e a cauda ficam presas, por isso o comprimento não muda.
 */
function suavizar(pontos: { x: number; y: number }[], passagens: number): void {
  if (pontos.length < 3) return;
  for (let p = 0; p < passagens; p++) {
    let ax = pontos[0].x;
    let ay = pontos[0].y;
    for (let i = 1; i < pontos.length - 1; i++) {
      const cx = pontos[i].x;
      const cy = pontos[i].y;
      pontos[i].x = ax * 0.25 + cx * 0.5 + pontos[i + 1].x * 0.25;
      pontos[i].y = ay * 0.25 + cy * 0.5 + pontos[i + 1].y * 0.25;
      ax = cx;
      ay = cy;
    }
  }
}

/** Caminho de rectângulo arredondado, sem depender do `roundRect` do browser. */
function caminhoRedondo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  l: number,
  a: number,
  r: number,
): void {
  const raio = Math.min(r, l / 2, a / 2);
  ctx.beginPath();
  ctx.moveTo(x + raio, y);
  ctx.lineTo(x + l - raio, y);
  ctx.quadraticCurveTo(x + l, y, x + l, y + raio);
  ctx.lineTo(x + l, y + a - raio);
  ctx.quadraticCurveTo(x + l, y + a, x + l - raio, y + a);
  ctx.lineTo(x + raio, y + a);
  ctx.quadraticCurveTo(x, y + a, x, y + a - raio);
  ctx.lineTo(x, y + raio);
  ctx.quadraticCurveTo(x, y, x + raio, y);
  ctx.closePath();
}

export class Pintor {
  private readonly ctx: CanvasRenderingContext2D;
  private ladoCss = 0;
  /** Raio dos cantos da arena, partilhado com o CSS para as bordas baterem certo. */
  raio = 12;
  /** Intensidade 0–1 da velocidade actual, lida pelo HUD para acompanhar a cor. */
  intensidade = 0;
  /** Matiz actual do corpo — é daqui que a interface tira a sua cor. */
  matiz = MATIZ_LENTO;
  /** Fracção do relógio que resta (1 a 0), ou `null` no modo clássico. */
  relogio: number | null = null;
  /** Segundos inteiros que faltam, para a contagem grande dos últimos tempos. */
  segundos = 0;
  /** Passo actual da contagem de arranque, ou `null` fora dela. */
  arranque: { texto: string; progresso: number } | null = null;

  /** O chão da arena é pintado uma vez e reaproveitado — só muda quando o ecrã muda. */
  private chao: HTMLCanvasElement | null = null;
  private celulasChao = 0;

  private particulas: Particula[] = [];
  private aneis: Anel[] = [];
  private flutuantes: Flutuante[] = [];
  private tremor = 0;
  private clarao = 0;
  private claraoCor = COR_MORTE;
  /** Brilho extra na moldura, aceso ao comer e nos marcos. */
  private moldura = 0;
  private molduraCor = COR_COMIDA;
  /** Sobra de crescimento: faz a cabeça inchar por instantes depois de comer. */
  private incho = 0;
  /** Progresso 0–1 da desintegração do corpo depois da morte. */
  private desfazer = -1;
  private desfeitos = 0;

  constructor(private readonly tela: HTMLCanvasElement) {
    const ctx = tela.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D indisponível');
    this.ctx = ctx;
  }

  /** Ajusta a tela a um quadrado de `ladoCss` píxeis CSS, com nitidez de retina. */
  redimensionar(ladoCss: number): void {
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    this.ladoCss = ladoCss;
    this.raio = Math.max(8, Math.round(ladoCss * 0.028));
    this.tela.style.width = `${ladoCss}px`;
    this.tela.style.height = `${ladoCss}px`;
    this.tela.width = Math.round(ladoCss * dpr);
    this.tela.height = Math.round(ladoCss * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.chao = null;
  }

  /** Jacto curto de partículas na célula indicada, com o "+1" a subir. */
  explodir(p: Ponto, pontos: number, marco: boolean): void {
    const cor = marco ? '#ffe9a8' : COR_COMIDA;
    for (let i = 0; i < (marco ? 22 : 14); i++) {
      const ang = (Math.PI * 2 * i) / (marco ? 22 : 14) + Math.random() * 0.4;
      const vel = 2.2 + Math.random() * 3.4;
      this.particulas.push({
        x: p.x + 0.5,
        y: p.y + 0.5,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel,
        vida: 0.42 + Math.random() * 0.22,
        total: 0.64,
        raio: 0.05 + Math.random() * 0.07,
        cor: i % 3 === 0 ? COR_COMIDA_BORDA : cor,
      });
    }
    this.aneis.push({ x: p.x + 0.5, y: p.y + 0.5, vida: 1, cor, alcance: marco ? 3.2 : 1.7 });
    if (this.flutuantes.length > 2) this.flutuantes.shift();
    this.flutuantes.push({
      x: p.x + 0.5,
      y: p.y + 0.35,
      texto: marco ? String(pontos) : '+1',
      vida: 1,
      cor: marco ? '#ffe9a8' : '#cfe9ff',
      escala: marco ? 1.7 : 0.8,
    });
    this.incho = 1;
    this.moldura = marco ? 1 : 0.55;
    this.molduraCor = cor;
  }

  /** Impacto de fim de partida: tremor, clarão e o corpo a desfazer-se. */
  impacto(p: Ponto): void {
    this.tremor = 1;
    this.clarao = 1;
    this.claraoCor = COR_MORTE;
    this.moldura = 1;
    this.molduraCor = COR_MORTE;
    this.desfazer = 0;
    this.desfeitos = 0;
    this.aneis.push({ x: p.x + 0.5, y: p.y + 0.5, vida: 1, cor: COR_MORTE, alcance: 3 });
  }

  /** Fim por arena cheia: sem tremor, com clarão dourado. */
  vitoria(p: Ponto): void {
    this.clarao = 0.8;
    this.claraoCor = COR_COMIDA;
    this.moldura = 1;
    this.molduraCor = COR_COMIDA;
    this.aneis.push({ x: p.x + 0.5, y: p.y + 0.5, vida: 1, cor: COR_COMIDA, alcance: 4 });
  }

  /** Apaga tudo o que ficou de efeitos da partida anterior. */
  limpar(): void {
    this.particulas = [];
    this.aneis = [];
    this.flutuantes = [];
    this.tremor = 0;
    this.clarao = 0;
    this.moldura = 0;
    this.incho = 0;
    this.desfazer = -1;
    this.desfeitos = 0;
  }

  desenhar(jogo: Jogo, t: number, dt: number, tempo: number): void {
    const ctx = this.ctx;
    const L = this.ladoCss;
    if (L <= 0) return;
    const cel = L / jogo.lado;
    const s = Math.min(0.05, dt / 1000);

    this.intensidade = limitar(
      (PASSO_INICIAL - jogo.passoMs()) / (PASSO_INICIAL - PASSO_MINIMO),
      0,
      1,
    );
    const matiz = lerp(MATIZ_LENTO, MATIZ_RAPIDO, Math.pow(this.intensidade, CURVA_MATIZ));
    this.matiz = matiz;

    this.avancarEfeitos(s, jogo, cel);

    ctx.save();
    if (this.tremor > 0.002) {
      const f = this.tremor * cel * 0.55;
      ctx.translate((Math.random() - 0.5) * f, (Math.random() - 0.5) * f);
    }

    this.arena(L, cel, jogo.lado, matiz);
    this.contagem(L, tempo, jogo.estado);
    // A contagem fica por trás de tudo: é pano de fundo, a serpente é o assunto.
    this.arrancada(L, matiz);
    this.comida(jogo.comida, cel, tempo, jogo.estado);
    this.serpente(jogo, t, cel, tempo, matiz);
    this.efeitos(cel, jogo.lado);

    if (this.clarao > 0.002) {
      // Clarão pelas bordas, como um golpe — o centro fica limpo para se ver o jogo.
      const golpe = ctx.createRadialGradient(L / 2, L / 2, L * 0.2, L / 2, L / 2, L * 0.72);
      golpe.addColorStop(0, 'rgba(0, 0, 0, 0)');
      golpe.addColorStop(1, this.claraoCor);
      ctx.fillStyle = golpe;
      ctx.globalAlpha = this.clarao * 0.55;
      ctx.fillRect(0, 0, L, L);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  private avancarEfeitos(s: number, jogo: Jogo, cel: number): void {
    this.tremor = Math.max(0, this.tremor - s * 3.4);
    this.clarao = Math.max(0, this.clarao - s * 5);
    this.moldura = Math.max(0, this.moldura - s * 2.2);
    this.incho = Math.max(0, this.incho - s * 5);

    if (this.desfazer >= 0 && this.desfazer < 1) {
      this.desfazer = Math.min(1, this.desfazer + s * 1.7);
      const ate = Math.floor(this.desfazer * jogo.corpo.length);
      for (; this.desfeitos < ate; this.desfeitos++) {
        // Desfaz-se da cauda para a cabeça: a cara é a última coisa a desaparecer.
        this.pulverizar(jogo.corpo[jogo.corpo.length - 1 - this.desfeitos], cel);
      }
    }

    for (const p of this.particulas) {
      p.x += p.vx * s;
      p.y += p.vy * s;
      const travao = 1 - Math.min(0.9, s * 3.2);
      p.vx *= travao;
      p.vy = p.vy * travao + s * 3.6;
      p.vida -= s;
    }
    if (this.particulas.length > 0) this.particulas = this.particulas.filter((p) => p.vida > 0);

    for (const a of this.aneis) a.vida -= s * 2.6;
    if (this.aneis.length > 0) this.aneis = this.aneis.filter((a) => a.vida > 0);

    for (const f of this.flutuantes) {
      f.y -= s * 2.2;
      f.vida -= s * (f.escala > 1 ? 1.1 : 1.9);
    }
    if (this.flutuantes.length > 0) this.flutuantes = this.flutuantes.filter((f) => f.vida > 0);
  }

  /** Um segmento do corpo a virar pó, quando a serpente se desfaz. */
  private pulverizar(p: Ponto, _cel: number): void {
    for (let i = 0; i < 4; i++) {
      const ang = Math.random() * Math.PI * 2;
      const vel = 0.8 + Math.random() * 2.4;
      this.particulas.push({
        x: p.x + 0.5,
        y: p.y + 0.5,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel - 1,
        vida: 0.4 + Math.random() * 0.4,
        total: 0.8,
        raio: 0.05 + Math.random() * 0.06,
        cor: i === 0 ? COR_MORTE : '#8ef0c6',
      });
    }
  }

  // ---------- Arena ----------

  /** Pinta o chão da arena num buffer: só muda quando o tamanho muda. */
  private prepararChao(L: number, cel: number, lado: number): HTMLCanvasElement {
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const buffer = document.createElement('canvas');
    buffer.width = Math.round(L * dpr);
    buffer.height = Math.round(L * dpr);
    const c = buffer.getContext('2d');
    if (!c) return buffer;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    caminhoRedondo(c, 0, 0, L, L, this.raio);
    const fundo = c.createLinearGradient(0, 0, L * 0.35, L);
    fundo.addColorStop(0, '#172013');
    fundo.addColorStop(0.55, '#11190f');
    fundo.addColorStop(1, '#0e140c');
    c.fillStyle = fundo;
    c.fill();
    c.save();
    c.clip();

    c.strokeStyle = 'rgba(174, 198, 143, 0.045)';
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 1; i < lado; i++) {
      c.moveTo(i * cel, 0); c.lineTo(i * cel, L);
      c.moveTo(0, i * cel); c.lineTo(L, i * cel);
    }
    c.stroke();

    // Grelha de pontos nos cruzamentos: dá escala sem sujar o campo de jogo.
    c.fillStyle = 'rgba(174, 198, 143, 0.17)';
    const r = Math.max(0.7, cel * 0.045);
    for (let y = 1; y < lado; y++) {
      for (let x = 1; x < lado; x++) {
        c.beginPath();
        c.arc(x * cel, y * cel, r, 0, Math.PI * 2);
        c.fill();
      }
    }

    // Vinheta interior: escurece as bordas e empurra o olhar para o centro.
    const vinheta = c.createRadialGradient(L / 2, L / 2, L * 0.25, L / 2, L / 2, L * 0.75);
    vinheta.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vinheta.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
    c.fillStyle = vinheta;
    c.fillRect(0, 0, L, L);
    c.restore();

    return buffer;
  }

  private arena(L: number, cel: number, lado: number, matiz: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#10150d';
    ctx.fillRect(-L, -L, L * 3, L * 3);

    if (!this.chao || this.celulasChao !== lado) {
      this.chao = this.prepararChao(L, cel, lado);
      this.celulasChao = lado;
    }
    ctx.drawImage(this.chao, 0, 0, L, L);

    // Moldura: halo largo e fio fino, ambos na cor da serpente.
    const brilho = this.moldura;
    caminhoRedondo(ctx, 2, 2, L - 4, L - 4, this.raio - 1);
    ctx.strokeStyle = `hsla(${matiz}, 85%, 60%, ${0.1 + this.intensidade * 0.08})`;
    ctx.lineWidth = Math.max(4, cel * 0.28);
    ctx.stroke();
    ctx.strokeStyle = `hsla(${matiz}, 88%, 70%, ${0.45 + this.intensidade * 0.25})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // O relógio drena a própria moldura: lê-se de relance, de qualquer ponto do
    // ecrã, e não rouba um centímetro à interface.
    if (this.relogio !== null) {
      const largura = L - 4;
      const r = Math.max(1, this.raio - 1);
      const perimetro = 2 * (largura - 2 * r) * 2 + 2 * Math.PI * r;
      const resta = limitar(this.relogio, 0, 1);
      const aperto = resta < 0.3 ? 1 - resta / 0.3 : 0;
      caminhoRedondo(ctx, 2, 2, largura, largura, r);
      ctx.setLineDash([perimetro * resta, perimetro]);
      ctx.strokeStyle =
        aperto > 0
          ? `hsl(${lerp(matiz, 352, aperto)}, ${lerp(88, 92, aperto)}%, ${lerp(70, 66, aperto)}%)`
          : `hsl(${matiz}, 88%, 74%)`;
      ctx.lineWidth = 3 + aperto * 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // O clarão de comer ou morrer passa por cima, curto e por cima da cor base.
    if (brilho > 0.01) {
      ctx.strokeStyle = this.molduraCor;
      ctx.globalAlpha = brilho * 0.75;
      ctx.lineWidth = 1.5 + brilho * 2.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    this.cantos(L, cel, matiz);
  }

  /** Quatro cantos em esquadria — moldura de instrumento, não de formulário. */
  private cantos(L: number, cel: number, matiz: number): void {
    const ctx = this.ctx;
    const braco = Math.max(10, cel * 0.9);
    const recuo = this.raio * 0.55;
    ctx.strokeStyle = `hsla(${matiz}, 85%, 72%, ${0.55 + this.moldura * 0.45})`;
    ctx.lineWidth = Math.max(1.5, cel * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [sx, sy] of [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]) {
      const x = sx > 0 ? recuo : L - recuo;
      const y = sy > 0 ? recuo : L - recuo;
      ctx.moveTo(x + sx * braco, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + sy * braco);
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  /** Os últimos segundos aparecem em grande no meio da arena, a pulsar. */
  private contagem(L: number, tempo: number, estado: string): void {
    if (this.relogio === null || estado !== 'a-jogar') return;
    if (this.segundos > 3 || this.segundos <= 0) return;
    const ctx = this.ctx;
    const pulso = 0.5 + 0.5 * Math.sin(tempo / 120);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${L * 0.4}px ${LETRA}`;
    ctx.globalAlpha = 0.07 + pulso * 0.07;
    ctx.fillStyle = COR_MORTE;
    ctx.fillText(String(this.segundos), L / 2, L / 2);
    ctx.restore();
  }

  /**
   * O 3, 2, 1, VAI antes de a serpente se mexer.
   *
   * Cada passo entra a crescer e sai a encolher e a desvanecer, para o olho
   * apanhar a mudança sem precisar de ler o número todo.
   */
  private arrancada(L: number, matiz: number): void {
    if (!this.arranque) return;
    const ctx = this.ctx;
    const t = limitar(this.arranque.progresso, 0, 1);
    const entrada = Math.min(1, t / 0.22);
    const saida = t > 0.7 ? (t - 0.7) / 0.3 : 0;
    const escala = 0.82 + entrada * 0.18 + saida * 0.25;
    const alfa = entrada * (1 - saida * saida);
    const vai = this.arranque.texto.length > 1;

    ctx.save();
    ctx.translate(L / 2, L / 2);
    ctx.scale(escala, escala);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = alfa;

    // Anel que abre com o passo, para o número não flutuar no vazio.
    ctx.strokeStyle = `hsla(${matiz}, 90%, 70%, ${0.5 * (1 - t)})`;
    ctx.lineWidth = Math.max(2, L * 0.006);
    ctx.beginPath();
    ctx.arc(0, 0, L * (0.12 + t * 0.09), 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = `700 ${L * (vai ? 0.17 : 0.28)}px ${LETRA}`;
    ctx.lineWidth = Math.max(3, L * 0.014);
    ctx.strokeStyle = 'rgba(4, 8, 16, 0.65)';
    ctx.strokeText(this.arranque.texto, 0, 0);
    ctx.fillStyle = vai ? `hsl(${matiz}, 95%, 82%)` : '#ffffff';
    ctx.fillText(this.arranque.texto, 0, 0);
    ctx.restore();
  }

  // ---------- Comida ----------

  private comida(c: Ponto, cel: number, tempo: number, estado: string): void {
    if (estado === 'completo') return;
    const ctx = this.ctx;
    const cx = (c.x + 0.5) * cel;
    const cy = (c.y + 0.5) * cel;
    const pulso = 0.5 + 0.5 * Math.sin(tempo / 260);
    const raio = cel * (0.32 + 0.04 * pulso);

    ctx.save();
    ctx.translate(cx, cy);

    // Sombra no chão: assenta a comida na arena em vez de a deixar a flutuar.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, cel * 0.3, raio * 0.85, raio * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Faísca de quatro pontas, a rodar devagar.
    ctx.rotate(tempo / 1600);
    ctx.fillStyle = `rgba(255, 214, 150, ${0.3 + 0.35 * pulso})`;
    const ponta = cel * (0.52 + 0.08 * pulso);
    const cintura = cel * 0.07;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i;
      const b = a + Math.PI / 4;
      ctx.lineTo(Math.cos(a) * ponta, Math.sin(a) * ponta);
      ctx.lineTo(Math.cos(b) * cintura, Math.sin(b) * cintura);
    }
    ctx.closePath();
    ctx.fill();
    ctx.rotate(-tempo / 1600);

    ctx.strokeStyle = COR_COMIDA_BORDA;
    ctx.globalAlpha = 0.28 + 0.2 * pulso;
    ctx.lineWidth = Math.max(1.2, cel * 0.06);
    ctx.beginPath();
    ctx.arc(0, 0, cel * (0.4 + 0.06 * pulso), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.shadowColor = COR_COMIDA_BORDA;
    ctx.shadowBlur = cel * 0.8;
    const g = ctx.createRadialGradient(-raio * 0.3, -raio * 0.35, raio * 0.1, 0, 0, raio);
    g.addColorStop(0, '#fffaf0');
    g.addColorStop(0.5, COR_COMIDA);
    g.addColorStop(1, COR_COMIDA_BORDA);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, raio, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---------- Serpente ----------

  /**
   * Desenha a serpente por cima do caminho que ela percorreu mesmo.
   *
   * É aqui que mora a fluidez. Interpolar cada célula em linha recta entre onde
   * estava e onde está faz o corpo cortar as esquinas e encolher a meio das
   * curvas — lê-se como movimento aos saltos. Em vez disso andamos sobre a
   * linha das células por onde a cabeça passou, medida em distância: a cabeça
   * avança exactamente uma célula por passo, a cauda segue-lhe o rasto pelo
   * mesmo sítio, e as curvas são dobradas em vez de cortadas.
   */
  private serpente(jogo: Jogo, t: number, cel: number, tempo: number, matiz: number): void {
    const ctx = this.ctx;
    const corpo = jogo.corpo;
    const n = corpo.length;
    if (n === 0 || this.desfazer >= 1) return;

    // O caminho leva também a célula que a cauda acabou de largar: é onde ela
    // ainda está no princípio do passo.
    const solta = jogo.anterior[n - 1];
    const derradeira = corpo[n - 1];
    const caminho =
      solta && (solta.x !== derradeira.x || solta.y !== derradeira.y)
        ? [...corpo, solta]
        : corpo;
    const m = caminho.length - 1;

    /** Posição, em píxeis, à distância `s` da célula da cabeça ao longo do caminho. */
    const posicao = (s: number): { x: number; y: number } => {
      const c = limitar(s, 0, m);
      const i = m === 0 ? 0 : Math.min(m - 1, Math.floor(c));
      const a = caminho[i];
      const b = caminho[i + 1] ?? a;
      const f = c - i;
      return { x: (lerp(a.x, b.x, f) + 0.5) * cel, y: (lerp(a.y, b.y, f) + 0.5) * cel };
    };

    // A cabeça está a `1 - t` do fim do caminho; a cauda, um corpo atrás. O
    // mínimo trata o passo em que a serpente cresce: aí a cauda fica parada.
    const cabecaS = 1 - t;
    const caudaCheia = Math.min(m, cabecaS + (n - 1));
    const caudaS =
      this.desfazer >= 0 ? cabecaS + (caudaCheia - cabecaS) * (1 - this.desfazer) : caudaCheia;
    const comprimento = Math.max(0, caudaS - cabecaS);

    const espacamento = Math.max(ESPACAMENTO, comprimento / AMOSTRAS_MAXIMAS);
    const total = Math.max(2, Math.ceil(comprimento / espacamento) + 1);
    const pontos: { x: number; y: number }[] = [];
    for (let i = 0; i < total; i++) {
      pontos.push(posicao(cabecaS + (comprimento * i) / (total - 1)));
    }
    suavizar(pontos, 2);

    // O corpo afina da cabeça para a cauda, em bandas que se sobrepõem. As
    // bandas são baratas de traçar; o que dava bolhas era o halo, que agora
    // leva uma passagem só, de largura constante.
    const larguraCabeca = cel * 0.78;
    const larguraCauda = lerp(larguraCabeca, cel * 0.36, Math.min(1, comprimento / 7));
    const bandas = limitar(Math.ceil(total / 4), 1, 16);

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const faixa = (k: number) => {
      const i0 = Math.floor((k * (total - 1)) / bandas);
      const i1 = Math.ceil(((k + 1) * (total - 1)) / bandas);
      const f = (i0 + i1) / 2 / Math.max(1, total - 1);
      return { i0, i1, f, largura: lerp(larguraCabeca, larguraCauda, f) };
    };

    // Halo de movimento: uma passagem inteira, senão as pontas redondas de cada
    // banda desenham círculos uns por cima dos outros ao longo do corpo.
    ctx.strokeStyle = `hsla(${matiz}, 90%, 62%, ${0.1 + this.intensidade * 0.1})`;
    ctx.lineWidth = larguraCabeca + cel * (0.26 + this.intensidade * 0.28);
    this.traco(pontos, 0, total - 1);

    // Contorno escuro: é o que separa o corpo do chão a qualquer velocidade.
    const contorno = Math.max(2, cel * 0.1);
    ctx.strokeStyle = 'rgba(3, 14, 12, 0.88)';
    for (let k = 0; k < bandas; k++) {
      const b = faixa(k);
      ctx.lineWidth = b.largura + contorno;
      this.traco(pontos, b.i0, b.i1);
    }

    for (let k = 0; k < bandas; k++) {
      const b = faixa(k);
      ctx.lineWidth = b.largura;
      ctx.strokeStyle = `hsl(${matiz + b.f * 8}, ${lerp(78, 64, b.f)}%, ${lerp(56, 34, b.f)}%)`;
      this.traco(pontos, b.i0, b.i1);
    }

    // Escamas: traços curtos perpendiculares, todos num só caminho.
    const salto = Math.max(2, Math.round(0.72 / espacamento));
    if (total > salto * 2) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.11)';
      ctx.lineWidth = Math.max(1, cel * 0.06);
      ctx.beginPath();
      for (let i = salto; i < total - salto; i += salto) {
        const f = i / (total - 1);
        const dx = pontos[i + 1].x - pontos[i - 1].x;
        const dy = pontos[i + 1].y - pontos[i - 1].y;
        const d = Math.hypot(dx, dy) || 1;
        const meia = lerp(larguraCabeca, larguraCauda, f) * 0.3;
        ctx.moveTo(pontos[i].x - (dy / d) * meia, pontos[i].y + (dx / d) * meia);
        ctx.lineTo(pontos[i].x + (dy / d) * meia, pontos[i].y - (dx / d) * meia);
      }
      ctx.stroke();
    }

    // Brilho de cima: um fio claro deslocado, que dá volume ao tubo.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.lineWidth = cel * 0.15;
    ctx.save();
    ctx.translate(0, -cel * 0.15);
    this.traco(pontos, 0, Math.max(0, total - 3));
    ctx.restore();
    ctx.restore();

    // A inclinação da cabeça sai do próprio caminho, por isso roda sozinha ao
    // dobrar a esquina em vez de saltar 90 graus de um quadro para o outro.
    const olhar = Math.min(total - 1, Math.max(1, Math.round(OLHAR / espacamento)));
    const dx = pontos[0].x - pontos[olhar].x;
    const dy = pontos[0].y - pontos[olhar].y;
    const v = vetor(jogo.direcao);
    const angulo = Math.hypot(dx, dy) > 0.01 ? Math.atan2(dy, dx) : Math.atan2(v.y, v.x);
    this.cabeca(pontos[0], jogo, cel, tempo, matiz, angulo);
  }

  /** Traça a fatia [i0, i1] passando suave por cima das amostras. */
  private traco(pontos: { x: number; y: number }[], i0: number, i1: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(pontos[i0].x, pontos[i0].y);
    if (i1 <= i0) {
      ctx.lineTo(pontos[i0].x + 0.01, pontos[i0].y);
      ctx.stroke();
      return;
    }
    // Curvas quadráticas ancoradas nos pontos médios: sem cantos no traço.
    for (let i = i0 + 1; i < i1; i++) {
      const a = pontos[i];
      const b = pontos[i + 1];
      ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
    }
    ctx.lineTo(pontos[i1].x, pontos[i1].y);
    ctx.stroke();
  }

  private cabeca(
    p: { x: number; y: number },
    jogo: Jogo,
    cel: number,
    tempo: number,
    matiz: number,
    angulo: number,
  ): void {
    const ctx = this.ctx;
    const escala = 1 + this.incho * 0.2;
    const l = cel * 1.06 * escala;
    const vivo = jogo.estado !== 'morto';

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angulo);

    // Luz projectada à frente: lê-se a direcção mesmo de relance.
    if (vivo) {
      const facho = ctx.createRadialGradient(l * 0.4, 0, 0, l * 0.4, 0, l * 1.5);
      facho.addColorStop(0, `hsla(${matiz}, 95%, 66%, ${0.08 + this.intensidade * 0.1})`);
      facho.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
      ctx.fillStyle = facho;
      ctx.beginPath();
      ctx.arc(l * 0.4, 0, l * 1.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rebordo escuro primeiro: separa a cabeça do corpo mesmo a alta velocidade.
    caminhoRedondo(ctx, -l / 2, -l / 2, l, l, l * 0.36);
    ctx.fillStyle = 'rgba(3, 14, 12, 0.88)';
    ctx.fill();

    const m = l - Math.max(2, cel * 0.1);
    caminhoRedondo(ctx, -m / 2, -m / 2, m, m, m * 0.34);
    const brilho = ctx.createLinearGradient(0, -m / 2, 0, m / 2);
    brilho.addColorStop(0, '#ffffff');
    brilho.addColorStop(0.42, `hsl(${matiz}, 95%, 86%)`);
    brilho.addColorStop(1, `hsl(${matiz + 6}, 85%, 66%)`);
    ctx.fillStyle = brilho;
    ctx.fill();

    // Olhos: já rodados com a cabeça, ficam sempre virados para a frente.
    const dOlho = cel * 0.21;
    const frente = cel * 0.17;
    const raioOlho = cel * 0.125;
    const piscar = vivo && Math.sin(tempo / 1400) > 0.985 ? 0.2 : 1;
    ctx.fillStyle = '#04201a';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(frente, dOlho * s, raioOlho, raioOlho * piscar, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (vivo && piscar > 0.5) {
      ctx.fillStyle = '#ffffff';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(frente + raioOlho * 0.34, dOlho * s - raioOlho * 0.2, raioOlho * 0.34, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (!vivo) {
      // Cruz nos olhos: leitura imediata de que a partida acabou.
      ctx.strokeStyle = '#04201a';
      ctx.lineWidth = Math.max(1.4, cel * 0.07);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (const s of [-1, 1]) {
        ctx.moveTo(frente - raioOlho, dOlho * s - raioOlho);
        ctx.lineTo(frente + raioOlho, dOlho * s + raioOlho);
        ctx.moveTo(frente + raioOlho, dOlho * s - raioOlho);
        ctx.lineTo(frente - raioOlho, dOlho * s + raioOlho);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- Efeitos ----------

  private efeitos(cel: number, lado: number): void {
    const ctx = this.ctx;

    for (const a of this.aneis) {
      const p = 1 - a.vida;
      ctx.save();
      ctx.globalAlpha = a.vida * 0.6;
      ctx.strokeStyle = a.cor;
      ctx.lineWidth = Math.max(1, cel * 0.13 * a.vida);
      ctx.beginPath();
      ctx.arc(a.x * cel, a.y * cel, cel * (0.3 + p * a.alcance), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const p of this.particulas) {
      ctx.globalAlpha = limitar(p.vida / p.total, 0, 1);
      ctx.fillStyle = p.cor;
      ctx.beginPath();
      ctx.arc(p.x * cel, p.y * cel, p.raio * cel, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (this.flutuantes.length === 0) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.flutuantes) {
      // Preso dentro da arena: perto da borda o número não sai pela moldura fora.
      const y = limitar(f.y, 0.7, lado - 0.7);
      const tamanho = cel * 0.6 * f.escala * (1 + (1 - f.vida) * 0.2);
      ctx.font = `700 ${tamanho}px ${LETRA}`;
      ctx.globalAlpha = limitar(f.vida, 0, 1) * 0.9;
      ctx.lineWidth = Math.max(1.5, tamanho * 0.14);
      ctx.strokeStyle = 'rgba(4, 8, 16, 0.6)';
      ctx.strokeText(f.texto, f.x * cel, y * cel);
      ctx.fillStyle = f.cor;
      ctx.fillText(f.texto, f.x * cel, y * cel);
    }
    ctx.restore();
  }
}
