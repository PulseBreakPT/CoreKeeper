/** Colisão simples de círculo contra tiles sólidos, resolvida eixo a eixo. */

import type { World } from '../world/world';

export interface CorpoMovel {
  x: number;
  y: number;
  raio: number;
}

function colide(world: World, x: number, y: number, raio: number): boolean {
  const minX = Math.floor(x - raio);
  const maxX = Math.floor(x + raio);
  const minY = Math.floor(y - raio);
  const maxY = Math.floor(y + raio);
  for (let ty = minY; ty <= maxY; ty++) {
    for (let tx = minX; tx <= maxX; tx++) {
      if (!world.solido(tx, ty)) continue;
      const maisPertoX = Math.max(tx, Math.min(x, tx + 1));
      const maisPertoY = Math.max(ty, Math.min(y, ty + 1));
      const dx = x - maisPertoX;
      const dy = y - maisPertoY;
      if (dx * dx + dy * dy < raio * raio) return true;
    }
  }
  return false;
}

/** Move o corpo, devolvendo se bateu em alguma coisa. */
export function mover(world: World, corpo: CorpoMovel, dx: number, dy: number): boolean {
  let bateu = false;
  if (dx !== 0) {
    const nx = corpo.x + dx;
    if (!colide(world, nx, corpo.y, corpo.raio)) corpo.x = nx;
    else bateu = true;
  }
  if (dy !== 0) {
    const ny = corpo.y + dy;
    if (!colide(world, corpo.x, ny, corpo.raio)) corpo.y = ny;
    else bateu = true;
  }
  return bateu;
}

/** Empurra um corpo preso dentro de rocha para o espaço livre mais próximo. */
export function desencravar(world: World, corpo: CorpoMovel): void {
  if (!colide(world, corpo.x, corpo.y, corpo.raio)) return;
  for (let r = 1; r <= 12; r++) {
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      const x = corpo.x + Math.cos(ang) * r;
      const y = corpo.y + Math.sin(ang) * r;
      if (!colide(world, x, y, corpo.raio)) {
        corpo.x = x;
        corpo.y = y;
        return;
      }
    }
  }
}

export function linhaLivre(world: World, x0: number, y0: number, x1: number, y1: number): boolean {
  const passos = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3);
  for (let i = 1; i < passos; i++) {
    const t = i / passos;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    if (world.solido(Math.floor(x), Math.floor(y))) return false;
  }
  return true;
}
