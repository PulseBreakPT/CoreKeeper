/**
 * O Portador, em pixel art, com as mesmas regras do bestiário: contorno
 * fechado, sombreado que segue a forma, matiz desviada e um único ponto de
 * atenção — a marca dourada no peito.
 *
 * Três vistas (frente, costas, perfil) e quatro quadros de passo.
 */

import { paleta, rampa, type Paleta } from './paleta';
import { brilho, caixa, elipse, marca, olho, poligono, volume, type Ctx } from './pixel';

export type Vista = 'frente' | 'costas' | 'perfil';

const CAPA = rampa('#2f2648');
const PELE = rampa('#d9a271');
const FATO_BASE = rampa('#35507a');
const BOTA = rampa('#3b2f4e');
const CINTO = rampa('#6b4a24');

const cacheFato = new Map<string, Paleta>();

function fatoDe(cor: string | null): Paleta {
  if (!cor) return FATO_BASE;
  let p = cacheFato.get(cor);
  if (!p) {
    p = rampa(cor);
    cacheFato.set(cor, p);
  }
  return p;
}

const OURO = paleta('#4a3505', '#8a6a10', '#f2c333', '#ffe07a', '#fff6c2');

const cache = new Map<string, HTMLCanvasElement>();

/** Sprite do Portador, pintado uma vez por combinação e depois reutilizado. */
export function spritePortador(
  vista: Vista,
  quadro: number,
  corPeito: string | null,
  corElmo: string | null,
  tamanho = 64,
): HTMLCanvasElement {
  const chave = `${vista}|${quadro}|${corPeito ?? '-'}|${corElmo ?? '-'}|${tamanho}`;
  const existente = cache.get(chave);
  if (existente) return existente;

  const canvas = document.createElement('canvas');
  canvas.width = tamanho;
  canvas.height = tamanho;
  const c = canvas.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  pintar(c, tamanho, vista, quadro, fatoDe(corPeito), corElmo ? fatoDe(corElmo) : CAPA);
  cache.set(chave, canvas);
  return canvas;
}

function pintar(c: Ctx, s: number, vista: Vista, q: number, fato: Paleta, elmo: Paleta): void {
  const passo = [0, 0.035, 0, -0.035][q & 3];
  const sobe = [0.012, 0, 0.012, 0][q & 3];
  const perfil = vista === 'perfil';
  const costas = vista === 'costas';
  const larg = perfil ? 0.28 : 0.36;

  // --- Capa, atrás de tudo, a arrastar com o passo ---
  const arrasto = passo * 0.8;
  volume(c, s, CAPA, poligono([
    [0.5 - larg * 0.8, 0.32],
    [0.5 + larg * 0.8, 0.32],
    [0.5 + larg * 1.05 + arrasto, 0.7],
    [0.5 + larg * 0.9 + arrasto, 0.88],
    [0.5 - larg * 0.9 + arrasto, 0.88],
    [0.5 - larg * 1.05 + arrasto, 0.7],
  ]), { textura: 'pelo', seed: 3, semBrilho: true });

  // --- Pernas e botas ---
  const perna = (dx: number, desloc: number) => {
    volume(c, s, fato, caixa(0.5 + dx - 0.055, 0.64 + desloc, 0.11, 0.16, 0.02), {
      textura: 'liso', semBrilho: true,
    });
    volume(c, s, BOTA, caixa(0.5 + dx - 0.07, 0.78 + desloc, 0.14, 0.09, 0.025), { textura: 'liso' });
  };
  if (perfil) {
    perna(0.03, passo);
    perna(-0.03, -passo);
  } else {
    perna(-0.1, passo);
    perna(0.1, -passo);
  }

  // --- Tronco e ombreiras ---
  volume(c, s, fato, caixa(0.5 - larg / 2, 0.38 - sobe, larg, 0.3, 0.05), { textura: 'placas', seed: 11 });
  for (const lado of [-1, 1]) {
    if (perfil && lado < 0) continue;
    volume(c, s, fato, poligono([
      [0.5 + lado * (larg / 2 + 0.09), 0.44 - sobe],
      [0.5 + lado * (larg / 2 + 0.02), 0.36 - sobe],
      [0.5 + lado * (larg / 2 - 0.06), 0.38 - sobe],
      [0.5 + lado * (larg / 2 - 0.02), 0.47 - sobe],
    ]), { textura: 'metal', seed: 13 });
  }
  // Cinto.
  volume(c, s, CINTO, caixa(0.5 - larg / 2 - 0.01, 0.6 - sobe, larg + 0.02, 0.05, 0.015), {
    textura: 'liso', semBrilho: true,
  });
  marca(c, s, caixa(0.48, 0.605 - sobe, 0.04, 0.04, 0.01), OURO.base);

  // --- Braços ---
  const braco = (dx: number, desloc: number) => {
    volume(c, s, fato, caixa(0.5 + dx - 0.045, 0.4 + desloc - sobe, 0.09, 0.22, 0.025), {
      textura: 'liso', semBrilho: true,
    });
    volume(c, s, PELE, elipse(0.5 + dx, 0.63 + desloc - sobe, 0.04, 0.035), { textura: 'liso' });
  };
  if (perfil) {
    braco(0.1, passo * 0.7);
  } else {
    braco(-larg / 2 - 0.03, passo * 0.6);
    braco(larg / 2 + 0.03, -passo * 0.6);
  }

  // --- A marca do Portador: o ponto mais claro e mais saturado do sprite ---
  if (!costas) {
    const cx = perfil ? 0.54 : 0.5;
    brilho(c, s, cx, 0.5 - sobe, 0.26, 'rgba(242,195,51,0.55)', 0.85);
    marca(c, s, elipse(cx, 0.5 - sobe, 0.055, 0.055), OURO.escuro);
    marca(c, s, elipse(cx, 0.5 - sobe, 0.04, 0.04), OURO.base);
    marca(c, s, elipse(cx, 0.5 - sobe, 0.02, 0.02), OURO.acento);
  }

  // --- Cabeça ---
  const cabecaY = 0.27 - sobe;
  if (!costas) {
    volume(c, s, PELE, elipse(perfil ? 0.52 : 0.5, cabecaY + 0.02, 0.105, 0.105), { textura: 'liso' });
  }

  // Capuz: cobre o crânio e desce em bico atrás.
  volume(c, s, elmo, poligono(
    costas
      ? [[0.36, 0.34], [0.38, 0.16], [0.5, 0.1], [0.62, 0.16], [0.64, 0.34]]
      : perfil
        ? [[0.34, 0.34], [0.36, 0.16], [0.5, 0.1], [0.62, 0.15], [0.63, 0.24], [0.5, 0.26], [0.42, 0.34]]
        : [[0.34, 0.33], [0.36, 0.15], [0.5, 0.09], [0.64, 0.15], [0.66, 0.33], [0.58, 0.27], [0.42, 0.27]],
  ), { textura: 'pelo', seed: 5 });

  // Aba do capuz a apontar para trás.
  marca(c, s, poligono([[0.34, 0.2], [0.24 + arrasto, 0.33], [0.38, 0.3]]), CAPA.escuro);

  // --- Olhos, a brilhar debaixo do capuz ---
  if (!costas) {
    const ox = perfil ? 0.56 : 0.5;
    const sep = perfil ? 0.035 : 0.06;
    marca(c, s, caixa(ox - sep - 0.035, cabecaY - 0.005, sep * 2 + 0.07, 0.045, 0.01), '#120c1c', 0.85);
    olho(c, s, ox - sep, cabecaY + 0.015, 0.018, '#8ff0ff');
    if (!perfil) olho(c, s, ox + sep, cabecaY + 0.015, 0.018, '#8ff0ff');
    brilho(c, s, ox, cabecaY + 0.015, 0.14, 'rgba(143,240,255,0.35)', 0.6);
  }
}

export function limparCachePortador(): void {
  cache.clear();
  cacheFato.clear();
}
