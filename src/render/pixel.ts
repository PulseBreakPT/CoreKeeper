/**
 * Ferramentas de pixel art com volume.
 *
 * A diferença entre um boneco e uma criatura de Core Keeper não é a forma — é
 * o tratamento: contorno escuro fechado, três ou quatro tons por dentro,
 * textura de material e um brilho especular. Estas funções fazem isso para
 * qualquer silhueta, para cada criatura só ter de dizer a forma e os detalhes.
 *
 * Tudo trabalha em coordenadas 0..1 dentro do sprite, para a mesma criatura
 * poder ser gerada em 48, 64 ou 96 píxeis conforme o tamanho.
 */

import { mulberry32 } from '../core/rng';
import type { Paleta } from './paleta';

export type Ctx = CanvasRenderingContext2D;
export type Caminho = (c: Ctx, s: number) => void;
export type Textura = 'liso' | 'placas' | 'escamas' | 'pelo' | 'metal' | 'osso' | 'crosta' | 'gosma';

export interface OpcoesVolume {
  textura?: Textura;
  /** Mantido por compatibilidade; a direcção da luz é global. */
  luz?: number;
  /** Cor de contorno alternativa. */
  contorno?: string;
  /** Semente da textura, para dois corpos iguais não ficarem idênticos. */
  seed?: number;
  /** Sem especular (peças metálicas escuras, sombras). */
  semBrilho?: boolean;
}

/** Caminho de elipse em coordenadas 0..1. */
export function elipse(x: number, y: number, rx: number, ry: number): Caminho {
  return (c, s) => {
    c.beginPath();
    c.ellipse(x * s, y * s, rx * s, ry * s, 0, 0, Math.PI * 2);
  };
}

/** Caminho de rectângulo arredondado em coordenadas 0..1. */
export function caixa(x: number, y: number, w: number, h: number, r = 0): Caminho {
  return (c, s) => {
    c.beginPath();
    if (r > 0 && typeof c.roundRect === 'function') c.roundRect(x * s, y * s, w * s, h * s, r * s);
    else c.rect(x * s, y * s, w * s, h * s);
  };
}

/** Caminho a partir de uma lista de pontos. */
export function poligono(pontos: [number, number][]): Caminho {
  return (c, s) => {
    c.beginPath();
    pontos.forEach(([x, y], i) => (i === 0 ? c.moveTo(x * s, y * s) : c.lineTo(x * s, y * s)));
    c.closePath();
  };
}

/** Junta vários caminhos num só (silhueta composta com contorno único). */
export function juntar(...caminhos: Caminho[]): Caminho {
  return (c, s) => {
    c.beginPath();
    for (const caminho of caminhos) {
      const anterior = c.beginPath.bind(c);
      void anterior;
      caminho(c, s);
    }
  };
}

const VIZINHOS: [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1],
];

/** Lado de onde vem a luz, em fracção do sprite. Igual para todas as criaturas. */
const LUZ_X = -0.055;
const LUZ_Y = -0.075;

const tramas = new Map<string, CanvasPattern | null>();

/**
 * Trama de xadrez de dois píxeis. Serve para as transições entre tons não
 * serem um corte a direito — é o dither clássico da pixel art.
 */
function trama(c: Ctx, cor: string): CanvasPattern | null {
  const existente = tramas.get(cor);
  if (existente !== undefined) return existente;
  const t = document.createElement('canvas');
  t.width = 2;
  t.height = 2;
  const tc = t.getContext('2d')!;
  tc.fillStyle = cor;
  tc.fillRect(0, 0, 1, 1);
  tc.fillRect(1, 1, 1, 1);
  const padrao = c.createPattern(t, 'repeat');
  tramas.set(cor, padrao);
  return padrao;
}

/** Desenha o caminho deslocado e, opcionalmente, encolhido para o centro. */
function caminhoDeslocado(c: Ctx, s: number, caminho: Caminho, dx: number, dy: number, escala = 1): void {
  c.save();
  c.translate(dx * s, dy * s);
  if (escala !== 1) {
    c.translate(s / 2, s / 2);
    c.scale(escala, escala);
    c.translate(-s / 2, -s / 2);
  }
  caminho(c, s);
  c.restore();
}

/**
 * Pinta uma silhueta com contorno, volume e textura.
 *
 * O sombreado segue a forma em vez de ser bandas horizontais: a sombra é a
 * própria silhueta deslocada para o lado contrário à luz, e a luz é a
 * silhueta encolhida na direcção da luz. É assim que se evita o "pillow
 * shading" e o banding — o corpo ganha volume em vez de parecer uma almofada.
 */
export function volume(c: Ctx, s: number, p: Paleta, caminho: Caminho, op: OpcoesVolume = {}): void {
  const dx = LUZ_X;
  const dy = LUZ_Y;

  // 1. Contorno fechado.
  c.save();
  c.fillStyle = op.contorno ?? p.contorno;
  for (const [ox, oy] of VIZINHOS) {
    c.save();
    c.translate(ox, oy);
    caminho(c, s);
    c.fill();
    c.restore();
  }
  c.restore();

  // 2. Contorno selectivo: do lado iluminado usa-se o tom de sombra em vez do
  //    contorno, o que quebra a linha preta e suaviza a silhueta.
  c.save();
  c.fillStyle = p.escuro;
  for (const [ox, oy] of [[-1, -1], [0, -1], [-1, 0]] as [number, number][]) {
    c.save();
    c.translate(ox, oy);
    caminho(c, s);
    c.fill();
    c.restore();
  }
  c.restore();

  // 3. Interior.
  c.save();
  caminho(c, s);
  c.clip();

  // Tudo começa em sombra.
  c.fillStyle = p.escuro;
  c.fillRect(0, 0, s, s);

  // A zona iluminada é a silhueta empurrada na direcção da luz.
  c.fillStyle = p.base;
  caminhoDeslocado(c, s, caminho, dx * 0.9, dy * 0.9);
  c.fill();

  // Transição com dither entre sombra e base.
  const tramaEscura = trama(c, p.escuro);
  if (tramaEscura) {
    c.strokeStyle = tramaEscura;
    c.lineWidth = Math.max(2, s * 0.06);
    caminhoDeslocado(c, s, caminho, dx * 0.9, dy * 0.9);
    c.stroke();
  }

  // Zona de luz: mais pequena e ainda mais na direcção da luz.
  c.fillStyle = p.claro;
  caminhoDeslocado(c, s, caminho, dx * 1.9, dy * 1.9, 0.78);
  c.fill();

  const tramaBase = trama(c, p.base);
  if (tramaBase) {
    c.strokeStyle = tramaBase;
    c.lineWidth = Math.max(2, s * 0.05);
    caminhoDeslocado(c, s, caminho, dx * 1.9, dy * 1.9, 0.78);
    c.stroke();
  }

  if (op.textura && op.textura !== 'liso') aplicarTextura(c, s, p, op.textura, op.seed ?? 7);

  // Luz de bordo do lado oposto: separa a criatura do fundo escuro.
  c.globalCompositeOperation = 'source-atop';
  c.globalAlpha = 0.22;
  c.fillStyle = p.acento;
  caminhoDeslocado(c, s, caminho, -dx * 1.1, -dy * 0.7);
  c.fill();
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;

  c.restore();

  // 4. Especular: um ponto pequeno no lado da luz, o mais claro do sprite.
  if (!op.semBrilho) {
    c.save();
    caminho(c, s);
    c.clip();
    c.fillStyle = '#ffffff';
    c.globalAlpha = 0.3;
    caminhoDeslocado(c, s, caminho, dx * 3.1, dy * 3.1, 0.3);
    c.fill();
    c.globalAlpha = 1;
    c.restore();
  }
}

function aplicarTextura(c: Ctx, s: number, p: Paleta, textura: Textura, seed: number): void {
  const r = mulberry32(seed * 7919);
  const passo = Math.max(1, Math.round(s / 16));

  switch (textura) {
    case 'placas': {
      // Placas sobrepostas, com o rebordo iluminado.
      for (let y = Math.round(s * 0.18); y < s; y += passo * 3) {
        c.fillStyle = p.contorno;
        c.globalAlpha = 0.5;
        c.fillRect(0, y, s, 1);
        c.globalAlpha = 0.4;
        c.fillStyle = p.claro;
        c.fillRect(0, y + 1, s, 1);
      }
      c.globalAlpha = 1;
      break;
    }
    case 'escamas': {
      const raio = passo * 1.6;
      c.strokeStyle = p.escuro;
      c.lineWidth = 1;
      for (let y = raio; y < s + raio; y += raio) {
        const desvio = ((y / raio) % 2) * raio;
        for (let x = -raio; x < s + raio; x += raio * 2) {
          c.beginPath();
          c.arc(x + desvio, y, raio, Math.PI * 0.1, Math.PI * 0.9);
          c.stroke();
        }
      }
      break;
    }
    case 'pelo': {
      c.strokeStyle = p.escuro;
      c.globalAlpha = 0.55;
      c.lineWidth = 1;
      for (let i = 0; i < s * 0.9; i++) {
        const x = r() * s;
        const y = r() * s;
        const h = passo * (1 + r() * 2);
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + (r() - 0.5) * passo, y + h);
        c.stroke();
      }
      c.globalAlpha = 1;
      break;
    }
    case 'metal': {
      // Chapa: um risco de luz horizontal, rebites e riscos de uso.
      c.fillStyle = p.claro;
      c.globalAlpha = 0.5;
      c.fillRect(0, Math.round(s * 0.42), s, passo);
      c.globalAlpha = 1;
      c.fillStyle = p.contorno;
      for (let i = 0; i < 6; i++) {
        const x = Math.round(r() * s);
        const y = Math.round(r() * s);
        c.fillRect(x, y, passo, passo);
        c.fillStyle = p.acento;
        c.fillRect(x, y, 1, 1);
        c.fillStyle = p.contorno;
      }
      c.globalAlpha = 0.3;
      for (let i = 0; i < 5; i++) {
        c.fillRect(r() * s, r() * s, passo * (1 + r() * 3), 1);
      }
      c.globalAlpha = 1;
      break;
    }
    case 'osso': {
      // Estrias e poros.
      c.fillStyle = p.escuro;
      c.globalAlpha = 0.4;
      for (let x = 0; x < s; x += passo * 2) c.fillRect(x, 0, 1, s);
      c.globalAlpha = 0.6;
      for (let i = 0; i < 10; i++) {
        c.fillRect(Math.round(r() * s), Math.round(r() * s), passo, passo);
      }
      c.globalAlpha = 1;
      break;
    }
    case 'crosta': {
      // Blocos irregulares, como pedra partida.
      for (let i = 0; i < 12; i++) {
        const x = Math.round(r() * s);
        const y = Math.round(r() * s);
        const w = passo * (1 + Math.round(r() * 2));
        const h = passo * (1 + Math.round(r() * 2));
        c.fillStyle = r() > 0.5 ? p.claro : p.escuro;
        c.fillRect(x, y, w, h);
        c.fillStyle = p.contorno;
        c.globalAlpha = 0.5;
        c.fillRect(x, y + h, w, 1);
        c.globalAlpha = 1;
      }
      break;
    }
    case 'gosma': {
      // Bolhas presas por dentro.
      for (let i = 0; i < 7; i++) {
        const x = r() * s;
        const y = r() * s;
        const raio = passo * (0.6 + r() * 1.2);
        c.globalAlpha = 0.35;
        c.fillStyle = p.escuro;
        c.beginPath();
        c.arc(x, y, raio, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 0.5;
        c.fillStyle = p.claro;
        c.beginPath();
        c.arc(x - raio * 0.3, y - raio * 0.3, raio * 0.45, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
      break;
    }
  }
}

// --- Peças comuns ------------------------------------------------------------

/** Olho com contorno, íris e especular. */
export function olho(c: Ctx, s: number, x: number, y: number, raio: number, cor: string, brilhoCor = '#ffffff'): void {
  const r = raio * s;
  c.fillStyle = '#0a0810';
  c.beginPath();
  c.arc(x * s, y * s, r + 1, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = cor;
  c.beginPath();
  c.arc(x * s, y * s, r, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = brilhoCor;
  c.beginPath();
  c.arc(x * s - r * 0.35, y * s - r * 0.35, Math.max(1, r * 0.35), 0, Math.PI * 2);
  c.fill();
}

/** Par de olhos. */
export function olhos(c: Ctx, s: number, x: number, y: number, sep: number, raio: number, cor: string): void {
  olho(c, s, x - sep, y, raio, cor);
  olho(c, s, x + sep, y, raio, cor);
}

/** Fileira de dentes triangulares entre dois pontos. */
export function dentes(c: Ctx, s: number, x0: number, x1: number, y: number, altura: number, n: number, cor = '#efe6d0'): void {
  c.fillStyle = cor;
  const largura = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * largura;
    c.beginPath();
    c.moveTo(x * s, y * s);
    c.lineTo((x + largura / 2) * s, (y + altura) * s);
    c.lineTo((x + largura) * s, y * s);
    c.closePath();
    c.fill();
  }
}

/** Perna ou antena articulada, com contorno. */
export function membro(
  c: Ctx,
  s: number,
  pontos: [number, number][],
  espessura: number,
  p: Paleta,
  tom: keyof Paleta = 'escuro',
): void {
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = p.contorno;
  c.lineWidth = espessura * s + 2;
  c.beginPath();
  pontos.forEach(([x, y], i) => (i === 0 ? c.moveTo(x * s, y * s) : c.lineTo(x * s, y * s)));
  c.stroke();
  c.strokeStyle = p[tom];
  c.lineWidth = espessura * s;
  c.beginPath();
  pontos.forEach(([x, y], i) => (i === 0 ? c.moveTo(x * s, y * s) : c.lineTo(x * s, y * s)));
  c.stroke();
}

/** Halo aditivo, para partes que brilham. */
export function brilho(c: Ctx, s: number, x: number, y: number, raio: number, cor: string, forca = 0.6): void {
  const g = c.createRadialGradient(x * s, y * s, 0, x * s, y * s, raio * s);
  g.addColorStop(0, cor);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = forca;
  c.fillStyle = g;
  c.fillRect((x - raio) * s, (y - raio) * s, raio * 2 * s, raio * 2 * s);
  c.restore();
}

/** Mancha de cor por cima da silhueta (marcas, riscas, manchas). */
export function marca(c: Ctx, s: number, caminho: Caminho, cor: string, alfa = 1): void {
  c.save();
  c.globalAlpha = alfa;
  c.fillStyle = cor;
  caminho(c, s);
  c.fill();
  c.restore();
}
