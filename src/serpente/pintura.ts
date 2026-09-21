/** Desenho da arena, da serpente e dos efeitos, em Canvas 2D. */

import { PASSO_INICIAL, PASSO_MINIMO, vetor, type Jogo, type Ponto, type TipoComida, type TipoItem } from './logica';

/** A cor só aquece a sério na parte final da curva de velocidade. */
const CURVA_MATIZ = 1.8;

const COR_COMIDA = '#f8bd91';
const COR_COMIDA_BORDA = '#ed956d';
const COR_MORTE = '#ff6b7a';
const CORES_COMIDA: Record<TipoComida, [string, string]> = {
  normal: [COR_COMIDA, COR_COMIDA_BORDA],
  ouro: ['#ffe79a', '#ffb52e'],
  leve: ['#9ef4ff', '#41b8e8'],
  gigante: ['#e3a7ff', '#a95ee8'],
};
const CORES_ITEM: Record<TipoItem, [string, string, string]> = {
  vida: ['#ff7f9c', '#ff386e', '+'], escudo: ['#86c9ff', '#328de8', '◆'],
  ima: ['#ff8cdd', '#d83caa', 'U'], lento: ['#9ff3ff', '#36b8cf', '◷'],
  dobro: ['#ffe685', '#efa928', '×2'], veneno: ['#b68cff', '#7136c9', '!'],
  inversao: ['#ff9f78', '#e75038', '↺'],
};

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
  matiz = 83;
  /** Cores escolhidas no menu; a cobra varia só ligeiramente com a velocidade. */
  private matizBase = 83;
  private matizArena = 83;
  private pele: 'aurora' | 'pulso' | 'prisma' | 'brasa' = 'aurora';
  private rastoActivo = true;
  private relogioRasto = 0;
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
  /** Combo já apresentado e energia do impacto visual do multiplicador. */
  private comboVisto = 0;
  private comboImpacto = 0;
  /** Progresso 0–1 da desintegração do corpo depois da morte. */
  private desfazer = -1;
  private desfeitos = 0;

  constructor(private readonly tela: HTMLCanvasElement) {
    const ctx = tela.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D indisponível');
    this.ctx = ctx;
  }

  definirCores(cobra: number, tema: number): void {
    this.matizBase = cobra;
    this.matizArena = tema;
    this.matiz = cobra;
    this.chao = null;
  }

  definirPele(pele: 'aurora' | 'pulso' | 'prisma' | 'brasa', rasto = true): void {
    this.pele = pele;
    this.rastoActivo = rasto;
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
      texto: `+${pontos}`,
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
    this.comboVisto = 0;
    this.comboImpacto = 0;
    this.relogioRasto = 0;
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
    const animacao = this.pele === 'prisma' ? (tempo / 45) % 360
      : this.pele === 'pulso' ? Math.sin(tempo / 180) * 9
      : this.pele === 'brasa' ? 12 + Math.sin(tempo / 260) * 5
      : 0;
    const matiz = (this.pele === 'prisma' ? animacao : this.matizBase + animacao)
      + 10 * Math.pow(this.intensidade, CURVA_MATIZ);
    this.matiz = matiz;

    if (jogo.combo !== this.comboVisto) {
      if (jogo.combo >= 2 && jogo.combo > this.comboVisto) this.comboImpacto = 1;
      this.comboVisto = jogo.combo;
    }

    this.avancarEfeitos(s, jogo, cel);

    ctx.save();
    if (this.tremor > 0.002) {
      const f = this.tremor * cel * 0.55;
      ctx.translate((Math.random() - 0.5) * f, (Math.random() - 0.5) * f);
    }

    this.arena(L, cel, jogo.lado, this.matizArena);
    if (jogo.modo === 'mini') this.arenaMini(L, cel, this.matizArena);
    if (jogo.modo === 'portais') this.portaisMoveis(L, cel, jogo.portalOffset, matiz, tempo);
    this.contagem(L, tempo, jogo.estado);
    // A contagem fica por trás de tudo: é pano de fundo, a serpente é o assunto.
    this.arrancada(L, matiz);
    this.comboFundo(L, jogo.combo, tempo, matiz);
    this.orientadorComida(jogo, cel, matiz);
    this.comida(jogo.comida, cel, tempo, jogo.estado);
    if (jogo.item) this.itemArena(jogo.item, cel, tempo);
    if (jogo.modo === 'dupla') {
      ctx.save();
      ctx.translate(L, L);
      ctx.scale(-1, -1);
      this.comida(jogo.comida, cel, tempo, jogo.estado);
      if (jogo.item) this.itemArena(jogo.item, cel, tempo);
      ctx.restore();
    }
    this.obstaculos(jogo, cel, tempo);
    const saltaX = jogo.atravessaParedes() && jogo.corpo.some((p, i) => i > 0 && Math.abs(p.x - jogo.corpo[i - 1].x) > jogo.lado / 2);
    const saltaY = jogo.atravessaParedes() && jogo.corpo.some((p, i) => i > 0 && Math.abs(p.y - jogo.corpo[i - 1].y) > jogo.lado / 2);
    const deslocamentosX = saltaX ? [-L, 0, L] : [0];
    const deslocamentosY = saltaY ? [-L, 0, L] : [0];
    for (const dx of deslocamentosX) {
      for (const dy of deslocamentosY) {
        ctx.save();
        ctx.translate(dx, dy);
        this.serpente(jogo, t, cel, tempo, matiz);
        ctx.restore();
      }
    }
    if (jogo.modo === 'dupla') {
      ctx.save();
      ctx.translate(L, L);
      ctx.scale(-1, -1);
      this.serpente(jogo, t, cel, tempo, (matiz + 165) % 360);
      ctx.restore();
    }
    this.efeitos(cel, jogo.lado);
    if (jogo.arenaEscura() && jogo.estado !== 'pronto') this.escuridao(jogo, cel);

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
    this.comboImpacto = Math.max(0, this.comboImpacto - s * 2.35);

    this.relogioRasto += s;
    if (this.rastoActivo && jogo.estado === 'a-jogar' && this.relogioRasto >= 0.055 && jogo.corpo.length > 1) {
      this.relogioRasto = 0;
      const cauda = jogo.corpo[jogo.corpo.length - 1];
      this.particulas.push({
        x: cauda.x + 0.5,
        y: cauda.y + 0.5,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        vida: 0.34,
        total: 0.34,
        raio: 0.045 + this.intensidade * 0.035,
        cor: `hsl(${this.matiz}, 85%, 67%)`,
      });
    }

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
  private prepararChao(L: number, cel: number, lado: number, matiz: number): HTMLCanvasElement {
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const buffer = document.createElement('canvas');
    buffer.width = Math.round(L * dpr);
    buffer.height = Math.round(L * dpr);
    const c = buffer.getContext('2d');
    if (!c) return buffer;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    caminhoRedondo(c, 0, 0, L, L, this.raio);
    const fundo = c.createLinearGradient(0, 0, L * 0.72, L);
    fundo.addColorStop(0, `hsl(${matiz}, 30%, 14%)`);
    fundo.addColorStop(0.46, `hsl(${matiz}, 27%, 9%)`);
    fundo.addColorStop(1, `hsl(${matiz}, 30%, 5.5%)`);
    c.fillStyle = fundo;
    c.fill();
    c.save();
    c.clip();

    // Luz ambiental em duas profundidades: mantém o centro legível e evita um
    // chão plano mesmo quando o ambiente escolhido é muito escuro.
    const aura = c.createRadialGradient(L * 0.38, L * 0.31, 0, L * 0.38, L * 0.31, L * 0.7);
    aura.addColorStop(0, `hsla(${matiz}, 72%, 52%, .075)`);
    aura.addColorStop(0.5, `hsla(${matiz}, 55%, 36%, .025)`);
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    c.fillStyle = aura;
    c.fillRect(0, 0, L, L);

    // Cada célula tem uma placa quase imperceptível. O padrão alternado dá
    // matéria ao chão sem competir com a serpente nem criar ruído em movimento.
    for (let y = 0; y < lado; y++) {
      for (let x = 0; x < lado; x++) {
        if ((x + y) % 2 !== 0) continue;
        c.fillStyle = `hsla(${matiz}, 55%, 66%, ${(x + y) % 4 === 0 ? 0.009 : 0.005})`;
        c.fillRect(x * cel + 1, y * cel + 1, cel - 2, cel - 2);
      }
    }

    // Linhas de célula e linhas estruturais a cada cinco casas. A dupla linha
    // faz o grid parecer gravado no material, em vez de desenhado por cima.
    for (let i = 1; i < lado; i++) {
      const principal = i % 5 === 0;
      c.beginPath();
      c.moveTo(i * cel, 0); c.lineTo(i * cel, L);
      c.moveTo(0, i * cel); c.lineTo(L, i * cel);
      c.strokeStyle = `hsla(${matiz}, ${principal ? 70 : 48}%, ${principal ? 70 : 62}%, ${principal ? .105 : .038})`;
      c.lineWidth = principal ? 1.15 : 0.75;
      c.stroke();
      if (principal) {
        c.translate(1, 1);
        c.strokeStyle = 'rgba(0, 0, 0, .16)';
        c.stroke();
        c.translate(-1, -1);
      }
    }

    // Nós do grid: os maiores marcam sectores e ajudam a antecipar trajectórias.
    for (let y = 1; y < lado; y++) {
      for (let x = 1; x < lado; x++) {
        const principal = x % 5 === 0 && y % 5 === 0;
        const r = principal ? Math.max(1.05, cel * 0.065) : Math.max(0.55, cel * 0.032);
        c.fillStyle = `hsla(${matiz}, 70%, 74%, ${principal ? .3 : .13})`;
        c.beginPath();
        c.arc(x * cel, y * cel, r, 0, Math.PI * 2);
        c.fill();
      }
    }

    // Mira central técnica, suficientemente subtil para nunca parecer um alvo.
    c.strokeStyle = `hsla(${matiz}, 75%, 72%, .075)`;
    c.lineWidth = 1;
    c.setLineDash([cel * 0.22, cel * 0.3]);
    c.beginPath();
    c.arc(L / 2, L / 2, cel * 2.5, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);

    // Grão determinístico: não tremeluz entre frames e quebra superfícies lisas.
    for (let i = 0; i < 150; i++) {
      const x = ((Math.sin(i * 91.17) + 1) * 0.5) * L;
      const y = ((Math.sin(i * 47.73 + 2.4) + 1) * 0.5) * L;
      c.fillStyle = i % 3 === 0 ? `hsla(${matiz}, 70%, 78%, .035)` : 'rgba(255, 255, 255, .018)';
      c.fillRect(x, y, 0.65, 0.65);
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
      this.chao = this.prepararChao(L, cel, lado, matiz);
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

  private arenaMini(L: number, cel: number, matiz: number): void {
    const ctx = this.ctx;
    const margem = cel * 4;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, .7)';
    ctx.fillRect(0, 0, L, margem);
    ctx.fillRect(0, L - margem, L, margem);
    ctx.fillRect(0, margem, margem, L - margem * 2);
    ctx.fillRect(L - margem, margem, margem, L - margem * 2);
    ctx.strokeStyle = `hsla(${matiz}, 88%, 72%, .55)`;
    ctx.lineWidth = 2;
    ctx.shadowColor = `hsl(${matiz}, 90%, 65%)`;
    ctx.shadowBlur = cel * .45;
    ctx.strokeRect(margem, margem, L - margem * 2, L - margem * 2);
    ctx.restore();
  }

  private portaisMoveis(L: number, cel: number, offset: number, matiz: number, tempo: number): void {
    const ctx = this.ctx;
    const p = ((offset + tempo / 1800) % 21) * cel;
    const pulso = .55 + Math.sin(tempo / 170) * .2;
    ctx.save();
    ctx.strokeStyle = `hsla(${matiz}, 95%, 76%, ${pulso})`;
    ctx.lineWidth = Math.max(2, cel * .14);
    ctx.shadowColor = `hsl(${matiz}, 95%, 65%)`;
    ctx.shadowBlur = cel * .7;
    for (const [x, y, vertical] of [[2, p, true], [L - 2, L - p, true], [p, 2, false], [L - p, L - 2, false]] as const) {
      ctx.beginPath();
      if (vertical) ctx.moveTo(x, y - cel * .65), ctx.lineTo(x, y + cel * .65);
      else ctx.moveTo(x - cel * .65, y), ctx.lineTo(x + cel * .65, y);
      ctx.stroke();
    }
    ctx.restore();
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
   * Multiplicador integrado no chão da arena. É desenhado antes de comida,
   * obstáculos e serpente para estes passarem sempre por cima. Quando aumenta,
   * só esta camada recebe escala e tremor; a arena e os controlos ficam imóveis.
   */
  private comboFundo(L: number, combo: number, tempo: number, matiz: number): void {
    if (combo < 2) return;
    const ctx = this.ctx;
    const impacto = this.comboImpacto;
    const entrada = 1 - impacto;
    const onda = Math.sin(entrada * Math.PI);
    const tremeX = Math.sin(tempo * .19) * L * .011 * impacto;
    const tremeY = Math.cos(tempo * .27) * L * .007 * impacto;
    const escala = 1 + onda * .14 + impacto * .025;
    const respirar = 1 + Math.sin(tempo / 420) * .012;

    ctx.save();
    ctx.translate(L / 2 + tremeX, L / 2 + tremeY);
    ctx.scale(escala * respirar, escala * respirar);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = `hsla(${matiz}, 88%, 72%, ${.035 + impacto * .12})`;
    ctx.lineWidth = Math.max(1, L * .003);
    ctx.setLineDash([L * .018, L * .022]);
    ctx.beginPath();
    ctx.arc(0, 0, L * (.17 + onda * .025), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = `700 ${L * .052}px ${LETRA}`;
    ctx.fillStyle = `hsla(${matiz}, 90%, 80%, ${.07 + impacto * .12})`;
    ctx.fillText('COMBO', 0, -L * .082);

    ctx.font = `650 ${L * .21}px ${LETRA}`;
    ctx.lineWidth = Math.max(1.2, L * .004);
    ctx.strokeStyle = `hsla(${matiz}, 85%, 74%, ${.045 + impacto * .1})`;
    ctx.fillStyle = `hsla(${matiz}, 92%, 82%, ${.045 + impacto * .105})`;
    ctx.shadowColor = `hsla(${matiz}, 95%, 66%, ${impacto * .35})`;
    ctx.shadowBlur = L * .055 * impacto;
    ctx.strokeText(`×${combo}`, 0, L * .035);
    ctx.fillText(`×${combo}`, 0, L * .035);
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

  private orientadorComida(jogo: Jogo, cel: number, matiz: number): void {
    const a = jogo.corpo[0];
    const dx = jogo.comida.x - a.x;
    const dy = jogo.comida.y - a.y;
    if (Math.abs(dx) + Math.abs(dy) < 7) return;
    const ctx = this.ctx;
    const x = (a.x + .5) * cel;
    const y = (a.y + .5) * cel;
    const angulo = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(x + Math.cos(angulo) * cel * 1.25, y + Math.sin(angulo) * cel * 1.25);
    ctx.rotate(angulo);
    ctx.fillStyle = `hsla(${matiz}, 92%, 78%, .25)`;
    ctx.beginPath();
    ctx.moveTo(cel * .25, 0);
    ctx.lineTo(-cel * .18, -cel * .14);
    ctx.lineTo(-cel * .12, 0);
    ctx.lineTo(-cel * .18, cel * .14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private itemArena(item: Ponto & { tipo: TipoItem }, cel: number, tempo: number): void {
    const ctx = this.ctx;
    const [cor, borda, simbolo] = CORES_ITEM[item.tipo];
    const x = (item.x + .5) * cel;
    const y = (item.y + .5) * cel;
    const pulso = .5 + Math.sin(tempo / 180) * .5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(tempo / 600) * .12);
    ctx.shadowColor = borda;
    ctx.shadowBlur = cel * (.55 + pulso * .35);
    caminhoRedondo(ctx, -cel * .33, -cel * .33, cel * .66, cel * .66, cel * .18);
    const g = ctx.createLinearGradient(-cel * .3, -cel * .3, cel * .3, cel * .3);
    g.addColorStop(0, cor);
    g.addColorStop(1, borda);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.65)';
    ctx.lineWidth = Math.max(1, cel * .04);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${cel * (simbolo.length > 1 ? .28 : .38)}px ${LETRA}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(simbolo, 0, cel * .015);
    ctx.restore();
  }

  private comida(c: Ponto & { tipo?: TipoComida }, cel: number, tempo: number, estado: string): void {
    if (estado === 'completo') return;
    const ctx = this.ctx;
    const cx = (c.x + 0.5) * cel;
    const cy = (c.y + 0.5) * cel;
    const pulso = 0.5 + 0.5 * Math.sin(tempo / 230);
    const tipo = c.tipo ?? 'normal';
    const [cor, borda] = CORES_COMIDA[tipo];
    const raio = cel * ((tipo === 'gigante' ? 0.38 : tipo === 'leve' ? 0.265 : 0.31) + 0.025 * pulso);

    ctx.save();
    ctx.translate(cx, cy);

    // Aura volumétrica no chão e sombra de contacto.
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, cel * 1.15);
    halo.addColorStop(0, borda);
    halo.addColorStop(0.22, `${borda}3d`);
    halo.addColorStop(1, `${borda}00`);
    ctx.globalAlpha = 0.24 + pulso * 0.12;
    ctx.fillStyle = halo;
    ctx.fillRect(-cel * 1.2, -cel * 1.2, cel * 2.4, cel * 2.4);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, cel * 0.31, raio * 0.9, raio * 0.27, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rosa energética de oito pontas e órbita dupla. Cada raridade muda a
    // velocidade e o número de satélites, por isso reconhece-se sem texto.
    const rotacao = tempo / (tipo === 'leve' ? 720 : tipo === 'ouro' ? 1150 : 1550);
    ctx.save();
    ctx.rotate(rotacao);
    ctx.fillStyle = borda;
    ctx.globalAlpha = 0.22 + 0.24 * pulso;
    const ponta = cel * ((tipo === 'gigante' ? 0.69 : 0.55) + 0.045 * pulso);
    const cintura = cel * 0.045;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i;
      const b = a + Math.PI / 8;
      ctx.lineTo(Math.cos(a) * ponta, Math.sin(a) * ponta);
      ctx.lineTo(Math.cos(b) * cintura, Math.sin(b) * cintura);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = borda;
    ctx.globalAlpha = 0.34 + 0.2 * pulso;
    ctx.lineWidth = Math.max(1, cel * 0.045);
    ctx.beginPath();
    ctx.ellipse(0, 0, cel * (0.48 + .025 * pulso), cel * (0.25 + .02 * pulso), -rotacao * .7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha *= .65;
    ctx.beginPath();
    ctx.ellipse(0, 0, cel * (0.3 + .02 * pulso), cel * (0.52 + .03 * pulso), rotacao * .55, 0, Math.PI * 2);
    ctx.stroke();

    const satelites = tipo === 'gigante' ? 3 : tipo === 'ouro' ? 2 : 1;
    ctx.globalAlpha = 1;
    for (let i = 0; i < satelites; i++) {
      const a = rotacao * (i % 2 === 0 ? 1 : -1) + (Math.PI * 2 * i) / satelites;
      const d = cel * (0.45 + (i % 2) * .08);
      ctx.shadowColor = borda;
      ctx.shadowBlur = cel * .28;
      ctx.fillStyle = i === 0 ? '#fff8e9' : cor;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d * .62, cel * (i === 0 ? .055 : .04), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Núcleo facetado com uma coroa exterior translúcida.
    ctx.shadowColor = borda;
    ctx.shadowBlur = cel * 0.95;
    ctx.fillStyle = `${borda}55`;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + i * Math.PI / 4;
      const r = raio * 1.18;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    const g = ctx.createRadialGradient(-raio * 0.32, -raio * 0.38, raio * 0.08, 0, 0, raio);
    g.addColorStop(0, '#fffaf0');
    g.addColorStop(0.34, cor);
    g.addColorStop(0.76, borda);
    g.addColorStop(1, borda);
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const r = raio * (i % 2 === 0 ? 1 : .9);
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = Math.max(.75, cel * .035);
    ctx.beginPath();
    ctx.moveTo(-raio * .34, -raio * .18);
    ctx.lineTo(-raio * .05, -raio * .48);
    ctx.lineTo(raio * .28, -raio * .24);
    ctx.stroke();
    ctx.restore();
  }

  private obstaculos(jogo: Jogo, cel: number, tempo: number): void {
    if (jogo.obstaculos.length === 0) return;
    const ctx = this.ctx;
    const pulso = 0.5 + Math.sin(tempo / 430) * 0.5;
    for (const p of jogo.obstaculos) {
      const margem = cel * 0.14;
      const x = p.x * cel + margem;
      const y = p.y * cel + margem;
      const lado = cel - margem * 2;
      ctx.save();
      ctx.shadowColor = `hsla(${this.matizArena}, 80%, 62%, ${0.15 + pulso * 0.12})`;
      ctx.shadowBlur = cel * 0.35;
      caminhoRedondo(ctx, x, y, lado, lado, cel * 0.2);
      const g = ctx.createLinearGradient(x, y, x + lado, y + lado);
      g.addColorStop(0, `hsl(${this.matizArena}, 24%, 31%)`);
      g.addColorStop(1, `hsl(${this.matizArena}, 25%, 15%)`);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = `hsla(${this.matizArena}, 75%, 72%, .42)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  private escuridao(jogo: Jogo, cel: number): void {
    const ctx = this.ctx;
    const p = jogo.corpo[0];
    const x = (p.x + 0.5) * cel;
    const y = (p.y + 0.5) * cel;
    const raio = cel * 4.1;
    const mascara = ctx.createRadialGradient(x, y, cel * 1.2, x, y, raio);
    mascara.addColorStop(0, 'rgba(2, 4, 3, 0)');
    mascara.addColorStop(0.56, 'rgba(2, 4, 3, .22)');
    mascara.addColorStop(1, 'rgba(2, 4, 3, .94)');
    ctx.fillStyle = mascara;
    ctx.fillRect(0, 0, this.ladoCss, this.ladoCss);
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
    const base =
      solta && (solta.x !== derradeira.x || solta.y !== derradeira.y)
        ? [...corpo, solta]
        : corpo;
    const caminho = jogo.atravessaParedes() ? base.reduce<Ponto[]>((pontos, actual, i) => {
      if (i === 0) { pontos.push({ ...actual }); return pontos; }
      const anteriorReal = base[i - 1];
      const anteriorLivre = pontos[i - 1];
      let dx = actual.x - anteriorReal.x;
      let dy = actual.y - anteriorReal.y;
      if (dx > jogo.lado / 2) dx -= jogo.lado;
      if (dx < -jogo.lado / 2) dx += jogo.lado;
      if (dy > jogo.lado / 2) dy -= jogo.lado;
      if (dy < -jogo.lado / 2) dy += jogo.lado;
      pontos.push({ x: anteriorLivre.x + dx, y: anteriorLivre.y + dy });
      return pontos;
    }, []) : base;
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

    // Silhueta orgânica: ombros largos, afunilamento progressivo e uma ponta de
    // cauda realmente fina. As bandas sobrepõem-se para manter curvas contínuas.
    const larguraCabeca = cel * 0.8;
    const larguraCauda = lerp(larguraCabeca * .9, cel * 0.24, Math.min(1, comprimento / 6));
    const bandas = limitar(Math.ceil(total / 3), 2, 20);

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const faixa = (k: number) => {
      const i0 = Math.floor((k * (total - 1)) / bandas);
      const i1 = Math.ceil(((k + 1) * (total - 1)) / bandas);
      const f = (i0 + i1) / 2 / Math.max(1, total - 1);
      return { i0, i1, f, largura: lerp(larguraCabeca, larguraCauda, f) };
    };

    // Sombra no chão e aura cinética. A sombra deslocada ancora a cobra; a aura
    // cresce apenas com a velocidade para conservar contraste em repouso.
    ctx.save();
    ctx.translate(0, cel * .12);
    ctx.strokeStyle = 'rgba(0, 0, 0, .42)';
    ctx.lineWidth = larguraCabeca + cel * .2;
    this.traco(pontos, 0, total - 1);
    ctx.restore();
    ctx.strokeStyle = `hsla(${matiz}, 94%, 64%, ${0.09 + this.intensidade * 0.13})`;
    ctx.lineWidth = larguraCabeca + cel * (0.3 + this.intensidade * 0.32);
    ctx.shadowColor = `hsla(${matiz}, 90%, 62%, .28)`;
    ctx.shadowBlur = cel * (.25 + this.intensidade * .35);
    this.traco(pontos, 0, total - 1);
    ctx.shadowBlur = 0;

    // Contorno duplo: recorte escuro e um rebordo colorido muito fino.
    const contorno = Math.max(2.4, cel * 0.115);
    ctx.strokeStyle = `hsla(${matiz + 8}, 45%, 4%, .94)`;
    for (let k = 0; k < bandas; k++) {
      const b = faixa(k);
      ctx.lineWidth = b.largura + contorno;
      this.traco(pontos, b.i0, b.i1);
    }

    for (let k = 0; k < bandas; k++) {
      const b = faixa(k);
      ctx.lineWidth = b.largura;
      const brilhoPele = this.pele === 'brasa' ? 4 : this.pele === 'pulso' ? 7 * Math.sin(tempo / 180 - b.f * 9) : 0;
      ctx.strokeStyle = `hsl(${matiz + b.f * 10}, ${lerp(86, 67, b.f)}%, ${lerp(58 + brilhoPele, 31 + brilhoPele * .4, b.f)}%)`;
      this.traco(pontos, b.i0, b.i1);
    }

    // Fita dorsal que segue a normal de cada curva. Ao contrário de deslocar o
    // desenho para cima, o brilho mantém-se no mesmo lado do corpo ao virar.
    const dorsal: { x: number; y: number }[] = [];
    for (let i = 0; i < total; i++) {
      const a = pontos[Math.max(0, i - 1)];
      const b = pontos[Math.min(total - 1, i + 1)];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const f = i / Math.max(1, total - 1);
      const desloca = lerp(larguraCabeca, larguraCauda, f) * -.18;
      dorsal.push({ x: pontos[i].x - (dy / d) * desloca, y: pontos[i].y + (dx / d) * desloca });
    }
    const dorsalGrad = ctx.createLinearGradient(pontos[0].x, pontos[0].y, pontos[total - 1].x, pontos[total - 1].y);
    dorsalGrad.addColorStop(0, 'rgba(255,255,255,.3)');
    dorsalGrad.addColorStop(.35, 'rgba(255,255,255,.15)');
    dorsalGrad.addColorStop(1, 'rgba(255,255,255,.025)');
    ctx.strokeStyle = dorsalGrad;
    ctx.lineWidth = Math.max(1.1, cel * .095);
    this.traco(dorsal, 0, Math.max(0, total - 2));

    // Escamas individuais alternadas. São pequenos losangos orientados pela
    // tangente e desaparecem gradualmente na ponta da cauda.
    const salto = Math.max(2, Math.round(.68 / espacamento));
    for (let i = salto; i < total - salto; i += salto) {
      const f = i / Math.max(1, total - 1);
      const a = pontos[i - 1];
      const b = pontos[i + 1];
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const ladoEscama = i % (salto * 2) === 0 ? -1 : 1;
      const largura = lerp(larguraCabeca, larguraCauda, f);
      ctx.save();
      ctx.translate(pontos[i].x + Math.cos(ang + Math.PI / 2) * largura * .16 * ladoEscama, pontos[i].y + Math.sin(ang + Math.PI / 2) * largura * .16 * ladoEscama);
      ctx.rotate(ang + Math.PI / 4);
      ctx.fillStyle = this.pele === 'prisma'
        ? `hsla(${matiz + f * 150}, 95%, 78%, ${.2 * (1 - f)})`
        : `rgba(255,255,255,${.13 * (1 - f * .7)})`;
      const e = Math.max(.8, cel * .07 * (1 - f * .35));
      ctx.fillRect(-e, -e, e * 2, e * 2);
      ctx.restore();
    }

    // Ponta de cauda luminosa: fecha a silhueta e torna clara a direcção do
    // movimento mesmo quando o corpo ocupa várias curvas.
    const ponta = pontos[total - 1];
    ctx.fillStyle = `hsla(${matiz + 10}, 80%, 62%, .72)`;
    ctx.shadowColor = `hsl(${matiz}, 90%, 62%)`;
    ctx.shadowBlur = cel * .35;
    ctx.beginPath();
    ctx.arc(ponta.x, ponta.y, Math.max(1.2, larguraCauda * .28), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
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

    const formaCabeca = (escalaForma: number): void => {
      const s = l * escalaForma;
      ctx.beginPath();
      ctx.moveTo(-s * .5, -s * .3);
      ctx.bezierCurveTo(-s * .15, -s * .49, s * .34, -s * .44, s * .56, -s * .2);
      ctx.bezierCurveTo(s * .67, -s * .08, s * .67, s * .08, s * .56, s * .2);
      ctx.bezierCurveTo(s * .34, s * .44, -s * .15, s * .49, -s * .5, s * .3);
      ctx.bezierCurveTo(-s * .58, s * .16, -s * .58, -s * .16, -s * .5, -s * .3);
      ctx.closePath();
    };

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

    // Sombra e rebordo com silhueta de cabeça, mais larga na face e ligada ao
    // pescoço atrás. Esta forma mantém a direcção legível em qualquer curva.
    ctx.save();
    ctx.translate(0, cel * .1);
    formaCabeca(1.08);
    ctx.fillStyle = 'rgba(0, 0, 0, .42)';
    ctx.fill();
    ctx.restore();
    formaCabeca(1.07);
    ctx.fillStyle = `hsl(${matiz + 7}, 52%, 5%)`;
    ctx.fill();

    formaCabeca(.94);
    const brilho = ctx.createLinearGradient(-l * .25, -l * .4, l * .28, l * .42);
    brilho.addColorStop(0, '#ffffff');
    brilho.addColorStop(0.3, `hsl(${matiz}, 96%, 88%)`);
    brilho.addColorStop(0.68, `hsl(${matiz + 4}, 88%, 72%)`);
    brilho.addColorStop(1, `hsl(${matiz + 9}, 76%, 55%)`);
    ctx.fillStyle = brilho;
    ctx.fill();

    // Placa frontal e veio dorsal: pequenos volumes que evitam o aspecto de
    // quadrado liso sem comprometer a expressão da cara.
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = Math.max(.8, cel * .035);
    ctx.beginPath();
    ctx.moveTo(-l * .36, -l * .18);
    ctx.bezierCurveTo(-l * .12, -l * .34, l * .18, -l * .3, l * .38, -l * .16);
    ctx.stroke();
    ctx.fillStyle = `hsla(${matiz}, 80%, 44%, .15)`;
    ctx.beginPath();
    ctx.moveTo(-l * .38, 0);
    ctx.lineTo(-l * .12, -l * .11);
    ctx.lineTo(l * .05, 0);
    ctx.lineTo(-l * .12, l * .11);
    ctx.closePath();
    ctx.fill();

    // Olhos: já rodados com a cabeça, ficam sempre virados para a frente.
    const dOlho = cel * 0.205;
    const frente = cel * 0.195;
    const raioOlho = cel * 0.132;
    const piscar = vivo && Math.sin(tempo / 1400) > 0.985 ? 0.2 : 1;
    // Sombra das órbitas e esclera clara, para os olhos terem profundidade.
    ctx.fillStyle = `hsla(${matiz + 12}, 55%, 18%, .32)`;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(frente - cel * .015, dOlho * s + cel * .015, raioOlho * 1.2, raioOlho * 1.16 * piscar, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f8fff6';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(frente, dOlho * s, raioOlho, raioOlho * piscar, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#071511';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(frente + raioOlho * .22, dOlho * s, raioOlho * .48, raioOlho * .7 * piscar, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (vivo && piscar > 0.5) {
      ctx.fillStyle = '#ffffff';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(frente + raioOlho * 0.36, dOlho * s - raioOlho * 0.2, raioOlho * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Narinas discretas e língua rara: vida suficiente sem distrair durante
    // mudanças rápidas de direcção.
    ctx.fillStyle = `hsla(${matiz + 10}, 45%, 16%, .62)`;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(l * .49, s * l * .085, Math.max(.65, cel * .026), 0, Math.PI * 2);
      ctx.fill();
    }
    const lingua = vivo ? Math.max(0, Math.sin(tempo / 260) - .83) / .17 : 0;
    if (lingua > 0) {
      const alcance = l * (.18 + lingua * .18);
      ctx.strokeStyle = '#ff6d98';
      ctx.lineWidth = Math.max(1, cel * .045);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(l * .55, 0);
      ctx.lineTo(l * .55 + alcance, 0);
      ctx.moveTo(l * .55 + alcance, 0);
      ctx.lineTo(l * .55 + alcance + cel * .1, -cel * .075);
      ctx.moveTo(l * .55 + alcance, 0);
      ctx.lineTo(l * .55 + alcance + cel * .1, cel * .075);
      ctx.stroke();
    }

    if (!vivo) {
      // Cruz nos olhos: leitura imediata de que a partida acabou.
      ctx.strokeStyle = '#071511';
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
