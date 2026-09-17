/**
 * Auto-tiling e oclusão ambiente.
 *
 * As arestas e as sombras são pré-desenhadas uma vez por combinação de
 * vizinhos e reutilizadas — é o que permite ter rocha "ligada" sem custo.
 */

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

export function limparCacheAutotile(): void {
  sombras.clear();
}
