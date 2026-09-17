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

/** Rocha e estruturas, por região. */
export const ROCHA = {
  duststone: paleta('#241811', '#4a3423', '#6d4f34', '#8f6b47', '#b08a5e'),
  slate: paleta('#15161c', '#2c2f3a', '#454a59', '#606675', '#7d8493'),
  argila: paleta('#2b1a12', '#5a3524', '#7d4c33', '#9d6644', '#c08a5f'),
  raiz: paleta('#1d1409', '#3d2a14', '#5d4320', '#7d5c2e', '#a67f45'),
  rootmass: paleta('#131c10', '#2b3d22', '#415a33', '#587a45', '#79a05e'),
  lumibark: paleta('#122019', '#26402f', '#3a5f45', '#4f7d5b', '#7ce0a8'),
  micelio: paleta('#1b1224', '#372448', '#4e3565', '#674a80', '#c9a2ff'),
  forgebrick: paleta('#1a0f0b', '#3b2018', '#5a3226', '#7a4633', '#a05c3f'),
  slag: paleta('#140f11', '#2e2528', '#453739', '#5d4a4c', '#8a6357'),
  maquina: paleta('#0e1114', '#242c33', '#3a464f', '#55646f', '#7d909c'),
  vidro: paleta('#111a20', '#24414f', '#356175', '#4d8ba3', '#9fe4ff'),
  areia: paleta('#2a2317', '#5c4d31', '#857046', '#a68d5b', '#cdb47c'),
  espelho: paleta('#101820', '#2b3d4a', '#43606f', '#5f8698', '#d2f2ff'),
  mare: paleta('#0b161f', '#15303f', '#1f4759', '#2e6478', '#58a3bd'),
  coral: paleta('#1c1020', '#3e2242', '#5c3560', '#7c4a7d', '#ff9ec4'),
  osso: paleta('#231e18', '#564d3f', '#82786a', '#a99e8d', '#ded4c2'),
  medula: paleta('#1f1a1c', '#463a3c', '#6d5b5a', '#8f7b76', '#c0a79c'),
  kael: paleta('#0c1016', '#1e2a36', '#30414f', '#48606f', '#6de0ff'),
  veil: paleta('#150f26', '#2c2049', '#3f2f68', '#574388', '#b79bff'),
  nulo: paleta('#06060a', '#141420', '#22222f', '#333345', '#000000'),
} as const;

/** Minérios e metais. */
export const MINERAL = {
  ferrite: paleta('#241a14', '#5b4436', '#8a6b52', '#b08a6a', '#d9b48f'),
  tinshade: paleta('#151a1f', '#3c4750', '#5e6c78', '#8290a0', '#c2d3e0'),
  emberiron: paleta('#25100a', '#65230f', '#a3401a', '#d4682b', '#ffb05c'),
  verdglass: paleta('#0d2118', '#1d5138', '#2c8055', '#3fb077', '#8fffc4'),
  palesilver: paleta('#1a1d24', '#4b525e', '#7b8492', '#a8b2c0', '#eef3ff'),
  kaelite: paleta('#0a1a20', '#12444f', '#1a6b7a', '#2597ab', '#6de0ff'),
  stormglass: paleta('#1b1530', '#3c2c6b', '#5a43a0', '#7b60d2', '#d9c2ff'),
  abysspearl: paleta('#0d1a22', '#1b4351', '#256b78', '#39a0aa', '#b6ffff'),
  ossium: paleta('#231d16', '#5a4c38', '#8b7857', '#b39c75', '#ecd9a8'),
  veilstone: paleta('#1a1030', '#392060', '#552f92', '#7448c4', '#d5a8ff'),
  starshard: paleta('#2a1d05', '#78550d', '#bd8a13', '#f0bb35', '#fff3b0'),
  nullstone: paleta('#050509', '#111119', '#1d1d29', '#2e2e3f', '#8f8fbf'),
  cristal: paleta('#0f1c26', '#1d4560', '#2a6b8f', '#3e9dc4', '#c8f4ff'),
} as const;

/** Matéria orgânica, comida e efeitos. */
export const ORGANICO = {
  glowfruit: paleta('#1d2a0c', '#4a6b1a', '#7aa62c', '#a6d44a', '#e8ff9c'),
  emberroot: paleta('#2a1206', '#6b2c0d', '#a4501a', '#d4802c', '#ffbd6b'),
  spore: paleta('#241436', '#4a2a63', '#6f4090', '#9260b8', '#dfb3ff'),
  stormberry: paleta('#161a3a', '#2f3a78', '#4a59b0', '#6b7ce0', '#b6c6ff'),
  kelp: paleta('#0c211f', '#1c4a45', '#2a706a', '#3c9a91', '#7fdcd0'),
  carne: paleta('#2a1418', '#67323a', '#9a4c56', '#c0707a', '#e8a8ad'),
  caldo: paleta('#2a2013', '#63502c', '#957c47', '#bfa267', '#e6d29c'),
  nectar: paleta('#1b1030', '#3f2069', '#63349e', '#8a54cc', '#e0b6ff'),
  seiva: paleta('#2b1c06', '#6b4a10', '#a3751d', '#d4a137', '#ffd980'),
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
