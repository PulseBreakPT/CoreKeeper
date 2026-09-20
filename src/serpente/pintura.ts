/** Desenho da arena, da serpente e dos efeitos, em Canvas 2D. */

import { PASSO_INICIAL, PASSO_MINIMO, vetor, type Jogo, type Ponto } from './logica';

/** Matiz do corpo parado (esmeralda) e à velocidade máxima (turquesa). */
const MATIZ_LENTO = 155;
const MATIZ_RAPIDO = 192;
/** A cor só aquece a sério na parte final da curva de velocidade. */
const CURVA_MATIZ = 1.8;

const COR_COMIDA = '#ffc46b';
const COR_COMIDA_BORDA = '#ff7a59';
const COR_MORTE = '#ff6b7a';

const LETRA = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';

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
    fundo.addColorStop(0, '#16203a');
    fundo.addColorStop(0.55, '#101829');
    fundo.addColorStop(1, '#0b1220');
    c.fillStyle = fundo;
    c.fill();
    c.save();
    c.clip();

    // Grelha de pontos nos cruzamentos: dá escala sem sujar o campo de jogo.
    c.fillStyle = 'rgba(160, 200, 255, 0.17)';
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
    ctx.fillStyle = '#05070e';
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

  private serpente(jogo: Jogo, t: number, cel: number, tempo: number, matiz: number): void {
    const ctx = this.ctx;
    const corpo = jogo.corpo;
    const anterior = jogo.anterior;
    const restam =
      this.desfazer >= 0 ? corpo.length - Math.floor(this.desfazer * corpo.length) : corpo.length;
    if (restam <= 0) return;

    const pontos: { x: number; y: number }[] = [];
    for (let i = 0; i < restam; i++) {
      const p = corpo[i];
      const a = anterior[i] ?? p;
      pontos.push({ x: (lerp(a.x, p.x, t) + 0.5) * cel, y: (lerp(a.y, p.y, t) + 0.5) * cel });
    }
    const n = pontos.length;
    if (n === 0) return;

    // O corpo afina da cabeça para a cauda, em bandas que se sobrepõem.
    const larguraCabeca = cel * 0.78;
    const larguraCauda = lerp(larguraCabeca, cel * 0.4, Math.min(1, restam / 8));
    const bandas = limitar(Math.ceil(n / 2), 1, 9);

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // As mesmas bandas servem as três passagens: halo, contorno e cor.
    const faixa = (k: number) => {
      const i0 = Math.floor((k * (n - 1)) / bandas);
      const i1 = Math.ceil(((k + 1) * (n - 1)) / bandas);
      const f = (i0 + i1) / 2 / Math.max(1, n - 1);
      return { i0, i1, f, largura: lerp(larguraCabeca, larguraCauda, f) };
    };

    // Halo de movimento: abre à medida que a velocidade sobe.
    const auréola = cel * (0.3 + this.intensidade * 0.3);
    ctx.strokeStyle = `hsla(${matiz}, 90%, 62%, ${0.1 + this.intensidade * 0.12})`;
    for (let k = 0; k < bandas; k++) {
      const b = faixa(k);
      ctx.lineWidth = b.largura + auréola;
      this.traco(pontos, b.i0, b.i1);
    }

    // Contorno escuro: é o que separa o corpo do chão a qualquer velocidade.
    const contorno = Math.max(2, cel * 0.1);
    ctx.strokeStyle = 'rgba(3, 14, 12, 0.85)';
    for (let k = 0; k < bandas; k++) {
      const b = faixa(k);
      ctx.lineWidth = b.largura + contorno;
      this.traco(pontos, b.i0, b.i1);
    }

    for (let k = 0; k < bandas; k++) {
      const b = faixa(k);
      ctx.lineWidth = b.largura;
      ctx.strokeStyle = `hsl(${matiz + b.f * 8}, ${lerp(78, 64, b.f)}%, ${lerp(56, 33, b.f)}%)`;
      this.traco(pontos, b.i0, b.i1);
    }

    // Escamas: traços curtos perpendiculares, todos num só caminho.
    if (n > 2) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
      ctx.lineWidth = Math.max(1, cel * 0.07);
      ctx.beginPath();
      for (let i = 1; i < n - 1; i += 2) {
        const f = i / (n - 1);
        const dx = pontos[i + 1].x - pontos[i - 1].x;
        const dy = pontos[i + 1].y - pontos[i - 1].y;
        const d = Math.hypot(dx, dy) || 1;
        const meia = lerp(larguraCabeca, larguraCauda, f) * 0.34;
        ctx.moveTo(pontos[i].x - (dy / d) * meia, pontos[i].y + (dx / d) * meia);
        ctx.lineTo(pontos[i].x + (dy / d) * meia, pontos[i].y - (dx / d) * meia);
      }
      ctx.stroke();
    }

    // Brilho de cima, que dá volume ao tubo.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = cel * 0.16;
    ctx.save();
    ctx.translate(0, -cel * 0.14);
    this.traco(pontos, 0, Math.max(0, n - 2));
    ctx.restore();
    ctx.restore();

    this.cabeca(pontos[0], jogo, cel, tempo, matiz);
  }

  private traco(pontos: { x: number; y: number }[], i0: number, i1: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(pontos[i0].x, pontos[i0].y);
    for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(pontos[i].x, pontos[i].y);
    if (i1 <= i0) ctx.lineTo(pontos[i0].x + 0.01, pontos[i0].y);
    ctx.stroke();
  }

  private cabeca(
    p: { x: number; y: number },
    jogo: Jogo,
    cel: number,
    tempo: number,
    matiz: number,
  ): void {
    const ctx = this.ctx;
    const v = vetor(jogo.direcao);
    const escala = 1 + this.incho * 0.2;
    const l = cel * 1.14 * escala;
    const vivo = jogo.estado !== 'morto';

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(v.y, v.x));

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
    ctx.fillStyle = 'rgba(2, 20, 16, 0.9)';
    ctx.fill();

    const m = l - Math.max(2, cel * 0.13);
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
