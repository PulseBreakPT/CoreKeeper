/**
 * Blocos e chãos de The Hollow. Os índices dos arrays são os ids guardados
 * no mundo, por isso nunca se reordena esta lista — só se acrescenta no fim.
 */

import { MINERAL, ORGANICO, ROCHA, type Paleta } from '../render/paleta';

export interface GroundDef {
  id: number;
  nome: string;
  sprite: string;
  paleta: Paleta;
  /** Multiplicador de velocidade ao caminhar. */
  velocidade: number;
  /** Dano por segundo. */
  dano?: number;
  liquido?: boolean;
  luz?: number;
  corLuz?: [number, number, number];
  /** Quantos frames de animação tem o chão (líquidos). */
  anima?: boolean;
}

export interface BlockDrop {
  item: string;
  min: number;
  max: number;
  chance?: number;
}

export type StationKind = 'bancada' | 'forja' | 'fundicao' | 'fogao' | 'fabricador' | 'capsula' | 'rele';

export interface BlockDef {
  id: number;
  nome: string;
  sprite: string;
  paleta: Paleta;
  solido: boolean;
  minavel: boolean;
  /** Nível mínimo de ferramenta. */
  nivel: number;
  /** Pontos de estrutura. */
  dureza: number;
  drops: BlockDrop[];
  luz?: number;
  corLuz?: [number, number, number];
  estacao?: StationKind;
  /** Blocos altos: recebem auto-tiling e projectam sombra. */
  parede?: boolean;
  invulneravel?: boolean;
  /** Descrição que aparece ao mineirar pela primeira vez. */
  lore?: string;
}

export const Ground = {
  Po: 0,
  Ardosia: 1,
  Esporo: 2,
  Micelio: 3,
  Grelha: 4,
  Cinza: 5,
  Areia: 6,
  Vidro: 7,
  Mare: 8,
  Agua: 9,
  Fundido: 10,
  Fossil: 11,
  Kael: 12,
  Veu: 13,
  Lajes: 14,
  Rele: 15,
} as const;

const AMBAR: [number, number, number] = [1, 0.72, 0.38];
const CIANO: [number, number, number] = [0.42, 0.88, 1];
const VERDE: [number, number, number] = [0.49, 0.88, 0.66];
const VIOLETA: [number, number, number] = [0.72, 0.6, 1];
const OURO: [number, number, number] = [1, 0.82, 0.35];

export const GROUNDS: GroundDef[] = [
  { id: 0, nome: 'Pó de caverna', sprite: 'g_po', paleta: ROCHA.duststone, velocidade: 1 },
  { id: 1, nome: 'Ardósia', sprite: 'g_ardosia', paleta: ROCHA.slate, velocidade: 1 },
  { id: 2, nome: 'Solo de esporos', sprite: 'g_esporo', paleta: ROCHA.rootmass, velocidade: 1 },
  { id: 3, nome: 'Leito de micélio', sprite: 'g_micelio', paleta: ROCHA.micelio, velocidade: 1.06, luz: 0.12, corLuz: VIOLETA },
  { id: 4, nome: 'Grelha industrial', sprite: 'g_grelha', paleta: ROCHA.maquina, velocidade: 1.08 },
  { id: 5, nome: 'Escória', sprite: 'g_cinza', paleta: ROCHA.slag, velocidade: 0.94 },
  { id: 6, nome: 'Areia de tempestade', sprite: 'g_areia', paleta: ROCHA.areia, velocidade: 0.86 },
  { id: 7, nome: 'Vidro estilhaçado', sprite: 'g_vidro', paleta: ROCHA.vidro, velocidade: 1, dano: 1.5 },
  { id: 8, nome: 'Pedra de maré', sprite: 'g_mare', paleta: ROCHA.mare, velocidade: 0.96 },
  { id: 9, nome: 'Água profunda', sprite: 'g_agua', paleta: ROCHA.mare, velocidade: 0.55, liquido: true, anima: true },
  {
    id: 10, nome: 'Canal fundido', sprite: 'g_fundido', paleta: MINERAL.emberiron, velocidade: 0.5,
    dano: 16, liquido: true, luz: 0.9, corLuz: AMBAR, anima: true,
  },
  { id: 11, nome: 'Cinza fóssil', sprite: 'g_fossil', paleta: ROCHA.osso, velocidade: 1 },
  { id: 12, nome: 'Placa Kael', sprite: 'g_kael', paleta: ROCHA.kael, velocidade: 1.12, luz: 0.16, corLuz: CIANO },
  { id: 13, nome: 'Piso do Véu', sprite: 'g_veu', paleta: ROCHA.veil, velocidade: 1.05, luz: 0.14, corLuz: VIOLETA },
  { id: 14, nome: 'Lajes', sprite: 'g_lajes', paleta: ROCHA.slate, velocidade: 1.12 },
  { id: 15, nome: 'Piso do Relé', sprite: 'g_rele', paleta: ROCHA.nulo, velocidade: 1.12, luz: 0.2, corLuz: OURO },
];

export const Block = {
  Nenhum: 0,
  // Paredes naturais
  Duststone: 1,
  Slatewall: 2,
  DeepClay: 3,
  Ironroot: 4,
  Rootmass: 5,
  Lumibark: 6,
  MyceliumBed: 7,
  Forgebrick: 8,
  Slagstone: 9,
  MachinePlate: 10,
  Shatterglass: 11,
  StormSand: 12,
  Mirrorstone: 13,
  Tidebrick: 14,
  Coralstone: 15,
  PressureGlass: 16,
  Bonewall: 17,
  Marrowstone: 18,
  NerveCrystal: 19,
  KaelWall: 20,
  KaelGlass: 21,
  Veilstone: 22,
  PhaseGlass: 23,
  EchoBlock: 24,
  Nullstone: 25,
  // Minérios
  FerriteOre: 26,
  TinshadeOre: 27,
  VerdglassOre: 28,
  EmberIronOre: 29,
  KaeliteOre: 30,
  PaleSilverOre: 31,
  StormglassOre: 32,
  AbyssPearlOre: 33,
  OssiumOre: 34,
  VeilstoneOre: 35,
  StarshardOre: 36,
  NullstoneOre: 37,
  LivingCrystal: 38,
  // Flora
  Glowmoss: 39,
  Sporecap: 40,
  Thornvine: 41,
  AmberSap: 42,
  // Construções
  Torch: 43,
  GlowLamp: 44,
  StormLamp: 45,
  StarBeacon: 46,
  Workbench: 47,
  Forge: 48,
  Foundry: 49,
  Hearth: 50,
  Fabricator: 51,
  Cot: 52,
  Relay: 53,
  RelayPillar: 54,
  PlankWall: 55,
  BrickWall: 56,
} as const;

function parede(
  id: number,
  nome: string,
  sprite: string,
  paleta: Paleta,
  nivel: number,
  dureza: number,
  drops: BlockDrop[],
  extra: Partial<BlockDef> = {},
): BlockDef {
  return { id, nome, sprite, paleta, solido: true, minavel: true, nivel, dureza, drops, parede: true, ...extra };
}

export const BLOCKS: BlockDef[] = [
  { id: 0, nome: '—', sprite: '', paleta: ROCHA.slate, solido: false, minavel: false, nivel: 0, dureza: 0, drops: [] },

  parede(1, 'Duststone', 'b_duststone', ROCHA.duststone, 1, 26, [{ item: 'duststone', min: 1, max: 2 }], {
    lore: 'Rocha castanha quebradiça. As Burrows são feitas dela.',
  }),
  parede(2, 'Slatewall', 'b_slate', ROCHA.slate, 2, 52, [{ item: 'slate', min: 1, max: 2 }]),
  parede(3, 'Argila profunda', 'b_argila', ROCHA.argila, 1, 32, [{ item: 'deepclay', min: 1, max: 3 }]),
  parede(4, 'Ironroot', 'b_ironroot', ROCHA.raiz, 1, 36, [
    { item: 'ironroot', min: 2, max: 4 },
    { item: 'fibra', min: 1, max: 2, chance: 0.4 },
  ], { lore: 'Raízes fossilizadas atravessam a pedra. Ainda cheiram a seiva.' }),
  parede(5, 'Rootmass', 'b_rootmass', ROCHA.rootmass, 2, 44, [
    { item: 'ironroot', min: 1, max: 2 },
    { item: 'fibra', min: 2, max: 4 },
  ]),
  parede(6, 'Lumibark', 'b_lumibark', ROCHA.lumibark, 2, 38, [{ item: 'lumibark', min: 2, max: 4 }], {
    luz: 0.35, corLuz: VERDE,
  }),
  parede(7, 'Leito de micélio', 'b_micelio', ROCHA.micelio, 1, 24, [
    { item: 'micelio', min: 1, max: 3 },
    { item: 'sporecap', min: 1, max: 1, chance: 0.3 },
  ], { luz: 0.2, corLuz: VIOLETA }),
  parede(8, 'Forgebrick', 'b_forgebrick', ROCHA.forgebrick, 3, 82, [{ item: 'forgebrick', min: 1, max: 2 }], {
    lore: 'Tijolo industrial Kael. Aguentou mil anos de fornalha.',
  }),
  parede(9, 'Slagstone', 'b_slagstone', ROCHA.slag, 3, 74, [
    { item: 'slag', min: 1, max: 2 },
    { item: 'minerio_emberiron', min: 1, max: 1, chance: 0.15 },
  ]),
  parede(10, 'Chapa de máquina', 'b_machineplate', ROCHA.maquina, 3, 70, [{ item: 'machineplate', min: 1, max: 2 }], {
    luz: 0.15, corLuz: CIANO,
  }),
  parede(11, 'Shatterglass', 'b_shatterglass', ROCHA.vidro, 3, 58, [{ item: 'shatterglass', min: 1, max: 3 }]),
  parede(12, 'Areia compacta', 'b_stormsand', ROCHA.areia, 3, 50, [{ item: 'stormsand', min: 1, max: 3 }]),
  parede(13, 'Mirrorstone', 'b_mirrorstone', ROCHA.espelho, 4, 88, [{ item: 'mirrorstone', min: 1, max: 2 }], {
    lore: 'Reflecte luz e alguns projécteis energéticos.',
  }),
  parede(14, 'Tidebrick', 'b_tidebrick', ROCHA.mare, 4, 84, [{ item: 'tidebrick', min: 1, max: 2 }]),
  parede(15, 'Coralstone', 'b_coralstone', ROCHA.coral, 4, 72, [
    { item: 'coralstone', min: 1, max: 2 },
    { item: 'abysskelp', min: 1, max: 1, chance: 0.25 },
  ]),
  parede(16, 'Vidro de pressão', 'b_pressureglass', ROCHA.mare, 4, 96, [{ item: 'pressureglass', min: 1, max: 2 }], {
    luz: 0.2, corLuz: CIANO,
  }),
  parede(17, 'Bonewall', 'b_bonewall', ROCHA.osso, 5, 100, [{ item: 'bonewall', min: 1, max: 2 }], {
    lore: 'Não é uma caverna. É uma costela.',
  }),
  parede(18, 'Marrowstone', 'b_marrowstone', ROCHA.medula, 5, 116, [{ item: 'marrowstone', min: 1, max: 2 }]),
  parede(19, 'Cristal nervoso', 'b_nervecrystal', MINERAL.abysspearl, 5, 86, [
    { item: 'nervecrystal', min: 1, max: 2 },
  ], { luz: 0.5, corLuz: CIANO, lore: 'Alguns ainda reagem ao movimento.' }),
  parede(20, 'Muro Kael', 'b_kaelwall', ROCHA.kael, 4, 92, [{ item: 'machineplate', min: 1, max: 2 }], {
    luz: 0.18, corLuz: CIANO,
  }),
  parede(21, 'Vidro Kael', 'b_kaelglass', ROCHA.kael, 4, 74, [{ item: 'pressureglass', min: 1, max: 1 }], {
    luz: 0.3, corLuz: CIANO,
  }),
  parede(22, 'Veilstone', 'b_veilstone', ROCHA.veil, 6, 148, [{ item: 'veilstone', min: 1, max: 2 }], {
    luz: 0.16, corLuz: VIOLETA,
  }),
  parede(23, 'Phase Glass', 'b_phaseglass', ROCHA.veil, 6, 126, [{ item: 'phaseglass', min: 1, max: 2 }], {
    luz: 0.35, corLuz: VIOLETA,
  }),
  parede(24, 'Echo Block', 'b_echoblock', ROCHA.veil, 6, 118, [{ item: 'echoblock', min: 1, max: 1 }], {
    luz: 0.4, corLuz: VIOLETA, lore: 'Repete sons que já ninguém se lembra de ter feito.',
  }),
  parede(25, 'Nullstone', 'b_nullstone', ROCHA.nulo, 7, 200, [{ item: 'nullstone', min: 1, max: 2 }], {
    lore: 'Os Architects não deixaram corpos. Só isto.',
  }),

  // --- Minérios ---
  parede(26, 'Veio de Ferrite', 'b_ferrite', MINERAL.ferrite, 1, 50, [{ item: 'minerio_ferrite', min: 2, max: 4 }], {
    luz: 0.08, corLuz: AMBAR,
  }),
  parede(27, 'Veio de Tinshade', 'b_tinshade', MINERAL.tinshade, 1, 54, [{ item: 'minerio_tinshade', min: 2, max: 4 }], {
    luz: 0.08, corLuz: CIANO,
  }),
  parede(28, 'Veio de Verdglass', 'b_verdglass', MINERAL.verdglass, 2, 68, [{ item: 'minerio_verdglass', min: 2, max: 3 }], {
    luz: 0.3, corLuz: VERDE,
  }),
  parede(29, 'Veio de Ember Iron', 'b_emberiron', MINERAL.emberiron, 2, 82, [{ item: 'minerio_emberiron', min: 2, max: 4 }], {
    luz: 0.32, corLuz: AMBAR,
  }),
  parede(30, 'Veio de Kaelite', 'b_kaelite', MINERAL.kaelite, 3, 100, [{ item: 'minerio_kaelite', min: 2, max: 3 }], {
    luz: 0.34, corLuz: CIANO,
  }),
  parede(31, 'Veio de Pale Silver', 'b_palesilver', MINERAL.palesilver, 3, 96, [{ item: 'minerio_palesilver', min: 2, max: 3 }], {
    luz: 0.18, corLuz: CIANO,
  }),
  parede(32, 'Veio de Stormglass', 'b_stormglass', MINERAL.stormglass, 4, 118, [{ item: 'minerio_stormglass', min: 2, max: 3 }], {
    luz: 0.38, corLuz: VIOLETA,
  }),
  parede(33, 'Veio de Abyss Pearl', 'b_abysspearl', MINERAL.abysspearl, 4, 124, [{ item: 'minerio_abysspearl', min: 1, max: 3 }], {
    luz: 0.36, corLuz: CIANO,
  }),
  parede(34, 'Veio de Ossium', 'b_ossium', MINERAL.ossium, 5, 138, [{ item: 'minerio_ossium', min: 2, max: 3 }], {
    luz: 0.12, corLuz: OURO,
  }),
  parede(35, 'Veio de Veilstone', 'b_veilstoneore', MINERAL.veilstone, 6, 158, [{ item: 'minerio_veilore', min: 2, max: 3 }], {
    luz: 0.4, corLuz: VIOLETA,
  }),
  parede(36, 'Starshard', 'b_starshard', MINERAL.starshard, 6, 176, [{ item: 'starshard', min: 1, max: 2 }], {
    luz: 0.55, corLuz: OURO, lore: 'Um caco de Veyra. Ainda está quente.',
  }),
  parede(37, 'Veio de Nullstone', 'b_nullstoneore', MINERAL.nullstone, 7, 210, [{ item: 'nullstone', min: 1, max: 2 }]),
  parede(38, 'Cristal vivo', 'b_livingcrystal', MINERAL.cristal, 2, 70, [{ item: 'livingcrystal', min: 1, max: 2 }], {
    luz: 0.6, corLuz: CIANO,
  }),

  // --- Flora ---
  {
    id: 39, nome: 'Glowmoss', sprite: 'b_glowmoss', paleta: ROCHA.lumibark, solido: false, minavel: true,
    nivel: 1, dureza: 4, drops: [{ item: 'glowmoss', min: 1, max: 2 }], luz: 0.4, corLuz: VERDE,
  },
  {
    id: 40, nome: 'Sporecap', sprite: 'b_sporecap', paleta: ORGANICO.spore, solido: false, minavel: true,
    nivel: 1, dureza: 5, drops: [{ item: 'sporecap', min: 1, max: 2 }], luz: 0.28, corLuz: VIOLETA,
  },
  {
    id: 41, nome: 'Thornvine', sprite: 'b_thornvine', paleta: ROCHA.rootmass, solido: false, minavel: true,
    nivel: 1, dureza: 4, drops: [{ item: 'fibra', min: 1, max: 3 }],
  },
  {
    id: 42, nome: 'Amber Sap', sprite: 'b_ambersap', paleta: ORGANICO.seiva, solido: true, minavel: true,
    nivel: 2, dureza: 40, drops: [{ item: 'ambersap', min: 1, max: 3 }], luz: 0.25, corLuz: AMBAR, parede: true,
  },

  // --- Construções ---
  {
    id: 43, nome: 'Tocha', sprite: 'b_torch', paleta: ORGANICO.emberroot, solido: false, minavel: true,
    nivel: 1, dureza: 3, drops: [{ item: 'torch', min: 1, max: 1 }], luz: 1, corLuz: AMBAR,
  },
  {
    id: 44, nome: 'Lâmpada de Glowmoss', sprite: 'b_glowlamp', paleta: ROCHA.lumibark, solido: false, minavel: true,
    nivel: 1, dureza: 8, drops: [{ item: 'glowlamp', min: 1, max: 1 }], luz: 1.15, corLuz: VERDE,
  },
  {
    id: 45, nome: 'Lâmpada de Stormglass', sprite: 'b_stormlamp', paleta: MINERAL.stormglass, solido: false, minavel: true,
    nivel: 1, dureza: 10, drops: [{ item: 'stormlamp', min: 1, max: 1 }], luz: 1.3, corLuz: VIOLETA,
  },
  {
    id: 46, nome: 'Farol Estelar', sprite: 'b_starbeacon', paleta: MINERAL.starshard, solido: false, minavel: true,
    nivel: 1, dureza: 14, drops: [{ item: 'starbeacon', min: 1, max: 1 }], luz: 1.6, corLuz: OURO,
  },
  {
    id: 47, nome: 'Bancada', sprite: 'b_workbench', paleta: ROCHA.raiz, solido: true, minavel: true,
    nivel: 1, dureza: 18, drops: [{ item: 'workbench', min: 1, max: 1 }], estacao: 'bancada',
  },
  {
    id: 48, nome: 'Forja', sprite: 'b_forge', paleta: ROCHA.forgebrick, solido: true, minavel: true,
    nivel: 1, dureza: 28, drops: [{ item: 'forge', min: 1, max: 1 }], estacao: 'forja', luz: 0.8, corLuz: AMBAR,
  },
  {
    id: 49, nome: 'Fundição de Arco', sprite: 'b_foundry', paleta: ROCHA.maquina, solido: true, minavel: true,
    nivel: 1, dureza: 30, drops: [{ item: 'foundry', min: 1, max: 1 }], estacao: 'fundicao', luz: 0.45, corLuz: VIOLETA,
  },
  {
    id: 50, nome: 'Lareira de cozinha', sprite: 'b_hearth', paleta: ROCHA.slate, solido: true, minavel: true,
    nivel: 1, dureza: 22, drops: [{ item: 'hearth', min: 1, max: 1 }], estacao: 'fogao', luz: 0.6, corLuz: AMBAR,
  },
  {
    id: 51, nome: 'Fabricador Kael', sprite: 'b_fabricator', paleta: ROCHA.kael, solido: true, minavel: true,
    nivel: 1, dureza: 38, drops: [{ item: 'fabricator', min: 1, max: 1 }], estacao: 'fabricador', luz: 0.7, corLuz: CIANO,
  },
  {
    id: 52, nome: 'Cápsula de Portador', sprite: 'b_cot', paleta: ROCHA.maquina, solido: false, minavel: true,
    nivel: 1, dureza: 16, drops: [{ item: 'cot', min: 1, max: 1 }], estacao: 'capsula', luz: 0.4, corLuz: CIANO,
  },
  {
    id: 53, nome: 'Relé dos Architects', sprite: 'b_relay', paleta: MINERAL.starshard, solido: true, minavel: false,
    nivel: 9, dureza: 99999, drops: [], estacao: 'rele', luz: 1.2, corLuz: OURO, invulneravel: true,
    lore: 'Portador identificado.',
  },
  {
    id: 54, nome: 'Pilar do Relé', sprite: 'b_relaypillar', paleta: ROCHA.nulo, solido: true, minavel: false,
    nivel: 9, dureza: 99999, drops: [], parede: true, luz: 0.35, corLuz: OURO, invulneravel: true,
  },
  parede(55, 'Parede de Lumibark', 'b_plankwall', ROCHA.lumibark, 1, 22, [{ item: 'plankwall', min: 1, max: 1 }], {
    luz: 0.1, corLuz: VERDE,
  }),
  parede(56, 'Parede de Forgebrick', 'b_brickwall', ROCHA.forgebrick, 1, 36, [{ item: 'brickwall', min: 1, max: 1 }]),
];

export function blockDef(id: number): BlockDef {
  return BLOCKS[id] ?? BLOCKS[0];
}

export function groundDef(id: number): GroundDef {
  return GROUNDS[id] ?? GROUNDS[0];
}

export function isSolid(id: number): boolean {
  return blockDef(id).solido;
}

/** Blocos que o auto-tiling deve tratar como "mesma família" ao ligar arestas. */
export function ehParede(id: number): boolean {
  return blockDef(id).parede === true;
}
