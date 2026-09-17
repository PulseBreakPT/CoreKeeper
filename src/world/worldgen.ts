/**
 * Geração de The Hollow: oito camadas em anéis à volta do Relé, cada uma com
 * a sua rocha, os seus minérios e as ruínas da civilização que ali morreu.
 */

import { cellRandom, fbm, hash2d } from '../core/rng';
import { Block, Ground } from './tiles';

export const CHUNK = 16;

export const Bioma = {
  Burrows: 0,
  Verdant: 1,
  Foundries: 2,
  GlassDesert: 3,
  Drowned: 4,
  BoneExpanse: 5,
  SilentCity: 6,
  Veil: 7,
} as const;
export type BiomaId = (typeof Bioma)[keyof typeof Bioma];

export interface InfoBioma {
  nome: string;
  subtitulo: string;
  /** Tonalidade aplicada a toda a cena nesta camada. */
  grading: [number, number, number];
  /** Luz ambiente base. */
  ambiente: number;
  /** Partículas suspensas no ar. */
  poeira: { cor: string; densidade: number; deriva: number };
}

export const BIOMAS: Record<number, InfoBioma> = {
  0: {
    nome: 'The Forgotten Burrows', subtitulo: 'Camada I · minas abandonadas',
    grading: [1.02, 0.97, 0.9], ambiente: 0.11,
    poeira: { cor: '#c9a87a', densidade: 0.5, deriva: 0.15 },
  },
  1: {
    nome: 'The Verdant Deep', subtitulo: 'Camada II · a floresta que come pedra',
    grading: [0.92, 1.05, 0.95], ambiente: 0.13,
    poeira: { cor: '#8fffc4', densidade: 0.85, deriva: -0.1 },
  },
  2: {
    nome: 'The Ashen Foundries', subtitulo: 'Camada III · as fábricas ainda trabalham',
    grading: [1.08, 0.94, 0.86], ambiente: 0.12,
    poeira: { cor: '#ffb05c', densidade: 0.7, deriva: 0.3 },
  },
  3: {
    nome: 'The Glass Desert', subtitulo: 'Camada IV · areia que virou vidro',
    grading: [1, 0.99, 1.06], ambiente: 0.16,
    poeira: { cor: '#d9c2ff', densidade: 0.45, deriva: 0.5 },
  },
  4: {
    nome: 'The Drowned Kingdom', subtitulo: 'Camada V · templos debaixo de água',
    grading: [0.86, 0.98, 1.1], ambiente: 0.1,
    poeira: { cor: '#b6ffff', densidade: 0.9, deriva: -0.05 },
  },
  5: {
    nome: 'The Bone Expanse', subtitulo: 'Camada VI · isto não é uma caverna',
    grading: [1.04, 1, 0.92], ambiente: 0.09,
    poeira: { cor: '#ecd9a8', densidade: 0.6, deriva: 0.08 },
  },
  6: {
    nome: 'The Silent City', subtitulo: 'Camada VII · as luzes ficaram acesas',
    grading: [0.9, 0.98, 1.12], ambiente: 0.14,
    poeira: { cor: '#6de0ff', densidade: 0.35, deriva: 0.12 },
  },
  7: {
    nome: 'The Veil', subtitulo: 'Camada VIII · as regras deixam de funcionar',
    grading: [0.95, 0.9, 1.15], ambiente: 0.08,
    poeira: { cor: '#d5a8ff', densidade: 1.1, deriva: 0.2 },
  },
};

/** Raio (em tiles) onde começa cada camada. */
const RAIOS = [0, 90, 190, 300, 420, 550, 690, 840];

export interface SalaEspecial {
  x: number;
  y: number;
  raio: number;
  chefe: string;
  bioma: BiomaId;
}

export function distorcao(wx: number, wy: number, seed: number): number {
  const d = Math.hypot(wx, wy);
  const warp = (fbm(wx * 0.009, wy * 0.009, seed + 77, 3) - 0.5) * 64;
  return Math.max(0, d + warp);
}

export function biomaEm(wx: number, wy: number, seed: number): BiomaId {
  const d = distorcao(wx, wy, seed);
  let b = 0;
  for (let i = RAIOS.length - 1; i >= 0; i--) {
    if (d >= RAIOS[i]) {
      b = i;
      break;
    }
  }
  return b as BiomaId;
}

/** As sete arenas de guardião, fixas para cada seed. */
export function salasEspeciais(seed: number): SalaEspecial[] {
  const defs: { raio: number; chefe: string; bioma: BiomaId; tamanho: number }[] = [
    { raio: 72, chefe: 'goruun', bioma: Bioma.Burrows, tamanho: 12 },
    { raio: 158, chefe: 'myra', bioma: Bioma.Verdant, tamanho: 13 },
    { raio: 262, chefe: 'varkan', bioma: Bioma.Foundries, tamanho: 13 },
    { raio: 372, chefe: 'tempest', bioma: Bioma.GlassDesert, tamanho: 14 },
    { raio: 492, chefe: 'nereth', bioma: Bioma.Drowned, tamanho: 14 },
    { raio: 624, chefe: 'giant', bioma: Bioma.BoneExpanse, tamanho: 16 },
    { raio: 900, chefe: 'bearer_zero', bioma: Bioma.Veil, tamanho: 15 },
  ];
  return defs.map((d, i) => {
    const ang = cellRandom(i * 31 + 7, 13, seed) * Math.PI * 2;
    return {
      x: Math.round(Math.cos(ang) * d.raio),
      y: Math.round(Math.sin(ang) * d.raio),
      raio: d.tamanho,
      chefe: d.chefe,
      bioma: d.bioma,
    };
  });
}

function paredeDoBioma(b: BiomaId, wx: number, wy: number, seed: number): number {
  const r = fbm(wx * 0.08, wy * 0.08, seed + 311, 2);
  switch (b) {
    case Bioma.Burrows:
      if (r > 0.68) return Block.DeepClay;
      if (r < 0.3) return Block.Slatewall;
      return Block.Duststone;
    case Bioma.Verdant:
      if (r > 0.66) return Block.Lumibark;
      if (r < 0.28) return Block.MyceliumBed;
      return Block.Rootmass;
    case Bioma.Foundries:
      if (r > 0.7) return Block.MachinePlate;
      if (r < 0.34) return Block.Slagstone;
      return Block.Forgebrick;
    case Bioma.GlassDesert:
      if (r > 0.74) return Block.Mirrorstone;
      if (r < 0.36) return Block.Shatterglass;
      return Block.StormSand;
    case Bioma.Drowned:
      if (r > 0.7) return Block.PressureGlass;
      if (r < 0.36) return Block.Coralstone;
      return Block.Tidebrick;
    case Bioma.BoneExpanse:
      if (r > 0.74) return Block.NerveCrystal;
      if (r < 0.34) return Block.Marrowstone;
      return Block.Bonewall;
    case Bioma.SilentCity:
      if (r > 0.68) return Block.KaelGlass;
      if (r < 0.3) return Block.Slatewall;
      return Block.KaelWall;
    case Bioma.Veil:
    default:
      if (r > 0.76) return Block.EchoBlock;
      if (r > 0.6) return Block.PhaseGlass;
      if (r < 0.22) return Block.Nullstone;
      return Block.Veilstone;
  }
}

function chaoDoBioma(b: BiomaId, wx: number, wy: number, seed: number): number {
  const liq = fbm(wx * 0.045 + 40, wy * 0.045, seed + 901, 3);
  switch (b) {
    case Bioma.Burrows:
      return fbm(wx * 0.06, wy * 0.06, seed + 121, 2) > 0.62 ? Ground.Ardosia : Ground.Po;
    case Bioma.Verdant:
      return liq > 0.78 ? Ground.Agua : fbm(wx * 0.07, wy * 0.07, seed + 221, 2) > 0.6 ? Ground.Micelio : Ground.Esporo;
    case Bioma.Foundries:
      return liq > 0.8 ? Ground.Fundido : fbm(wx * 0.05, wy * 0.05, seed + 321, 2) > 0.55 ? Ground.Grelha : Ground.Cinza;
    case Bioma.GlassDesert:
      return fbm(wx * 0.055, wy * 0.055, seed + 421, 2) > 0.68 ? Ground.Vidro : Ground.Areia;
    case Bioma.Drowned:
      return liq > 0.55 ? Ground.Agua : Ground.Mare;
    case Bioma.BoneExpanse:
      return Ground.Fossil;
    case Bioma.SilentCity:
      return fbm(wx * 0.05, wy * 0.05, seed + 621, 2) > 0.5 ? Ground.Kael : Ground.Lajes;
    case Bioma.Veil:
    default:
      return Ground.Veu;
  }
}

/** Minério para uma parede, ou 0 se o veio não passar aqui. */
function minerio(b: BiomaId, wx: number, wy: number, seed: number): number {
  const veio = fbm(wx * 0.13, wy * 0.13, seed + 2003, 3);
  if (veio < 0.69) return 0;
  const r = cellRandom(wx, wy, seed + 4001);
  switch (b) {
    case Bioma.Burrows:
      if (r < 0.5) return Block.FerriteOre;
      if (r < 0.92) return Block.TinshadeOre;
      return Block.LivingCrystal;
    case Bioma.Verdant:
      if (r < 0.45) return Block.VerdglassOre;
      if (r < 0.75) return Block.FerriteOre;
      if (r < 0.95) return Block.TinshadeOre;
      return Block.LivingCrystal;
    case Bioma.Foundries:
      if (r < 0.5) return Block.EmberIronOre;
      if (r < 0.85) return Block.KaeliteOre;
      return Block.PaleSilverOre;
    case Bioma.GlassDesert:
      if (r < 0.5) return Block.StormglassOre;
      if (r < 0.85) return Block.PaleSilverOre;
      return Block.LivingCrystal;
    case Bioma.Drowned:
      if (r < 0.6) return Block.AbyssPearlOre;
      if (r < 0.9) return Block.StormglassOre;
      return Block.PaleSilverOre;
    case Bioma.BoneExpanse:
      if (r < 0.7) return Block.OssiumOre;
      if (r < 0.92) return Block.AbyssPearlOre;
      return Block.NerveCrystal;
    case Bioma.SilentCity:
      if (r < 0.55) return Block.KaeliteOre;
      if (r < 0.85) return Block.PaleSilverOre;
      return Block.OssiumOre;
    case Bioma.Veil:
    default:
      if (r < 0.45) return Block.VeilstoneOre;
      if (r < 0.75) return Block.StarshardOre;
      if (r < 0.95) return Block.NullstoneOre;
      return Block.StarshardOre;
  }
}

function decoracao(b: BiomaId, wx: number, wy: number, seed: number): number {
  const r = cellRandom(wx, wy, seed + 6007);
  switch (b) {
    case Bioma.Burrows:
      if (r < 0.02) return Block.Ironroot;
      if (r < 0.05) return Block.Thornvine;
      if (r < 0.07) return Block.Glowmoss;
      return Block.Nenhum;
    case Bioma.Verdant:
      if (r < 0.05) return Block.Ironroot;
      if (r < 0.14) return Block.Thornvine;
      if (r < 0.2) return Block.Sporecap;
      if (r < 0.24) return Block.Glowmoss;
      if (r < 0.25) return Block.AmberSap;
      return Block.Nenhum;
    case Bioma.Foundries:
      if (r < 0.02) return Block.MachinePlate;
      return Block.Nenhum;
    case Bioma.GlassDesert:
      if (r < 0.015) return Block.LivingCrystal;
      return Block.Nenhum;
    case Bioma.Drowned:
      if (r < 0.04) return Block.Glowmoss;
      if (r < 0.06) return Block.Sporecap;
      return Block.Nenhum;
    case Bioma.BoneExpanse:
      if (r < 0.02) return Block.NerveCrystal;
      return Block.Nenhum;
    case Bioma.SilentCity:
      return Block.Nenhum;
    case Bioma.Veil:
    default:
      if (r < 0.02) return Block.EchoBlock;
      return Block.Nenhum;
  }
}

export interface DadosChunk {
  chao: Uint8Array;
  bloco: Uint8Array;
}

/** Densidade de rocha: as camadas fundas são mais fechadas. */
function abertura(b: BiomaId): number {
  switch (b) {
    case Bioma.Burrows:
      return 0.46;
    case Bioma.Verdant:
      return 0.44;
    case Bioma.Foundries:
      return 0.5;
    case Bioma.GlassDesert:
      return 0.52;
    case Bioma.Drowned:
      return 0.48;
    case Bioma.BoneExpanse:
      return 0.5;
    case Bioma.SilentCity:
      return 0.42;
    default:
      return 0.54;
  }
}

export function gerarChunk(cx: number, cy: number, seed: number): DadosChunk {
  const chao = new Uint8Array(CHUNK * CHUNK);
  const bloco = new Uint8Array(CHUNK * CHUNK);
  const salas = salasEspeciais(seed);

  for (let ly = 0; ly < CHUNK; ly++) {
    for (let lx = 0; lx < CHUNK; lx++) {
      const wx = cx * CHUNK + lx;
      const wy = cy * CHUNK + ly;
      const i = ly * CHUNK + lx;
      const b = biomaEm(wx, wy, seed);

      chao[i] = chaoDoBioma(b, wx, wy, seed);

      const caverna = fbm(wx * 0.055, wy * 0.055, seed + 17, 4);
      const tunel = Math.abs(fbm(wx * 0.026, wy * 0.026, seed + 4441, 3) - 0.5) < 0.034;
      // A Silent City tem ruas: corredores rectos em grelha.
      const rua = b === Bioma.SilentCity && (((wx % 14) + 14) % 14 < 3 || ((wy % 14) + 14) % 14 < 3);
      const aberto = caverna > abertura(b) || tunel || rua;

      if (!aberto) {
        const m = minerio(b, wx, wy, seed);
        bloco[i] = m || paredeDoBioma(b, wx, wy, seed);
        if (chao[i] === Ground.Agua || chao[i] === Ground.Fundido) {
          chao[i] = b === Bioma.Foundries ? Ground.Cinza : Ground.Ardosia;
        }
      } else {
        const liquido = chao[i] === Ground.Agua || chao[i] === Ground.Fundido;
        bloco[i] = liquido ? Block.Nenhum : decoracao(b, wx, wy, seed);
      }
    }
  }

  esculpirRele(cx, cy, chao, bloco);
  for (const sala of salas) esculpirArena(cx, cy, chao, bloco, sala, seed);
  return { chao, bloco };
}

/** A câmara onde o Portador acorda. */
function esculpirRele(cx: number, cy: number, chao: Uint8Array, bloco: Uint8Array): void {
  const R = 10;
  if (Math.abs(cx) > 1 || Math.abs(cy) > 1) return;
  for (let ly = 0; ly < CHUNK; ly++) {
    for (let lx = 0; lx < CHUNK; lx++) {
      const wx = cx * CHUNK + lx;
      const wy = cy * CHUNK + ly;
      const d = Math.hypot(wx, wy);
      if (d > R + 2) continue;
      const i = ly * CHUNK + lx;
      if (d <= R) {
        chao[i] = d <= 4 ? Ground.Rele : Ground.Kael;
        bloco[i] = Block.Nenhum;
      }
      if (wx === 0 && wy === 0) bloco[i] = Block.Relay;
      const pilar =
        (Math.abs(wx) === 6 && Math.abs(wy) === 6) ||
        (Math.abs(wx) === 8 && wy === 0) ||
        (wx === 0 && Math.abs(wy) === 8);
      if (pilar && d <= R) bloco[i] = Block.RelayPillar;
      // Três túneis escavados, como diz a lore.
      const ang = Math.atan2(wy, wx);
      const tunel = [0, 2.1, 4.2].some((a) => Math.abs(((ang - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.18);
      if (tunel && d > R - 1 && d <= R + 2) {
        bloco[i] = Block.Nenhum;
        chao[i] = Ground.Lajes;
      }
    }
  }
}

/** Arena de guardião: círculo limpo, anel de pilares e uma entrada. */
function esculpirArena(
  cx: number,
  cy: number,
  chao: Uint8Array,
  bloco: Uint8Array,
  sala: SalaEspecial,
  seed: number,
): void {
  const minX = cx * CHUNK;
  const minY = cy * CHUNK;
  const margem = sala.raio + 3;
  if (
    minX > sala.x + margem || minX + CHUNK < sala.x - margem ||
    minY > sala.y + margem || minY + CHUNK < sala.y - margem
  ) {
    return;
  }
  const anguloEntrada = ((hash2d(sala.x, sala.y, seed) % 628) / 100) - Math.PI;
  for (let ly = 0; ly < CHUNK; ly++) {
    for (let lx = 0; lx < CHUNK; lx++) {
      const wx = minX + lx;
      const wy = minY + ly;
      const d = Math.hypot(wx - sala.x, wy - sala.y);
      const i = ly * CHUNK + lx;
      if (d <= sala.raio) {
        chao[i] = sala.bioma === Bioma.Veil ? Ground.Veu : Ground.Lajes;
        bloco[i] = Block.Nenhum;
        const ang = Math.atan2(wy - sala.y, wx - sala.x);
        let diff = Math.abs(ang - anguloEntrada);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        const anelPilar = d > sala.raio - 2.8 && d < sala.raio - 1.2;
        if (anelPilar && diff > 0.42 && (Math.abs(wx + wy) % 3 === 0)) bloco[i] = Block.RelayPillar;
        // Braseiros no anel: uma arena tem de se ver.
        if (anelPilar && diff > 0.42 && (Math.abs(wx * 3 + wy) % 11 === 0)) bloco[i] = Block.Torch;
      } else if (d <= sala.raio + 2 && bloco[i] === Block.Nenhum) {
        bloco[i] = paredeDoBioma(sala.bioma, wx, wy, seed);
      }
    }
  }
}
