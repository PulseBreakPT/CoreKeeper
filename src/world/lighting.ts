/** Mapa de luz por tile: propagação a partir de tochas, minérios, lava e do brilho do jogador. */

import { blockDef, groundDef } from './tiles';
import type { World } from './world';

export interface FonteLuz {
  x: number;
  y: number;
  intensidade: number;
  cor: [number, number, number];
}

const DECAI_ABERTO = 0.85;
const DECAI_SOLIDO = 0.48;
const MINIMO = 0.02;

export class Lighting {
  private largura = 0;
  private altura = 0;
  private x0 = 0;
  private y0 = 0;
  private r = new Float32Array(0);
  private g = new Float32Array(0);
  private b = new Float32Array(0);
  private solidos = new Uint8Array(0);
  private fila: number[] = [];
  /** Luz ambiente de fundo: nunca é completamente preto. */
  ambiente = 0.1;

  private redimensionar(w: number, h: number): void {
    if (w === this.largura && h === this.altura) return;
    this.largura = w;
    this.altura = h;
    const n = w * h;
    this.r = new Float32Array(n);
    this.g = new Float32Array(n);
    this.b = new Float32Array(n);
    this.solidos = new Uint8Array(n);
  }

  get x(): number {
    return this.x0;
  }

  get y(): number {
    return this.y0;
  }

  get w(): number {
    return this.largura;
  }

  get h(): number {
    return this.altura;
  }

  /** Recalcula a luz para a área visível, incluindo fontes extra (jogador, projécteis). */
  calcular(world: World, x0: number, y0: number, w: number, h: number, extras: FonteLuz[]): void {
    this.redimensionar(w, h);
    this.x0 = x0;
    this.y0 = y0;
    this.r.fill(this.ambiente * 0.8);
    this.g.fill(this.ambiente * 0.85);
    this.b.fill(this.ambiente);
    this.fila.length = 0;

    for (let ly = 0; ly < h; ly++) {
      for (let lx = 0; lx < w; lx++) {
        const wx = x0 + lx;
        const wy = y0 + ly;
        const i = ly * w + lx;
        const bd = blockDef(world.bloco(wx, wy));
        this.solidos[i] = bd.solido ? 1 : 0;
        const gd = groundDef(world.chao(wx, wy));
        if (bd.luz) this.semear(i, bd.luz, bd.corLuz ?? [1, 1, 1]);
        if (gd.luz) this.semear(i, gd.luz, gd.corLuz ?? [1, 0.55, 0.25]);
      }
    }

    for (const f of extras) {
      const lx = Math.floor(f.x) - x0;
      const ly = Math.floor(f.y) - y0;
      if (lx < 0 || ly < 0 || lx >= w || ly >= h) continue;
      this.semear(ly * w + lx, f.intensidade, f.cor);
    }

    this.propagar();
  }

  private semear(i: number, intensidade: number, cor: [number, number, number]): void {
    const r = intensidade * cor[0];
    const g = intensidade * cor[1];
    const b = intensidade * cor[2];
    let mudou = false;
    if (r > this.r[i]) {
      this.r[i] = r;
      mudou = true;
    }
    if (g > this.g[i]) {
      this.g[i] = g;
      mudou = true;
    }
    if (b > this.b[i]) {
      this.b[i] = b;
      mudou = true;
    }
    if (mudou) this.fila.push(i);
  }

  private propagar(): void {
    const { largura: w, altura: h } = this;
    let cabeca = 0;
    while (cabeca < this.fila.length) {
      const i = this.fila[cabeca++];
      const lx = i % w;
      const ly = (i / w) | 0;
      const decai = this.solidos[i] ? DECAI_SOLIDO : DECAI_ABERTO;
      const nr = this.r[i] * decai;
      const ng = this.g[i] * decai;
      const nb = this.b[i] * decai;
      if (nr < MINIMO && ng < MINIMO && nb < MINIMO) continue;
      if (lx > 0) this.espalhar(i - 1, nr, ng, nb);
      if (lx < w - 1) this.espalhar(i + 1, nr, ng, nb);
      if (ly > 0) this.espalhar(i - w, nr, ng, nb);
      if (ly < h - 1) this.espalhar(i + w, nr, ng, nb);
    }
  }

  private espalhar(i: number, r: number, g: number, b: number): void {
    let mudou = false;
    if (r > this.r[i] + 0.004) {
      this.r[i] = r;
      mudou = true;
    }
    if (g > this.g[i] + 0.004) {
      this.g[i] = g;
      mudou = true;
    }
    if (b > this.b[i] + 0.004) {
      this.b[i] = b;
      mudou = true;
    }
    if (mudou) this.fila.push(i);
  }

  /** Luz num tile do mundo (0..~1), útil para decidir se algo é visível. */
  nivel(wx: number, wy: number): number {
    const lx = wx - this.x0;
    const ly = wy - this.y0;
    if (lx < 0 || ly < 0 || lx >= this.largura || ly >= this.altura) return this.ambiente;
    const i = ly * this.largura + lx;
    return Math.max(this.r[i], this.g[i], this.b[i]);
  }

  /**
   * Escreve o mapa de luz num ImageData para ser esticado por cima da cena.
   * A tonalidade do bioma é aplicada aqui, numa imagem de algumas centenas de
   * píxeis, em vez de numa passagem por cima do ecrã inteiro.
   */
  escreverImagem(img: ImageData, grading: [number, number, number] = [1, 1, 1]): void {
    const dados = img.data;
    const n = this.largura * this.altura;
    const [gr, gg, gb] = grading;
    for (let i = 0; i < n; i++) {
      dados[i * 4] = Math.min(255, this.r[i] * 255 * gr) | 0;
      dados[i * 4 + 1] = Math.min(255, this.g[i] * 255 * gg) | 0;
      dados[i * 4 + 2] = Math.min(255, this.b[i] * 255 * gb) | 0;
      dados[i * 4 + 3] = 255;
    }
  }
}
