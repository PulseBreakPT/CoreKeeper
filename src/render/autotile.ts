/**
 * Auto-tiling e oclusão ambiente.
 *
 * As arestas e as sombras são pré-desenhadas uma vez por combinação de
 * vizinhos e reutilizadas — é o que permite ter rocha "ligada" sem custo.
 */

import { mulberry32 } from '../core/rng';
import type { Paleta } from './paleta';
import { TILE } from './sprites';

export const N = 1;
export const S = 2;
export const E = 4;
export const O = 8;
export const NE = 16;
export const NO = 32;
export const SE = 64;
export const SO = 128;

/** Uma tabela de 256 arestas por paleta: procura por índice, sem criar strings. */
const arestas = new WeakMap<Paleta, HTMLCanvasElement[]>();
const sombras = new Map<number, HTMLCanvasElement>();
/** Bandas de transição entre dois tipos de chão, por paleta e por lado. */
const transicoes = new WeakMap<Paleta, HTMLCanvasElement[]>();

function novo(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TILE;
  c.height = TILE;
  return c;
}

/**
 * Arestas de uma parede: luz onde o topo está exposto, sombra por baixo,
 * e um rebordo médio nos lados. É isto que faz a rocha parecer um volume.
 */
export function arestaParede(mascara: number, p: Paleta): HTMLCanvasElement {
  let tabela = arestas.get(p);
  if (tabela === undefined) {
    tabela = [];
    arestas.set(p, tabela);
  }
  const existente = tabela[mascara];
  if (existente !== undefined) return existente;

  const canvas = novo();
  const c = canvas.getContext('2d')!;

  // Topo exposto: rebordo iluminado com um degrau, como pedra partida.
  if (mascara & N) {
    c.fillStyle = p.claro;
    c.fillRect(0, 0, TILE, 3);
    c.fillStyle = p.acento;
    c.fillRect(0, 0, TILE, 1);
    c.globalAlpha = 0.5;
    c.fillStyle = p.claro;
    c.fillRect(0, 3, TILE, 2);
    c.globalAlpha = 1;
  }
  if (mascara & S) {
    c.fillStyle = p.contorno;
    c.fillRect(0, TILE - 4, TILE, 4);
    c.fillStyle = p.escuro;
    c.fillRect(0, TILE - 5, TILE, 1);
  }
  if (mascara & O) {
    c.fillStyle = p.escuro;
    c.fillRect(0, 0, 3, TILE);
    c.fillStyle = p.claro;
    c.globalAlpha = 0.35;
    c.fillRect(0, 0, 1, TILE);
    c.globalAlpha = 1;
  }
  if (mascara & E) {
    c.fillStyle = p.contorno;
    c.fillRect(TILE - 3, 0, 3, TILE);
    c.fillStyle = p.escuro;
    c.fillRect(TILE - 4, 0, 1, TILE);
  }

  // Cantos interiores: pequenos chanfros para as arestas não ficarem em esquadria.
  c.fillStyle = p.contorno;
  if (mascara & NE && !(mascara & N) && !(mascara & E)) c.fillRect(TILE - 4, 0, 4, 4);
  if (mascara & NO && !(mascara & N) && !(mascara & O)) c.fillRect(0, 0, 4, 4);
  if (mascara & SE && !(mascara & S) && !(mascara & E)) c.fillRect(TILE - 4, TILE - 4, 4, 4);
  if (mascara & SO && !(mascara & S) && !(mascara & O)) c.fillRect(0, TILE - 4, 4, 4);

  tabela[mascara] = canvas;
  return canvas;
}

/** Oclusão ambiente num chão: escurece os lados encostados a rocha. */
export function oclusaoChao(mascara: number): HTMLCanvasElement | null {
  if (mascara === 0) return null;
  const existente = sombras.get(mascara);
  if (existente) return existente;

  const canvas = novo();
  const c = canvas.getContext('2d')!;
  const alcance = TILE * 0.55;

  const faixa = (x0: number, y0: number, x1: number, y1: number) => {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, 'rgba(0,0,0,0.62)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, TILE, TILE);
  };

  if (mascara & N) faixa(0, 0, 0, alcance);
  if (mascara & S) faixa(0, TILE, 0, TILE - alcance);
  if (mascara & O) faixa(0, 0, alcance, 0);
  if (mascara & E) faixa(TILE, 0, TILE - alcance, 0);

  // Cantos: mancha radial no vértice.
  const canto = (x: number, y: number) => {
    const g = c.createRadialGradient(x, y, 0, x, y, alcance * 0.9);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, TILE, TILE);
  };
  if (mascara & NO && !(mascara & N) && !(mascara & O)) canto(0, 0);
  if (mascara & NE && !(mascara & N) && !(mascara & E)) canto(TILE, 0);
  if (mascara & SO && !(mascara & S) && !(mascara & O)) canto(0, TILE);
  if (mascara & SE && !(mascara & S) && !(mascara & E)) canto(TILE, TILE);

  sombras.set(mascara, canvas);
  return canvas;
}

/**
 * Banda irregular com que um chão invade o vizinho.
 *
 * Sem isto, dois materiais diferentes encostam num corte a direito e o mapa
 * parece feito de azulejos. `lado`: 0 cima, 1 baixo, 2 direita, 3 esquerda.
 */
export function transicaoChao(lado: number, p: Paleta): HTMLCanvasElement {
  let tabela = transicoes.get(p);
  if (tabela === undefined) {
    tabela = [];
    transicoes.set(p, tabela);
  }
  const existente = tabela[lado];
  if (existente !== undefined) return existente;

  const canvas = novo();
  const c = canvas.getContext('2d')!;
  // Semente fixa por lado: a orla é sempre igual, mas não é uma linha recta.
  const r = mulberry32(31337 + lado * 977);

  // Perfil suave: a profundidade só muda um pouco de coluna para coluna, senão
  // a orla fica com dentes de serra e dá nas vistas.
  let prof = 4;
  for (let i = 0; i < TILE; i++) {
    prof += r() > 0.5 ? 1 : -1;
    prof = Math.max(2, Math.min(8, prof));
    const total = prof + (r() > 0.88 ? 2 : 0);
    c.fillStyle = p.base;
    if (lado === 0) c.fillRect(i, 0, 1, total);
    else if (lado === 1) c.fillRect(i, TILE - total, 1, total);
    else if (lado === 2) c.fillRect(TILE - total, i, total, 1);
    else c.fillRect(0, i, total, 1);

    // Uns grãos soltos mais à frente, para a orla não acabar de repente.
    if (r() > 0.55) {
      const extra = total + 1 + Math.floor(r() * 4);
      c.fillStyle = p.escuro;
      if (lado === 0) c.fillRect(i, extra, 1, 1);
      else if (lado === 1) c.fillRect(i, TILE - extra, 1, 1);
      else if (lado === 2) c.fillRect(TILE - extra, i, 1, 1);
      else c.fillRect(extra, i, 1, 1);
    }
  }

  // Risco de luz no bordo, para o material que entra ganhar relevo.
  c.fillStyle = p.claro;
  c.globalAlpha = 0.3;
  if (lado === 0) c.fillRect(0, 0, TILE, 1);
  else if (lado === 1) c.fillRect(0, TILE - 1, TILE, 1);
  else if (lado === 2) c.fillRect(TILE - 1, 0, 1, TILE);
  else c.fillRect(0, 0, 1, TILE);
  c.globalAlpha = 1;

  tabela[lado] = canvas;
  return canvas;
}

export function limparCacheAutotile(): void {
  sombras.clear();
}
