/**
 * Paletas de material de The Hollow Star.
 * Cada material tem cinco tons fixos, o que mantém todo o jogo com a mesma
 * linguagem visual: contorno quase preto, sombra, base, luz e um acento.
 */

export interface Paleta {
  contorno: string;
  escuro: string;
  base: string;
  claro: string;
  acento: string;
}

export function paleta(contorno: string, escuro: string, base: string, claro: string, acento: string): Paleta {
  return { contorno, escuro, base, claro, acento };
}

// --- Rampas com desvio de matiz ----------------------------------------------
// Escurecer uma cor misturando preto dá cinzento morto. O que os artistas de
// pixel art fazem é rodar a matiz enquanto mudam o valor: as sombras vão para
// o lado frio (azul/violeta) e as luzes para o quente (amarelo/laranja). É
// isso que dá a sensação de luz a sério em vez de um degradê.

const MATIZ_SOMBRA = 255; // azul-violeta
const MATIZ_LUZ = 48; // amarelo-laranja

function hexParaHsl(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let matiz: number;
  if (max === r) matiz = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) matiz = ((b - r) / d + 2) / 6;
  else matiz = ((r - g) / d + 4) / 6;
  return [matiz * 360, sat, l];
}

function hslParaHex(matiz: number, sat: number, luz: number): string {
  const h = ((matiz % 360) + 360) % 360 / 360;
  const s = Math.max(0, Math.min(1, sat));
  const l = Math.max(0, Math.min(1, luz));
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const pp = 2 * l - q;
  const canal = (t: number): number => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return pp + (q - pp) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return pp + (q - pp) * (2 / 3 - x) * 6;
    return pp;
  };
  const r = Math.round(canal(h + 1 / 3) * 255);
  const g = Math.round(canal(h) * 255);
  const b = Math.round(canal(h - 1 / 3) * 255);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Roda a matiz na direcção mais curta até um alvo, por uma fracção. */
function rodarMatiz(matiz: number, alvo: number, fracao: number): number {
  let delta = ((alvo - matiz + 540) % 360) - 180;
  return matiz + delta * fracao;
}

/**
 * Constrói uma rampa de cinco tons a partir de uma cor base, com as sombras a
 * cair para o frio e as luzes a subir para o quente.
 */
export function rampa(base: string, acento?: string): Paleta {
  const [h, sat, l] = hexParaHsl(base);
  return {
    contorno: hslParaHex(rodarMatiz(h, MATIZ_SOMBRA, 0.34), Math.min(1, sat * 1.15 + 0.05), l * 0.24),
    escuro: hslParaHex(rodarMatiz(h, MATIZ_SOMBRA, 0.2), Math.min(1, sat * 1.08 + 0.02), l * 0.58),
    base,
    claro: hslParaHex(rodarMatiz(h, MATIZ_LUZ, 0.16), Math.max(0, sat * 0.95), Math.min(0.92, l * 1.32 + 0.06)),
    acento: acento ?? hslParaHex(rodarMatiz(h, MATIZ_LUZ, 0.3), Math.max(0, sat * 0.85), Math.min(0.96, l * 1.6 + 0.16)),
  };
}

/** Rocha e estruturas, por região. */
export const ROCHA = {
  duststone: rampa('#6d4f34'),
  slate: rampa('#454a59'),
  argila: rampa('#7d4c33'),
  raiz: rampa('#5d4320'),
  rootmass: rampa('#415a33'),
  lumibark: rampa('#3a5f45', '#7ce0a8'),
  micelio: rampa('#4e3565', '#c9a2ff'),
  forgebrick: rampa('#5a3226'),
  slag: rampa('#453739'),
  maquina: rampa('#3a464f', '#7d909c'),
  vidro: rampa('#356175', '#9fe4ff'),
  areia: rampa('#857046'),
  espelho: rampa('#43606f', '#d2f2ff'),
  mare: rampa('#1f4759'),
  coral: rampa('#5c3560', '#ff9ec4'),
  osso: rampa('#82786a'),
  medula: rampa('#6d5b5a'),
  kael: rampa('#30414f', '#6de0ff'),
  veil: rampa('#3f2f68', '#b79bff'),
  nulo: rampa('#22222f'),
} as const;

/** Minérios e metais. */
export const MINERAL = {
  ferrite: rampa('#8a6b52'),
  tinshade: rampa('#5e6c78'),
  emberiron: rampa('#a3401a', '#ffb05c'),
  verdglass: rampa('#2c8055', '#8fffc4'),
  palesilver: rampa('#7b8492'),
  kaelite: rampa('#1a6b7a', '#6de0ff'),
  stormglass: rampa('#5a43a0', '#d9c2ff'),
  abysspearl: rampa('#256b78', '#b6ffff'),
  ossium: rampa('#8b7857'),
  veilstone: rampa('#552f92', '#d5a8ff'),
  starshard: rampa('#bd8a13', '#fff3b0'),
  nullstone: rampa('#1d1d29', '#8f8fbf'),
  cristal: rampa('#2a6b8f', '#c8f4ff'),
} as const;

/** Matéria orgânica, comida e efeitos. */
export const ORGANICO = {
  glowfruit: rampa('#7aa62c', '#e8ff9c'),
  emberroot: rampa('#a4501a'),
  spore: rampa('#6f4090', '#dfb3ff'),
  stormberry: rampa('#4a59b0', '#b6c6ff'),
  kelp: rampa('#2a706a'),
  carne: rampa('#9a4c56'),
  caldo: rampa('#957c47'),
  nectar: rampa('#63349e', '#e0b6ff'),
  seiva: rampa('#a3751d'),
} as const;

/** Tons de interface. */
export const UI = {
  vida: paleta('#2a0d10', '#6b1d22', '#a82f34', '#d8494c', '#ff9b95'),
  energia: paleta('#0a1e26', '#12495c', '#1a7a94', '#28b0c9', '#8ff0ff'),
  fome: paleta('#2a1d06', '#6b4a10', '#a37418', '#cf9a2a', '#ffd680'),
  veyra: paleta('#2a2005', '#7a5d0d', '#c29417', '#f2c333', '#fff6c2'),
} as const;

export type NomeRocha = keyof typeof ROCHA;
export type NomeMineral = keyof typeof MINERAL;
