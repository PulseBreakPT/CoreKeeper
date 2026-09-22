/**
 * Catálogo do Nexus Arcade.
 *
 * Cada jogo traz consigo três coisas: uma cor secundária que lhe dá
 * personalidade dentro do preto e dourado da marca, a forma de ler o seu
 * recorde, e uma capa animada — uma cena pequena, desenhada em Canvas, que
 * mostra o jogo a mexer-se dentro do cartão em vez de um ícone parado.
 */

export type JogoId = 'serpente' | 'maze' | 'minas' | '2048' | 'tetris' | 'prisma';

export interface FichaCatalogo {
  id: JogoId;
  nome: string;
  /** Matiz da cor secundária do jogo. */
  matiz: number;
  /** Chave de texto para a linha curta por baixo do nome. */
  legenda: string;
  /** Recordes medidos em tempo (menor é melhor) em vez de pontos. */
  tempo?: boolean;
}

export const CATALOGO: FichaCatalogo[] = [
  { id: 'serpente', nome: 'Serpente', matiz: 83, legenda: 'capaSerpente' },
  { id: 'maze', nome: 'Labirinto', matiz: 352, legenda: 'capaMaze' },
  { id: 'minas', nome: 'Campo Minado', matiz: 205, legenda: 'capaMinas', tempo: true },
  { id: '2048', nome: '2048', matiz: 38, legenda: 'capa2048' },
  { id: 'tetris', nome: 'Blocos', matiz: 272, legenda: 'capaTetris' },
  { id: 'prisma', nome: 'Prisma', matiz: 48, legenda: 'capaPrisma' },
];

export function ficha(id: JogoId): FichaCatalogo {
  return CATALOGO.find((j) => j.id === id) ?? CATALOGO[0];
}

/** Os recordes da serpente vivem separados por modo; o cartão mostra o melhor. */
const CHAVES_RECORDE: Record<JogoId, string[]> = {
  serpente: ['serpente:recorde:v1', 'serpente:recorde:relogio:v1', 'serpente:recorde:portais:v1'],
  maze: ['nexus:maze:recorde:v1'],
  minas: ['nexus:minas:recorde:v1'],
  '2048': ['nexus:2048:recorde:v1'],
  tetris: ['nexus:tetris:recorde:v1'],
  prisma: ['nexus:prisma:recorde:v1'],
};

function numero(chave: string): number {
  try {
    const n = Number(localStorage.getItem(chave));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function relogio(segundos: number): string {
  const m = Math.floor(segundos / 60);
  return `${String(m).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;
}

/** O número que o cartão mostra: já formatado e com o rótulo certo. */
export function recordeDe(id: JogoId): { bruto: number; texto: string; rotulo: 'recorde' | 'melhorTempo' } {
  const bruto = Math.max(0, ...CHAVES_RECORDE[id].map(numero));
  const tempo = ficha(id).tempo === true;
  return {
    bruto,
    texto: bruto ? (tempo ? relogio(bruto) : bruto.toLocaleString('pt-PT')) : '—',
    rotulo: tempo ? 'melhorTempo' : 'recorde',
  };
}

/* ---------------------------------------------------------------------------
 * Capas animadas
 * ------------------------------------------------------------------------ */

type Cena = (ctx: CanvasRenderingContext2D, l: number, a: number, t: number, h: number) => void;

function fundo(ctx: CanvasRenderingContext2D, l: number, a: number, h: number): void {
  const g = ctx.createRadialGradient(l * .5, a * .34, 4, l * .5, a * .6, Math.max(l, a) * .8);
  g.addColorStop(0, `hsl(${h} 42% 12%)`);
  g.addColorStop(1, '#06070a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, l, a);
}

/** A cobra percorre uma onda: lê-se em movimento mesmo num cartão pequeno. */
const cenaSerpente: Cena = (ctx, l, a, t, h) => {
  fundo(ctx, l, a, h);
  ctx.save();
  ctx.globalAlpha = .1;
  ctx.strokeStyle = `hsl(${h} 70% 60%)`;
  ctx.lineWidth = 1;
  for (let x = l * .1; x < l; x += l * .1) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, a); ctx.stroke(); }
  for (let y = a * .16; y < a; y += a * .16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(l, y); ctx.stroke(); }
  ctx.restore();

  const onda = (s: number): { x: number; y: number } => ({ x: s * l, y: a * .5 + Math.sin(s * Math.PI * 2.4) * a * .24 });
  const cabecaS = (t / 3400) % 1.4 - .2;
  const corpo = 11;

  ctx.lineCap = 'round';
  for (let i = corpo; i >= 0; i--) {
    const s = cabecaS - i * .046;
    if (s < -.05 || s > 1.05) continue;
    const p = onda(s), escala = 1 - i / (corpo * 1.9);
    ctx.fillStyle = `hsl(${h} ${74 - i * 2}% ${Math.max(28, 62 - i * 3)}%)`;
    ctx.shadowColor = `hsl(${h} 95% 60% / .5)`;
    ctx.shadowBlur = i === 0 ? 14 : 5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, a * .085 * escala, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Olhos na cabeça, virados para a frente.
  const cab = onda(cabecaS), frente = onda(cabecaS + .02);
  const dx = frente.x - cab.x, dy = frente.y - cab.y, n = Math.hypot(dx, dy) || 1;
  ctx.fillStyle = '#0a1005';
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cab.x + (dx / n) * a * .03 - (dy / n) * a * .034 * lado, cab.y + (dy / n) * a * .03 + (dx / n) * a * .034 * lado, a * .018, 0, Math.PI * 2);
    ctx.fill();
  }

  // A luz seguinte, sempre à frente da cabeça.
  const luz = onda(Math.min(1.02, cabecaS + .3)), pulso = .8 + Math.sin(t / 240) * .2;
  ctx.fillStyle = '#ffe272';
  ctx.shadowColor = '#ffcb3a';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(luz.x, luz.y, a * .045 * pulso, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
};

const MAPA_CAPA = [
  '#########',
  '#...#...#',
  '#.#...#.#',
  '#...#...#',
  '#########',
];

/** Um recorte do circuito, com as sentinelas de ronda. */
const cenaMaze: Cena = (ctx, l, a, t, h) => {
  fundo(ctx, l, a, h);
  const colunas = MAPA_CAPA[0].length, linhas = MAPA_CAPA.length;
  const cel = Math.min(l / colunas, a / linhas);
  const ox = (l - cel * colunas) / 2, oy = (a - cel * linhas) / 2;
  for (let y = 0; y < linhas; y++) for (let x = 0; x < colunas; x++) {
    const px = ox + x * cel, py = oy + y * cel;
    if (MAPA_CAPA[y][x] === '#') {
      ctx.fillStyle = `hsl(${h} 30% 11%)`;
      ctx.beginPath();
      ctx.roundRect(px + cel * .1, py + cel * .1, cel * .8, cel * .8, cel * .22);
      ctx.fill();
      ctx.strokeStyle = `hsl(${h} 88% 62% / .34)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffd84d';
      ctx.shadowColor = '#ffc928';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(px + cel / 2, py + cel / 2, cel * .08, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  const vaivem = (fase: number): number => {
    const s = ((t / 2600) + fase) % 2;
    return s < 1 ? s : 2 - s;
  };
  for (const [fase, linha, matiz] of [[0, 1, h], [.5, 3, (h + 40) % 360]] as [number, number, number][]) {
    const cx = ox + cel * (1.5 + vaivem(fase) * (colunas - 4)), cy = oy + cel * (linha + .5);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowColor = `hsl(${matiz} 92% 62% / .8)`;
    ctx.shadowBlur = 11;
    ctx.fillStyle = `hsl(${matiz} 88% 58%)`;
    ctx.beginPath();
    ctx.roundRect(-cel * .3, -cel * .3, cel * .6, cel * .6, cel * .18);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#080a0e';
    for (const lado of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cel * .12 * lado, 0, cel * .06, cel * .09, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const jx = ox + cel * (1.5 + vaivem(1.35) * (colunas - 4)), jy = oy + cel * 2.5;
  ctx.shadowColor = '#ffe07a';
  ctx.shadowBlur = 14;
  const nucleo = ctx.createRadialGradient(jx - 1, jy - 1, 1, jx, jy, cel * .32);
  nucleo.addColorStop(0, '#fff');
  nucleo.addColorStop(.5, '#ffe89c');
  nucleo.addColorStop(1, '#d99400');
  ctx.fillStyle = nucleo;
  ctx.beginPath();
  ctx.arc(jx, jy, cel * .27, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
};

/** A grelha revela-se em onda, como quando abres uma zona vazia. */
const cenaMinas: Cena = (ctx, l, a, t, h) => {
  fundo(ctx, l, a, h);
  const colunas = 8, linhas = 5, gap = Math.min(l, a) * .022;
  const cel = Math.min((l * .92 - gap * (colunas - 1)) / colunas, (a * .86 - gap * (linhas - 1)) / linhas);
  const ox = (l - (cel * colunas + gap * (colunas - 1))) / 2, oy = (a - (cel * linhas + gap * (linhas - 1))) / 2;
  const foco = { x: 2.5, y: 2 }, alcance = 7.2, fase = ((t / 3600) % 1) * 1.55;
  const cores = ['', '#71bfff', '#75e3a0', '#ffe071', '#ff9b67'];
  for (let y = 0; y < linhas; y++) for (let x = 0; x < colunas; x++) {
    const px = ox + x * (cel + gap), py = oy + y * (cel + gap);
    const d = Math.hypot(x - foco.x, y - foco.y) / alcance;
    const aberto = fase > d;
    const nova = aberto && fase - d < .1;
    const escala = nova ? .88 + (fase - d) / .1 * .12 : 1;
    ctx.save();
    ctx.translate(px + cel / 2, py + cel / 2);
    ctx.scale(escala, escala);
    ctx.beginPath();
    ctx.roundRect(-cel / 2, -cel / 2, cel, cel, cel * .2);
    ctx.fillStyle = aberto ? '#0a0d12' : `hsl(${h} 18% 15%)`;
    ctx.fill();
    ctx.strokeStyle = aberto ? `hsl(${h} 70% 60% / .16)` : `hsl(${h} 60% 70% / .28)`;
    ctx.lineWidth = 1;
    ctx.stroke();
    const vizinhas = aberto ? Math.floor(Math.abs(Math.sin(x * 12.9898 + y * 78.233)) * 1000) % 5 : 0;
    if (aberto && vizinhas) {
      ctx.fillStyle = cores[vizinhas];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${cel * .5}px "Space Grotesk", sans-serif`;
      ctx.fillText(String(vizinhas), 0, 1);
    } else if (!aberto && x === colunas - 1 && y === 0) {
      ctx.fillStyle = '#ffd86a';
      ctx.beginPath();
      ctx.moveTo(-cel * .12, -cel * .22);
      ctx.lineTo(cel * .2, -cel * .1);
      ctx.lineTo(-cel * .12, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
};

/** Duas peças que se aproximam, fundem e recomeçam. */
const cena2048: Cena = (ctx, l, a, t, h) => {
  fundo(ctx, l, a, h);
  const cel = Math.min(l * .26, a * .4), ciclo = (t / 2800) % 1;
  const cy = a * .5, centro = l * .5;
  const fundiu = ciclo > .55;
  const avanco = Math.min(1, ciclo / .55);
  const suave = 1 - Math.pow(1 - avanco, 3);
  const peca = (x: number, valor: number, escala: number, matiz: number): void => {
    ctx.save();
    ctx.translate(x, cy);
    ctx.scale(escala, escala);
    const g = ctx.createLinearGradient(-cel / 2, -cel / 2, cel / 2, cel / 2);
    g.addColorStop(0, `hsl(${matiz} 92% 72%)`);
    g.addColorStop(1, `hsl(${matiz} 72% 42%)`);
    ctx.fillStyle = g;
    ctx.shadowColor = `hsl(${matiz} 95% 60% / .45)`;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.roundRect(-cel / 2, -cel / 2, cel, cel, cel * .18);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#17140d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${cel * (valor >= 100 ? .34 : .42)}px "Space Grotesk", sans-serif`;
    ctx.fillText(String(valor), 0, 1);
    ctx.restore();
  };

  // Peças paradas, como pano de fundo da fusão.
  ctx.globalAlpha = .34;
  peca(l * .16, 8, .62, h);
  peca(l * .85, 32, .7, (h + 8) % 360);
  ctx.globalAlpha = 1;

  if (fundiu) {
    const impacto = (ciclo - .55) / .45;
    peca(centro, 128, 1 + Math.sin(impacto * Math.PI) * .14, (h + 10) % 360);
    ctx.strokeStyle = `hsl(${h} 100% 78% / ${(1 - impacto) * .5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centro, cy, cel * (.55 + impacto * .35), 0, Math.PI * 2);
    ctx.stroke();
  } else {
    const afastamento = (1 - suave) * l * .2;
    peca(centro - cel * .54 - afastamento, 64, 1, h);
    peca(centro + cel * .54 + afastamento, 64, 1, h);
  }
};

/** Uma peça a cair sobre a pilha, com a linha a acender quando fecha. */
const cenaTetris: Cena = (ctx, l, a, t, h) => {
  fundo(ctx, l, a, h);
  const colunas = 9, linhas = 6;
  const cel = Math.min(l / colunas, a / linhas);
  const ox = (l - cel * colunas) / 2, oy = (a - cel * linhas) / 2;
  const alturas = [2, 1, 2, 1, 0, 1, 2, 1, 2];
  const ciclo = (t / 2400) % 1;
  const bloco = (x: number, y: number, matiz: number, brilho = 0): void => {
    const px = ox + x * cel, py = oy + y * cel;
    ctx.fillStyle = `hsl(${matiz} ${72 + brilho * 25}% ${44 + brilho * 34}%)`;
    ctx.shadowColor = `hsl(${matiz} 95% 65% / ${.35 + brilho * .5})`;
    ctx.shadowBlur = 8 + brilho * 18;
    ctx.beginPath();
    ctx.roundRect(px + cel * .07, py + cel * .07, cel * .86, cel * .86, cel * .18);
    ctx.fill();
    ctx.shadowBlur = 0;
  };
  const fechada = ciclo > .78;
  for (let x = 0; x < colunas; x++) for (let i = 0; i < alturas[x]; i++) {
    const y = linhas - 1 - i;
    bloco(x, y, (h + x * 9) % 360, y === linhas - 1 && fechada ? 1 : 0);
  }
  // A peça em queda fecha o buraco da coluna do meio.
  const queda = Math.min(1, ciclo / .78);
  const y = (linhas - 3) * queda;
  bloco(4, y + 1, (h + 46) % 360);
  bloco(4, y, (h + 46) % 360);
};

/** A luz a partir os prismas: o arco da bola lê-se de relance no cartão. */
const cenaPrisma: Cena = (ctx, l, a, t, h) => {
  fundo(ctx, l, a, h);
  const colunas = 7, filas = 3;
  const margem = l * .08, espaco = l * .014;
  const largura = (l - margem * 2 - espaco * (colunas - 1)) / colunas;
  const altura = a * .076;
  for (let fila = 0; fila < filas; fila++) for (let coluna = 0; coluna < colunas; coluna++) {
    // A fila de baixo vai sendo partida da esquerda para a direita, e volta.
    const ciclo = (t / 3400) % 1;
    if (fila === filas - 1 && coluna < Math.floor(ciclo * (colunas + 2))) continue;
    const px = margem + coluna * (largura + espaco);
    const py = a * .2 + fila * (altura + espaco);
    // O mesmo espectro do jogo: dourado em baixo, âmbar em cima.
    const tom = (h - (filas - fila) * 6 + 360) % 360;
    const g = ctx.createLinearGradient(px, py, px, py + altura);
    g.addColorStop(0, `hsl(${tom} 92% 76%)`);
    g.addColorStop(1, `hsl(${tom} 78% 46%)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(px, py, largura, altura, largura * .18);
    ctx.fill();
  }

  // Bola num arco, com rasto, e a raquete por baixo a acompanhá-la.
  const fase = (t / 1900) % 1;
  const arco = (f: number): { x: number; y: number } => ({
    x: l * .2 + Math.abs(Math.sin(f * Math.PI * 2)) * l * .6,
    y: a * .52 + Math.sin(f * Math.PI * 4) * a * .12,
  });
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 1; i <= 6; i++) {
    const desvanece = 1 - i / 7;
    const p = arco(fase - i * .011);
    ctx.globalAlpha = desvanece * .28;
    ctx.fillStyle = `hsl(${h} 96% 72%)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, a * .021 * desvanece, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  const bola = arco(fase);
  ctx.shadowColor = `hsl(${h} 100% 70%)`;
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(bola.x, bola.y, a * .026, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  const raqueteY = a * .72;
  const raquete = ctx.createLinearGradient(0, raqueteY, 0, raqueteY + a * .032);
  raquete.addColorStop(0, `hsl(${h} 100% 86%)`);
  raquete.addColorStop(1, `hsl(${h} 86% 52%)`);
  ctx.fillStyle = raquete;
  ctx.beginPath();
  ctx.roundRect(bola.x - l * .1, raqueteY, l * .2, a * .032, a * .016);
  ctx.fill();
};

const CENAS: Record<JogoId, Cena> = {
  serpente: cenaSerpente,
  maze: cenaMaze,
  minas: cenaMinas,
  '2048': cena2048,
  tetris: cenaTetris,
  prisma: cenaPrisma,
};

interface Capa { tela: HTMLCanvasElement; ctx: CanvasRenderingContext2D; id: JogoId }

const capas: Capa[] = [];
let aCorrer = false;

function medir(capa: Capa): void {
  const escala = Math.min(2, window.devicePixelRatio || 1);
  const l = Math.round(capa.tela.clientWidth * escala), a = Math.round(capa.tela.clientHeight * escala);
  if (!l || !a || (capa.tela.width === l && capa.tela.height === a)) return;
  capa.tela.width = l;
  capa.tela.height = a;
}

function quadroCapas(agora: number): void {
  if (!aCorrer) return;
  const parado = document.documentElement.classList.contains('reduzir-movimento');
  for (const capa of capas) {
    if (!capa.tela.isConnected || !capa.tela.clientWidth) continue;
    medir(capa);
    CENAS[capa.id](capa.ctx, capa.tela.width, capa.tela.height, parado ? 900 : agora, ficha(capa.id).matiz);
  }
  requestAnimationFrame(quadroCapas);
}

/**
 * Regista uma tela para receber a capa animada do jogo indicado. A mesma tela
 * pode trocar de jogo — é o que faz o destaque e a ficha mudarem de cena.
 */
export function ligarCapa(tela: HTMLCanvasElement, id: JogoId): void {
  const jaLigada = capas.find((capa) => capa.tela === tela);
  if (jaLigada) {
    jaLigada.id = id;
    return;
  }
  const ctx = tela.getContext('2d');
  if (!ctx) return;
  capas.push({ tela, ctx, id });
}

/** As capas só desenham com o menu aberto: fechado, não gastam bateria. */
export function animarCapas(ligar: boolean): void {
  if (ligar === aCorrer) return;
  aCorrer = ligar;
  if (ligar) requestAnimationFrame(quadroCapas);
}
