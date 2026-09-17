/** Geradores determinísticos: a mesma seed produz sempre o mesmo mundo. */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash estável de um par de coordenadas — base da geração por chunk. */
export function hash2d(x: number, y: number, seed: number): number {
  let h = seed >>> 0;
  h = Math.imul(h ^ (x | 0), 0x27d4eb2d);
  h = Math.imul(h ^ (y | 0), 0x165667b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Valor pseudo-aleatório em [0,1) para uma célula. */
export function cellRandom(x: number, y: number, seed: number): number {
  return hash2d(x, y, seed) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Ruído de valor 2D com interpolação suave. */
export function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const a = cellRandom(x0, y0, seed);
  const b = cellRandom(x0 + 1, y0, seed);
  const c = cellRandom(x0, y0 + 1, seed);
  const d = cellRandom(x0 + 1, y0 + 1, seed);
  const top = a + (b - a) * fx;
  const bottom = c + (d - c) * fx;
  return top + (bottom - top) * fy;
}

/** Ruído fractal (várias oitavas) — usado para cavernas e biomas. */
export function fbm(x: number, y: number, seed: number, octaves = 4, lacunarity = 2, gain = 0.5): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, y * freq, seed + i * 1013) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

/** Converte texto numa seed numérica (para as seeds escritas pelo jogador). */
export function seedFromText(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
