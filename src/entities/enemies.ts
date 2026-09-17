/**
 * O bestiário de The Hollow. Cada camada tem a sua fauna, e as criaturas
 * partilham comportamentos parametrizados em vez de IA copiada.
 */

import { MINERAL, ORGANICO, ROCHA, type Paleta } from '../render/paleta';
import { linhaLivre, mover, type CorpoMovel } from './fisica';
import type { World } from '../world/world';

export type Comportamento =
  | 'perseguir'
  | 'saltar'
  | 'atirador'
  | 'fixo'
  | 'emboscada'
  | 'passivo'
  | 'fase'
  | 'observador'
  | 'chefe_verme'
  | 'chefe_colonia'
  | 'chefe_forja'
  | 'chefe_serpente'
  | 'chefe_oraculo'
  | 'chefe_gigante'
  | 'chefe_portador';

export type FormaCriatura =
  | 'larva' | 'limo' | 'verme' | 'esporo' | 'besouro' | 'aracnideo' | 'humanoide'
  | 'maquina' | 'cao' | 'peixe' | 'enguia' | 'concha' | 'serpente' | 'flor'
  | 'espectro' | 'olho' | 'cristal' | 'gigante' | 'portador' | 'boca';

export interface QuedaInimigo {
  item: string;
  min: number;
  max: number;
  chance: number;
}

export interface InimigoDef {
  id: string;
  nome: string;
  vida: number;
  dano: number;
  velocidade: number;
  raio: number;
  forma: FormaCriatura;
  paleta: Paleta;
  comportamento: Comportamento;
  visao: number;
  chefe?: boolean;
  /** Reduz o dano recebido (armadura natural). */
  armadura?: number;
  /** Brilho próprio, em tiles. */
  luz?: number;
  /** Rebenta ao morrer. */
  explode?: number;
  quedas: QuedaInimigo[];
  lore?: string;
}

function def(d: InimigoDef): InimigoDef {
  return d;
}

export const INIMIGOS: Record<string, InimigoDef> = {
  // --- The Forgotten Burrows ---
  grubjaw: def({
    id: 'grubjaw', nome: 'Grubjaw', vida: 24, dano: 7, velocidade: 2.3, raio: 0.3, forma: 'larva',
    paleta: ORGANICO.carne, comportamento: 'perseguir', visao: 7,
    quedas: [{ item: 'carne_crua', min: 1, max: 2, chance: 0.7 }, { item: 'fibra', min: 1, max: 2, chance: 0.3 }],
    lore: 'Vive dentro da pedra. Sai quando te ouve a picar.',
  }),
  dustling: def({
    id: 'dustling', nome: 'Dustling', vida: 18, dano: 6, velocidade: 2.7, raio: 0.3, forma: 'limo',
    paleta: ROCHA.duststone, comportamento: 'saltar', visao: 8,
    quedas: [{ item: 'duststone', min: 1, max: 2, chance: 0.8 }],
    lore: 'Pedra e fungo agarrados um ao outro. Divide-se quando morre.',
  }),
  tunnel_maw: def({
    id: 'tunnel_maw', nome: 'Tunnel Maw', vida: 46, dano: 16, velocidade: 3.4, raio: 0.42, forma: 'boca',
    paleta: ROCHA.argila, comportamento: 'emboscada', visao: 9,
    quedas: [{ item: 'carne_crua', min: 2, max: 3, chance: 0.8 }, { item: 'minerio_ferrite', min: 1, max: 2, chance: 0.3 }],
    lore: 'O chão treme antes de ele aparecer.',
  }),
  lantern_tick: def({
    id: 'lantern_tick', nome: 'Lantern Tick', vida: 14, dano: 3, velocidade: 2, raio: 0.26, forma: 'besouro',
    paleta: ORGANICO.glowfruit, comportamento: 'passivo', visao: 6, luz: 0.7,
    quedas: [{ item: 'glowmoss', min: 1, max: 2, chance: 0.9 }],
    lore: 'Passivo — até se assustar e chamar a vizinhança toda.',
  }),
  stoneback: def({
    id: 'stoneback', nome: 'Stoneback', vida: 70, dano: 12, velocidade: 1.5, raio: 0.42, forma: 'besouro',
    paleta: ROCHA.slate, comportamento: 'perseguir', visao: 7, armadura: 6,
    quedas: [{ item: 'slate', min: 2, max: 4, chance: 0.9 }, { item: 'minerio_tinshade', min: 1, max: 2, chance: 0.3 }],
    lore: 'Placas minerais à frente. Por trás é só carne.',
  }),

  // --- The Verdant Deep ---
  sporekin: def({
    id: 'sporekin', nome: 'Sporekin', vida: 52, dano: 13, velocidade: 2.2, raio: 0.34, forma: 'humanoide',
    paleta: ORGANICO.spore, comportamento: 'perseguir', visao: 9, luz: 0.25,
    quedas: [{ item: 'sporecap', min: 1, max: 3, chance: 0.8 }, { item: 'micelio', min: 1, max: 2, chance: 0.5 }],
  }),
  vine_stalker: def({
    id: 'vine_stalker', nome: 'Vine Stalker', vida: 58, dano: 18, velocidade: 3.6, raio: 0.34, forma: 'humanoide',
    paleta: ROCHA.rootmass, comportamento: 'emboscada', visao: 8,
    quedas: [{ item: 'fibra', min: 2, max: 4, chance: 0.9 }, { item: 'ambersap', min: 1, max: 1, chance: 0.3 }],
    lore: 'Parece vegetação normal. Até deixar de parecer.',
  }),
  bloom_maw: def({
    id: 'bloom_maw', nome: 'Bloom Maw', vida: 64, dano: 15, velocidade: 0, raio: 0.45, forma: 'flor',
    paleta: ORGANICO.nectar, comportamento: 'fixo', visao: 11,
    quedas: [{ item: 'sporecap', min: 2, max: 3, chance: 0.9 }, { item: 'glowfruit', min: 1, max: 2, chance: 0.4 }],
  }),
  root_walker: def({
    id: 'root_walker', nome: 'Root Walker', vida: 96, dano: 17, velocidade: 1.8, raio: 0.46, forma: 'humanoide',
    paleta: ROCHA.raiz, comportamento: 'perseguir', visao: 8, armadura: 4,
    quedas: [{ item: 'ironroot', min: 2, max: 4, chance: 0.9 }, { item: 'lumibark', min: 1, max: 2, chance: 0.4 }],
    lore: 'Reconstrói-se se ficar em solo fértil.',
  }),
  glowhorn: def({
    id: 'glowhorn', nome: 'Glowhorn', vida: 44, dano: 10, velocidade: 3, raio: 0.4, forma: 'larva',
    paleta: ORGANICO.glowfruit, comportamento: 'passivo', visao: 8, luz: 0.5,
    quedas: [{ item: 'carne_crua', min: 2, max: 3, chance: 0.9 }, { item: 'glowfruit', min: 1, max: 2, chance: 0.5 }],
  }),

  // --- The Ashen Foundries ---
  furnace_drone: def({
    id: 'furnace_drone', nome: 'Furnace Drone', vida: 68, dano: 16, velocidade: 2.4, raio: 0.34, forma: 'maquina',
    paleta: ROCHA.maquina, comportamento: 'perseguir', visao: 9, luz: 0.3,
    quedas: [{ item: 'machineplate', min: 1, max: 2, chance: 0.7 }, { item: 'minerio_kaelite', min: 1, max: 1, chance: 0.2 }],
    lore: 'Continua a cumprir protocolos de uma fábrica que já ninguém gere.',
  }),
  scrap_hound: def({
    id: 'scrap_hound', nome: 'Scrap Hound', vida: 54, dano: 14, velocidade: 4.2, raio: 0.32, forma: 'cao',
    paleta: MINERAL.ferrite, comportamento: 'perseguir', visao: 11,
    quedas: [{ item: 'machineplate', min: 1, max: 2, chance: 0.5 }, { item: 'minerio_emberiron', min: 1, max: 2, chance: 0.4 }],
    lore: 'Anda a recolher metal. O teu também serve.',
  }),
  forge_sentinel: def({
    id: 'forge_sentinel', nome: 'Forge Sentinel', vida: 130, dano: 24, velocidade: 1.9, raio: 0.46, forma: 'maquina',
    paleta: MINERAL.emberiron, comportamento: 'perseguir', visao: 10, armadura: 10, luz: 0.4,
    quedas: [{ item: 'barra_emberiron', min: 1, max: 2, chance: 0.6 }, { item: 'machineplate', min: 2, max: 3, chance: 0.8 }],
  }),
  smelter: def({
    id: 'smelter', nome: 'Smelter', vida: 88, dano: 22, velocidade: 1.6, raio: 0.42, forma: 'maquina',
    paleta: MINERAL.emberiron, comportamento: 'atirador', visao: 12, luz: 0.6,
    quedas: [{ item: 'slag', min: 2, max: 4, chance: 0.9 }, { item: 'minerio_emberiron', min: 1, max: 3, chance: 0.5 }],
  }),
  chain_walker: def({
    id: 'chain_walker', nome: 'Chain Walker', vida: 150, dano: 26, velocidade: 1.7, raio: 0.5, forma: 'maquina',
    paleta: ROCHA.slag, comportamento: 'perseguir', visao: 10, armadura: 8,
    quedas: [{ item: 'machineplate', min: 2, max: 4, chance: 0.9 }, { item: 'barra_kaelite', min: 1, max: 1, chance: 0.3 }],
  }),

  // --- The Glass Desert ---
  glasscrawler: def({
    id: 'glasscrawler', nome: 'Glasscrawler', vida: 84, dano: 20, velocidade: 3.2, raio: 0.34, forma: 'aracnideo',
    paleta: ROCHA.vidro, comportamento: 'emboscada', visao: 9,
    quedas: [{ item: 'shatterglass', min: 2, max: 4, chance: 0.9 }],
  }),
  storm_beetle: def({
    id: 'storm_beetle', nome: 'Storm Beetle', vida: 72, dano: 18, velocidade: 2.8, raio: 0.36, forma: 'besouro',
    paleta: MINERAL.stormglass, comportamento: 'perseguir', visao: 10, luz: 0.45, explode: 26,
    quedas: [{ item: 'minerio_stormglass', min: 1, max: 2, chance: 0.6 }, { item: 'stormsand', min: 1, max: 3, chance: 0.5 }],
    lore: 'Guarda a carga no casco. Rebenta com ela.',
  }),
  sand_wraith: def({
    id: 'sand_wraith', nome: 'Sand Wraith', vida: 96, dano: 22, velocidade: 3.4, raio: 0.38, forma: 'espectro',
    paleta: ROCHA.areia, comportamento: 'fase', visao: 12, luz: 0.3,
    quedas: [{ item: 'stormsand', min: 2, max: 4, chance: 0.9 }, { item: 'minerio_palesilver', min: 1, max: 2, chance: 0.3 }],
  }),
  prism_serpent: def({
    id: 'prism_serpent', nome: 'Prism Serpent', vida: 120, dano: 26, velocidade: 3, raio: 0.44, forma: 'serpente',
    paleta: ROCHA.espelho, comportamento: 'atirador', visao: 13, armadura: 6, luz: 0.35,
    quedas: [{ item: 'mirrorstone', min: 1, max: 3, chance: 0.8 }, { item: 'livingcrystal', min: 1, max: 1, chance: 0.3 }],
  }),

  // --- The Drowned Kingdom ---
  murkfin: def({
    id: 'murkfin', nome: 'Murkfin', vida: 92, dano: 24, velocidade: 4.4, raio: 0.34, forma: 'peixe',
    paleta: ROCHA.mare, comportamento: 'perseguir', visao: 11,
    quedas: [{ item: 'carne_crua', min: 2, max: 3, chance: 0.8 }],
  }),
  shellwarden: def({
    id: 'shellwarden', nome: 'Shellwarden', vida: 190, dano: 28, velocidade: 1.8, raio: 0.5, forma: 'concha',
    paleta: ROCHA.coral, comportamento: 'perseguir', visao: 9, armadura: 14,
    quedas: [{ item: 'coralstone', min: 2, max: 4, chance: 0.9 }, { item: 'minerio_abysspearl', min: 1, max: 2, chance: 0.4 }],
  }),
  lantern_eel: def({
    id: 'lantern_eel', nome: 'Lantern Eel', vida: 110, dano: 26, velocidade: 3.6, raio: 0.36, forma: 'enguia',
    paleta: MINERAL.abysspearl, comportamento: 'atirador', visao: 12, luz: 0.7,
    quedas: [{ item: 'minerio_abysspearl', min: 1, max: 3, chance: 0.7 }, { item: 'abysskelp', min: 1, max: 2, chance: 0.5 }],
  }),
  abyss_mouth: def({
    id: 'abyss_mouth', nome: 'Abyss Mouth', vida: 160, dano: 40, velocidade: 0, raio: 0.6, forma: 'boca',
    paleta: ROCHA.nulo, comportamento: 'emboscada', visao: 4,
    quedas: [{ item: 'minerio_abysspearl', min: 2, max: 4, chance: 0.9 }, { item: 'pressureglass', min: 1, max: 2, chance: 0.4 }],
    lore: 'Parece só um buraco escuro no fundo. Não é.',
  }),

  // --- The Bone Expanse ---
  marrow_crawler: def({
    id: 'marrow_crawler', nome: 'Marrow Crawler', vida: 130, dano: 30, velocidade: 3.4, raio: 0.36, forma: 'aracnideo',
    paleta: ROCHA.medula, comportamento: 'perseguir', visao: 10,
    quedas: [{ item: 'marrowstone', min: 1, max: 3, chance: 0.8 }, { item: 'minerio_ossium', min: 1, max: 2, chance: 0.4 }],
  }),
  bone_weaver: def({
    id: 'bone_weaver', nome: 'Bone Weaver', vida: 150, dano: 28, velocidade: 2.6, raio: 0.44, forma: 'aracnideo',
    paleta: ROCHA.osso, comportamento: 'atirador', visao: 12, armadura: 8,
    quedas: [{ item: 'bonewall', min: 2, max: 4, chance: 0.9 }, { item: 'minerio_ossium', min: 1, max: 3, chance: 0.5 }],
  }),
  pale_hunger: def({
    id: 'pale_hunger', nome: 'Pale Hunger', vida: 175, dano: 44, velocidade: 4.6, raio: 0.42, forma: 'humanoide',
    paleta: ROCHA.osso, comportamento: 'observador', visao: 14,
    quedas: [{ item: 'minerio_ossium', min: 2, max: 3, chance: 0.8 }, { item: 'bonebroth', min: 1, max: 1, chance: 0.3 }],
    lore: 'Reage ao som. Se andares devagar, talvez não te encontre.',
  }),
  ossuary_knight: def({
    id: 'ossuary_knight', nome: 'Ossuary Knight', vida: 260, dano: 38, velocidade: 2.2, raio: 0.48, forma: 'humanoide',
    paleta: MINERAL.ossium, comportamento: 'perseguir', visao: 11, armadura: 16, luz: 0.2,
    quedas: [{ item: 'minerio_ossium', min: 2, max: 4, chance: 0.9 }, { item: 'bearer_token', min: 1, max: 1, chance: 0.08 }],
  }),

  // --- The Silent City / The Veil ---
  echo_shade: def({
    id: 'echo_shade', nome: 'Echo', vida: 180, dano: 34, velocidade: 3.2, raio: 0.36, forma: 'espectro',
    paleta: MINERAL.veilstone, comportamento: 'fase', visao: 13, luz: 0.4,
    quedas: [{ item: 'echoblock', min: 1, max: 2, chance: 0.6 }, { item: 'veilstone', min: 1, max: 2, chance: 0.4 }],
    lore: 'Uma cópia temporal de alguma coisa que morreu aqui.',
  }),
  phase_hunter: def({
    id: 'phase_hunter', nome: 'Phase Hunter', vida: 210, dano: 42, velocidade: 3.8, raio: 0.4, forma: 'humanoide',
    paleta: MINERAL.veilstone, comportamento: 'fase', visao: 14, luz: 0.5,
    quedas: [{ item: 'minerio_veilore', min: 1, max: 2, chance: 0.5 }, { item: 'phaseglass', min: 1, max: 2, chance: 0.5 }],
  }),
  nullborn: def({
    id: 'nullborn', nome: 'Nullborn', vida: 300, dano: 50, velocidade: 2.6, raio: 0.5, forma: 'espectro',
    paleta: MINERAL.nullstone, comportamento: 'perseguir', visao: 13, armadura: 12,
    quedas: [{ item: 'nullstone', min: 1, max: 2, chance: 0.6 }, { item: 'veilstone', min: 1, max: 3, chance: 0.5 }],
    lore: 'Feito de ausência de matéria. Apaga o chão por onde passa.',
  }),
  observer: def({
    id: 'observer', nome: 'Observer', vida: 240, dano: 46, velocidade: 8, raio: 0.42, forma: 'olho',
    paleta: MINERAL.starshard, comportamento: 'observador', visao: 16, luz: 0.8,
    quedas: [{ item: 'starshard', min: 1, max: 2, chance: 0.5 }, { item: 'veilstone', min: 2, max: 3, chance: 0.6 }],
    lore: 'Nunca se mexe enquanto olhares para ele.',
  }),

  // --- Guardiões ---
  goruun: def({
    id: 'goruun', nome: 'Goruun, o Rei Escavador', vida: 900, dano: 30, velocidade: 4.4, raio: 1.15, forma: 'verme',
    paleta: ROCHA.argila, comportamento: 'chefe_verme', visao: 20, chefe: true, armadura: 4,
    quedas: [
      { item: 'fragmento_hunger', min: 1, max: 1, chance: 1 },
      { item: 'barra_ferrite', min: 6, max: 10, chance: 1 },
      { item: 'carne_crua', min: 6, max: 10, chance: 1 },
    ],
    lore: 'Era uma criatura pequena. Um fragmento de Veyra tornou-a quase imortal.',
  }),
  myra: def({
    id: 'myra', nome: 'Myra, a Mente em Flor', vida: 1600, dano: 34, velocidade: 1.2, raio: 1.4, forma: 'flor',
    paleta: ORGANICO.spore, comportamento: 'chefe_colonia', visao: 22, chefe: true, luz: 0.8,
    quedas: [
      { item: 'fragmento_growth', min: 1, max: 1, chance: 1 },
      { item: 'barra_verdglass', min: 6, max: 10, chance: 1 },
      { item: 'sporecake', min: 4, max: 6, chance: 1 },
    ],
    lore: 'O centro consciente da colónia Mycel. A arena cresce enquanto lutas.',
  }),
  varkan: def({
    id: 'varkan', nome: 'Varkan, o Santo da Fornalha', vida: 2600, dano: 44, velocidade: 2.6, raio: 1.4, forma: 'maquina',
    paleta: MINERAL.emberiron, comportamento: 'chefe_forja', visao: 24, chefe: true, armadura: 12, luz: 1,
    quedas: [
      { item: 'fragmento_dominion', min: 1, max: 1, chance: 1 },
      { item: 'barra_kaelite', min: 8, max: 12, chance: 1 },
      { item: 'machineplate', min: 8, max: 14, chance: 1 },
    ],
    lore: 'Um general Kael fundido com a sua forja. Ainda acha que a guerra continua.',
  }),
  tempest: def({
    id: 'tempest', nome: 'A Serpente Tempestade', vida: 3600, dano: 52, velocidade: 5.2, raio: 1.3, forma: 'serpente',
    paleta: MINERAL.stormglass, comportamento: 'chefe_serpente', visao: 26, chefe: true, luz: 1,
    quedas: [
      { item: 'fragmento_motion', min: 1, max: 1, chance: 1 },
      { item: 'barra_stormglass', min: 8, max: 12, chance: 1 },
      { item: 'mirrorstone', min: 6, max: 10, chance: 1 },
    ],
  }),
  nereth: def({
    id: 'nereth', nome: 'Nereth, o Oráculo Afogado', vida: 4800, dano: 58, velocidade: 2, raio: 1.5, forma: 'olho',
    paleta: MINERAL.abysspearl, comportamento: 'chefe_oraculo', visao: 28, chefe: true, armadura: 14, luz: 1.2,
    quedas: [
      { item: 'fragmento_sight', min: 1, max: 1, chance: 1 },
      { item: 'barra_abysspearl', min: 8, max: 12, chance: 1 },
      { item: 'pressureglass', min: 6, max: 10, chance: 1 },
    ],
    lore: '"Já morreste 8.417 vezes."',
  }),
  giant: def({
    id: 'giant', nome: 'O Gigante Oco', vida: 7200, dano: 70, velocidade: 1.6, raio: 2.1, forma: 'gigante',
    paleta: ROCHA.osso, comportamento: 'chefe_gigante', visao: 30, chefe: true, armadura: 20, luz: 0.6,
    quedas: [
      { item: 'fragmento_memory', min: 1, max: 1, chance: 1 },
      { item: 'barra_ossium', min: 10, max: 16, chance: 1 },
      { item: 'marrowstone', min: 10, max: 16, chance: 1 },
    ],
    lore: 'A criatura cujo corpo é a Bone Expanse. Está a acordar.',
  }),
  bearer_zero: def({
    id: 'bearer_zero', nome: 'Bearer Zero', vida: 11000, dano: 86, velocidade: 4.2, raio: 1.2, forma: 'portador',
    paleta: MINERAL.nullstone, comportamento: 'chefe_portador', visao: 30, chefe: true, armadura: 18, luz: 0.9,
    quedas: [
      { item: 'architect_key', min: 1, max: 1, chance: 1 },
      { item: 'nullstone', min: 10, max: 16, chance: 1 },
      { item: 'starshard', min: 6, max: 10, chance: 1 },
    ],
    lore: 'O primeiro Portador funcional. Já não acredita que Veyra deva ser destruída.',
  }),
};

/** Mutações provocadas por Veyra: mesma criatura, outro problema. */
export interface Elite {
  chave: string;
  nome: string;
  vida: number;
  dano: number;
  velocidade: number;
  cor: string;
}

export const ELITES: Elite[] = [
  { chave: 'star_touched', nome: 'Tocado pela Estrela', vida: 2.4, dano: 1.6, velocidade: 1, cor: '#f0bb35' },
  { chave: 'ancient', nome: 'Ancestral', vida: 3.2, dano: 1.4, velocidade: 0.85, cor: '#8a7d5a' },
  { chave: 'hollowed', nome: 'Oco', vida: 1.6, dano: 1.8, velocidade: 1.35, cor: '#b0b0c0' },
  { chave: 'veilborn', nome: 'Nascido do Véu', vida: 1.9, dano: 1.5, velocidade: 1.2, cor: '#b79bff' },
  { chave: 'overgrown', nome: 'Tomado pelo Mycel', vida: 2.6, dano: 1.3, velocidade: 0.95, cor: '#3fb077' },
  { chave: 'mechanized', nome: 'Mecanizado', vida: 2.2, dano: 1.5, velocidade: 1.1, cor: '#6de0ff' },
];

export interface ContextoIA {
  dt: number;
  tempo: number;
  world: World;
  alvoX: number;
  alvoY: number;
  alvoVivo: boolean;
  /** Direcção para onde o Portador está virado — o Observer conta com isso. */
  alvoDirX: number;
  alvoDirY: number;
  atacar(dano: number, empurraoX: number, empurraoY: number): void;
  projetil(x: number, y: number, vx: number, vy: number, dano: number, cor: string): void;
  invocar(id: string, x: number, y: number): void;
  particulas(x: number, y: number, cor: string, quantidade: number, forca?: number): void;
  abanar(forca: number): void;
  /** Usado pelo Nullborn: apaga a rocha por onde passa. */
  apagarBloco(x: number, y: number): void;
}

export class Inimigo implements CorpoMovel {
  readonly def: InimigoDef;
  x: number;
  y: number;
  raio: number;
  vida: number;
  vidaMax: number;
  elite: Elite | null = null;
  private t = 0;
  private fase = 0;
  private vx = 0;
  private vy = 0;
  private arrefecimentoToque = 0;
  private vaguear = 0;
  private vagX = 0;
  private vagY = 0;
  /** Enterrado/invisível: não recebe nem faz dano. */
  escondido = false;
  piscar = 0;
  anim = 0;
  acordado = false;
  morto = false;
  escalaX = 1;
  escalaY = 1;
  /** 0..1 — usado pelo desenho para o efeito de fase. */
  opacidade = 1;
  multiplicadorDano = 1;

  constructor(d: InimigoDef, x: number, y: number, elite: Elite | null = null) {
    this.def = d;
    this.x = x;
    this.y = y;
    this.raio = d.raio * (elite ? 1.18 : 1);
    this.elite = elite;
    this.vidaMax = Math.round(d.vida * (elite?.vida ?? 1));
    this.vida = this.vidaMax;
    this.multiplicadorDano = elite?.dano ?? 1;
    if (d.comportamento === 'emboscada') this.escondido = true;
    // Os guardiões mostram-se uns segundos antes do primeiro ataque.
    if (d.chefe) this.t = 2.5;
    this.anim = Math.random() * 10;
  }

  get nome(): string {
    return this.elite ? `${this.def.nome} · ${this.elite.nome}` : this.def.nome;
  }

  get dano(): number {
    return Math.round(this.def.dano * this.multiplicadorDano);
  }

  get velocidade(): number {
    return this.def.velocidade * (this.elite?.velocidade ?? 1);
  }

  ferir(dano: number, empurraoX: number, empurraoY: number, ignoraArmadura = 0): number {
    if (this.escondido) return 0;
    const armadura = (this.def.armadura ?? 0) * (1 - ignoraArmadura);
    const efetivo = Math.max(1, dano - armadura);
    this.vida -= efetivo;
    this.piscar = 0.18;
    this.acordado = true;
    if (!this.def.chefe) {
      this.x += empurraoX * 0.06;
      this.y += empurraoY * 0.06;
    }
    if (this.vida <= 0) this.morto = true;
    return efetivo;
  }

  atualizar(ctx: ContextoIA): void {
    const { dt } = ctx;
    this.anim += dt;
    this.piscar = Math.max(0, this.piscar - dt);
    this.arrefecimentoToque = Math.max(0, this.arrefecimentoToque - dt);
    this.escalaX += (1 - this.escalaX) * Math.min(1, dt * 8);
    this.escalaY += (1 - this.escalaY) * Math.min(1, dt * 8);
    this.opacidade += ((this.escondido ? 0.12 : 1) - this.opacidade) * Math.min(1, dt * 6);

    const dx = ctx.alvoX - this.x;
    const dy = ctx.alvoY - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    const ve = ctx.alvoVivo && dist < this.def.visao && linhaLivre(ctx.world, this.x, this.y, ctx.alvoX, ctx.alvoY);
    if (ve && this.def.comportamento !== 'emboscada') this.acordado = true;

    switch (this.def.comportamento) {
      case 'perseguir': this.perseguir(ctx, nx, ny, dist, ve); break;
      case 'saltar': this.saltar(ctx, nx, ny, ve); break;
      case 'atirador': this.atirador(ctx, nx, ny, dist, ve); break;
      case 'fixo': this.fixo(ctx, nx, ny, dist, ve); break;
      case 'emboscada': this.emboscada(ctx, nx, ny, dist); break;
      case 'passivo': this.passivo(ctx, nx, ny, dist); break;
      case 'fase': this.faseAI(ctx, nx, ny, dist, ve); break;
      case 'observador': this.observador(ctx, nx, ny, dist); break;
      case 'chefe_verme': this.chefeVerme(ctx, nx, ny, dist); break;
      case 'chefe_colonia': this.chefeColonia(ctx, nx, ny, dist); break;
      case 'chefe_forja': this.chefeForja(ctx, nx, ny, dist); break;
      case 'chefe_serpente': this.chefeSerpente(ctx, nx, ny, dist); break;
      case 'chefe_oraculo': this.chefeOraculo(ctx, nx, ny, dist); break;
      case 'chefe_gigante': this.chefeGigante(ctx, nx, ny, dist); break;
      case 'chefe_portador': this.chefePortador(ctx, nx, ny, dist); break;
    }

    if (this.def.id === 'nullborn' && this.acordado) {
      ctx.apagarBloco(Math.floor(this.x), Math.floor(this.y));
    }

    this.tocar(ctx, dist, nx, ny);
  }

  private tocar(ctx: ContextoIA, dist: number, nx: number, ny: number): void {
    if (!ctx.alvoVivo || this.escondido) return;
    if (dist > this.raio + 0.45 || this.arrefecimentoToque > 0) return;
    ctx.atacar(this.dano, nx * 0.25, ny * 0.25);
    this.arrefecimentoToque = 0.8;
  }

  private vaguearPor(ctx: ContextoIA, velocidade: number): void {
    this.vaguear -= ctx.dt;
    if (this.vaguear <= 0) {
      this.vaguear = 1 + Math.random() * 2;
      const ang = Math.random() * Math.PI * 2;
      this.vagX = Math.cos(ang);
      this.vagY = Math.sin(ang);
      if (Math.random() < 0.35) {
        this.vagX = 0;
        this.vagY = 0;
      }
    }
    mover(ctx.world, this, this.vagX * velocidade * 0.4 * ctx.dt, this.vagY * velocidade * 0.4 * ctx.dt);
  }

  private perseguir(ctx: ContextoIA, nx: number, ny: number, dist: number, ve: boolean): void {
    if (ve && dist > this.raio + 0.2) {
      mover(ctx.world, this, nx * this.velocidade * ctx.dt, ny * this.velocidade * ctx.dt);
    } else if (!ve) {
      this.vaguearPor(ctx, this.velocidade);
    }
  }

  private saltar(ctx: ContextoIA, nx: number, ny: number, ve: boolean): void {
    this.t -= ctx.dt;
    if (this.fase === 0) {
      if (this.t <= 0) {
        if (ve) {
          this.fase = 1;
          this.t = 0.3;
          this.vx = nx * this.velocidade * 2.2;
          this.vy = ny * this.velocidade * 2.2;
          this.escalaX = 0.72;
          this.escalaY = 1.35;
        } else {
          this.t = 0.6;
          this.vaguearPor(ctx, this.velocidade);
        }
      }
    } else {
      mover(ctx.world, this, this.vx * ctx.dt, this.vy * ctx.dt);
      if (this.t <= 0) {
        this.fase = 0;
        this.t = 0.5 + Math.random() * 0.4;
        this.escalaX = 1.38;
        this.escalaY = 0.68;
      }
    }
  }

  private atirador(ctx: ContextoIA, nx: number, ny: number, dist: number, ve: boolean): void {
    this.t -= ctx.dt;
    if (!ve) {
      this.vaguearPor(ctx, this.velocidade);
      return;
    }
    const desejada = 5.5;
    const passo = this.velocidade * ctx.dt;
    if (dist > desejada + 0.8) mover(ctx.world, this, nx * passo, ny * passo);
    else if (dist < desejada - 1.5) mover(ctx.world, this, -nx * passo, -ny * passo);
    if (this.t <= 0) {
      this.t = 1.8;
      ctx.projetil(this.x, this.y, nx * 7.5, ny * 7.5, this.dano, this.def.paleta.acento);
    }
  }

  private fixo(ctx: ContextoIA, nx: number, ny: number, dist: number, ve: boolean): void {
    this.t -= ctx.dt;
    this.escalaY = 1 + Math.sin(this.anim * 2) * 0.05;
    if (!ve || dist > this.def.visao) return;
    if (this.t <= 0) {
      this.t = 1.5;
      ctx.projetil(this.x, this.y - 0.3, nx * 8, ny * 8, this.dano, this.def.paleta.acento);
      this.escalaY = 0.8;
    }
  }

  private emboscada(ctx: ContextoIA, nx: number, ny: number, dist: number): void {
    if (this.escondido) {
      if (dist < 2.4 && ctx.alvoVivo) {
        this.escondido = false;
        this.acordado = true;
        this.escalaY = 1.6;
        this.escalaX = 0.6;
        ctx.abanar(5);
        ctx.particulas(this.x, this.y, this.def.paleta.base, 22, 3.4);
        this.t = 6;
      } else if (dist < 9 && ctx.alvoVivo) {
        // Aproxima-se por baixo do chão, sem ser vista.
        mover(ctx.world, this, nx * this.velocidade * 0.55 * ctx.dt, ny * this.velocidade * 0.55 * ctx.dt);
      }
      return;
    }
    this.t -= ctx.dt;
    this.perseguir(ctx, nx, ny, dist, true);
    // Volta a enterrar-se se perder o alvo.
    if (this.t <= 0 && dist > 7) {
      this.escondido = true;
      this.t = 0;
    }
  }

  private passivo(ctx: ContextoIA, nx: number, ny: number, dist: number): void {
    if (this.vida < this.vidaMax && dist < 8) {
      mover(ctx.world, this, -nx * this.velocidade * 1.4 * ctx.dt, -ny * this.velocidade * 1.4 * ctx.dt);
      return;
    }
    this.vaguearPor(ctx, this.velocidade);
  }

  private faseAI(ctx: ContextoIA, nx: number, ny: number, dist: number, ve: boolean): void {
    this.t -= ctx.dt;
    if (this.fase === 0) {
      // Materializado: persegue e pode levar dano.
      this.escondido = false;
      this.perseguir(ctx, nx, ny, dist, ve);
      if (this.t <= 0 && ve) {
        this.fase = 1;
        this.t = 1.1;
        ctx.particulas(this.x, this.y, this.def.paleta.acento, 14, 2.6);
      }
    } else {
      this.escondido = true;
      mover(ctx.world, this, nx * this.velocidade * 1.9 * ctx.dt, ny * this.velocidade * 1.9 * ctx.dt);
      if (this.t <= 0) {
        this.fase = 0;
        this.t = 2.4;
        this.escondido = false;
        ctx.particulas(this.x, this.y, this.def.paleta.acento, 18, 3);
      }
    }
  }

  /** Só se move quando não está no cone de visão do Portador. */
  private observador(ctx: ContextoIA, nx: number, ny: number, dist: number): void {
    if (!ctx.alvoVivo) return;
    const paraMim = Math.atan2(this.y - ctx.alvoY, this.x - ctx.alvoX);
    const olhar = Math.atan2(ctx.alvoDirY, ctx.alvoDirX);
    let diff = Math.abs(paraMim - olhar);
    while (diff > Math.PI) diff = Math.PI * 2 - diff;
    const observado = diff < 0.9 && dist < this.def.visao && linhaLivre(ctx.world, this.x, this.y, ctx.alvoX, ctx.alvoY);
    if (observado) {
      this.escalaY = 1 + Math.sin(this.anim * 8) * 0.02;
      return;
    }
    if (dist > this.raio + 0.3) {
      mover(ctx.world, this, nx * this.velocidade * ctx.dt, ny * this.velocidade * ctx.dt);
    }
  }

  // --- Guardiões -------------------------------------------------------------

  private chefeVerme(ctx: ContextoIA, nx: number, ny: number, dist: number): void {
    if (!this.acordado) return;
    this.t -= ctx.dt;
    switch (this.fase) {
      case 0: // à superfície, persegue
        mover(ctx.world, this, nx * this.velocidade * 0.55 * ctx.dt, ny * this.velocidade * 0.55 * ctx.dt);
        if (this.t <= 0) {
          this.fase = 1;
          this.t = 1.4;
          this.escondido = true;
          ctx.particulas(this.x, this.y, this.def.paleta.base, 26, 3.6);
          ctx.abanar(4);
        }
        break;
      case 1: // enterrado, corre para debaixo do alvo
        mover(ctx.world, this, nx * this.velocidade * 1.5 * ctx.dt, ny * this.velocidade * 1.5 * ctx.dt);
        ctx.particulas(this.x, this.y, this.def.paleta.escuro, 2, 1.2);
        if (this.t <= 0) {
          this.fase = 2;
          this.t = 0.45;
          this.escondido = false;
          this.escalaY = 1.8;
          this.escalaX = 0.55;
          ctx.abanar(10);
          ctx.particulas(this.x, this.y, this.def.paleta.claro, 34, 5);
          if (dist < 3) ctx.atacar(this.dano * 1.4, nx * 0.6, ny * 0.6);
        }
        break;
      default: // recupera
        if (this.t <= 0) {
          this.fase = 0;
          this.t = 2.6;
          if (this.vida < this.vidaMax * 0.5 && Math.random() < 0.5) {
            ctx.invocar('grubjaw', this.x + (Math.random() - 0.5) * 4, this.y + (Math.random() - 0.5) * 4);
          }
        }
        break;
    }
  }

  private chefeColonia(ctx: ContextoIA, nx: number, ny: number, dist: number): void {
    if (!this.acordado) return;
    this.t -= ctx.dt;
    this.escalaY = 1 + Math.sin(this.anim * 1.6) * 0.06;
    const furia = this.vida < this.vidaMax * 0.4;
    if (this.t <= 0) {
      const modo = Math.random();
      if (modo < 0.45) {
        // Chuva de esporos.
        for (let i = 0; i < (furia ? 10 : 6); i++) {
          const a = (i / (furia ? 10 : 6)) * Math.PI * 2 + this.anim;
          ctx.projetil(this.x, this.y, Math.cos(a) * 5.5, Math.sin(a) * 5.5, this.dano, this.def.paleta.acento);
        }
        this.t = furia ? 1.6 : 2.4;
      } else if (modo < 0.8) {
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          ctx.invocar('sporekin', this.x + Math.cos(a) * 3, this.y + Math.sin(a) * 3);
        }
        ctx.particulas(this.x, this.y, this.def.paleta.claro, 20, 2.6);
        this.t = 3.2;
      } else {
        // Raiz que persegue.
        ctx.projetil(this.x, this.y, nx * 9, ny * 9, this.dano * 1.3, this.def.paleta.claro);
        this.t = 1.8;
      }
    }
    if (dist < 2.5) ctx.atacar(this.dano * 0.6, nx * 0.3, ny * 0.3);
  }

  private chefeForja(ctx: ContextoIA, nx: number, ny: number, dist: number): void {
    if (!this.acordado) return;
    this.t -= ctx.dt;
    if (dist > 3.4) mover(ctx.world, this, nx * this.velocidade * ctx.dt, ny * this.velocidade * ctx.dt);
    if (this.t <= 0) {
      if (dist < 3.2) {
        ctx.abanar(11);
        ctx.particulas(this.x, this.y, '#ff8a3c', 28, 4.2);
        ctx.atacar(this.dano * 1.2, nx * 0.6, ny * 0.6);
        this.escalaY = 0.7;
        this.escalaX = 1.35;
        this.t = 1.7;
      } else {
        const base = Math.atan2(ny, nx);
        for (const off of [-0.34, 0, 0.34]) {
          const a = base + off;
          ctx.projetil(this.x, this.y, Math.cos(a) * 8, Math.sin(a) * 8, Math.round(this.dano * 0.7), '#ff8a3c');
        }
        this.t = 1.9;
      }
    }
    if (this.vida < this.vidaMax * 0.4 && Math.random() < ctx.dt * 0.5) {
      ctx.invocar('furnace_drone', this.x + (Math.random() - 0.5) * 5, this.y + (Math.random() - 0.5) * 5);
    }
  }

  private chefeSerpente(ctx: ContextoIA, nx: number, ny: number, dist: number): void {
    if (!this.acordado) return;
    this.t -= ctx.dt;
    // Orbita o alvo em vez de ir a direito.
    const tangenteX = -ny;
    const tangenteY = nx;
    const aproxima = dist > 6 ? 1 : dist < 3.5 ? -0.6 : 0;
    mover(
      ctx.world,
      this,
      (tangenteX * 0.85 + nx * aproxima) * this.velocidade * ctx.dt,
      (tangenteY * 0.85 + ny * aproxima) * this.velocidade * ctx.dt,
    );
    if (this.t <= 0) {
      if (this.fase === 0) {
        for (let i = -2; i <= 2; i++) {
          const a = Math.atan2(ny, nx) + i * 0.18;
          ctx.projetil(this.x, this.y, Math.cos(a) * 11, Math.sin(a) * 11, this.dano, '#d9c2ff');
        }
        this.fase = 1;
        this.t = 2.2;
      } else {
        // Investida relâmpago.
        this.vx = nx * this.velocidade * 3;
        this.vy = ny * this.velocidade * 3;
        mover(ctx.world, this, this.vx * 0.2, this.vy * 0.2);
        ctx.abanar(6);
        ctx.particulas(this.x, this.y, '#d9c2ff', 20, 4);
        if (dist < 3) ctx.atacar(this.dano, nx * 0.5, ny * 0.5);
        this.fase = 0;
        this.t = 1.6;
      }
    }
  }

  private chefeOraculo(ctx: ContextoIA, nx: number, ny: number, dist: number): void {
    if (!this.acordado) return;
    this.t -= ctx.dt;
    this.escalaX = 1 + Math.sin(this.anim * 2.2) * 0.05;
    if (dist > 8) mover(ctx.world, this, nx * this.velocidade * ctx.dt, ny * this.velocidade * ctx.dt);
    else if (dist < 4) mover(ctx.world, this, -nx * this.velocidade * 0.7 * ctx.dt, -ny * this.velocidade * 0.7 * ctx.dt);
    if (this.t <= 0) {
      if (this.fase === 0) {
        // Prevê para onde vais: dispara à frente do alvo.
        const antecipa = 0.55;
        const px = ctx.alvoX + ctx.alvoDirX * antecipa * 4 - this.x;
        const py = ctx.alvoY + ctx.alvoDirY * antecipa * 4 - this.y;
        const m = Math.hypot(px, py) || 1;
        for (let i = 0; i < 3; i++) {
          ctx.projetil(this.x, this.y, (px / m) * (8 + i), (py / m) * (8 + i), this.dano, '#b6ffff');
        }
        this.fase = 1;
        this.t = 1.5;
      } else {
        // Anel de água pressurizada.
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          ctx.projetil(this.x, this.y, Math.cos(a) * 6, Math.sin(a) * 6, Math.round(this.dano * 0.7), '#b6ffff');
        }
        ctx.abanar(5);
        this.fase = 0;
        this.t = 2.6;
      }
    }
  }

  private chefeGigante(ctx: ContextoIA, nx: number, ny: number, dist: number): void {
    if (!this.acordado) return;
    this.t -= ctx.dt;
    if (dist > 4.5) mover(ctx.world, this, nx * this.velocidade * ctx.dt, ny * this.velocidade * ctx.dt);
    if (this.t <= 0) {
      const modo = Math.random();
      if (modo < 0.45 && dist < 5) {
        ctx.abanar(16);
        ctx.particulas(this.x + nx * 2, this.y + ny * 2, this.def.paleta.claro, 40, 5.5);
        ctx.atacar(this.dano, nx * 0.9, ny * 0.9);
        this.escalaY = 0.72;
        this.escalaX = 1.3;
        this.t = 2.2;
      } else if (modo < 0.75) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
          ctx.projetil(this.x, this.y, Math.cos(a) * 7, Math.sin(a) * 7, Math.round(this.dano * 0.6), '#ecd9a8');
        }
        ctx.abanar(8);
        this.t = 2.6;
      } else {
        for (let i = 0; i < 2; i++) {
          ctx.invocar('marrow_crawler', this.x + (Math.random() - 0.5) * 6, this.y + (Math.random() - 0.5) * 6);
        }
        this.t = 3.4;
      }
    }
  }

  /** Bearer Zero luta como o jogador: investe, dispara e recua. */
  private chefePortador(ctx: ContextoIA, nx: number, ny: number, dist: number): void {
    if (!this.acordado) return;
    this.t -= ctx.dt;
    switch (this.fase) {
      case 0:
        mover(ctx.world, this, nx * this.velocidade * ctx.dt, ny * this.velocidade * ctx.dt);
        if (dist < 2.2) {
          this.fase = 1;
          this.t = 0.9;
        } else if (this.t <= 0) {
          this.fase = 2;
          this.t = 1.2;
        }
        break;
      case 1: // combo corpo a corpo
        if (this.t <= 0) {
          ctx.atacar(this.dano, nx * 0.5, ny * 0.5);
          ctx.particulas(this.x + nx, this.y + ny, '#8f8fbf', 16, 3);
          ctx.abanar(6);
          this.fase = 0;
          this.t = 1.4;
        }
        break;
      default: // recua e dispara
        mover(ctx.world, this, -nx * this.velocidade * 0.8 * ctx.dt, -ny * this.velocidade * 0.8 * ctx.dt);
        if (this.t <= 0) {
          for (let i = -1; i <= 1; i++) {
            const a = Math.atan2(ny, nx) + i * 0.22;
            ctx.projetil(this.x, this.y, Math.cos(a) * 13, Math.sin(a) * 13, Math.round(this.dano * 0.6), '#d5a8ff');
          }
          this.fase = 0;
          this.t = 1.8;
        }
        break;
    }
    if (this.vida < this.vidaMax * 0.5 && Math.random() < ctx.dt * 0.25) {
      ctx.invocar('echo_shade', this.x + (Math.random() - 0.5) * 6, this.y + (Math.random() - 0.5) * 6);
    }
  }
}

export function sortearQuedas(d: InimigoDef, elite: Elite | null): { item: string; quantidade: number }[] {
  const saida: { item: string; quantidade: number }[] = [];
  const bonus = elite ? 1.6 : 1;
  for (const q of d.quedas) {
    if (Math.random() > q.chance * (elite ? 1.2 : 1)) continue;
    const n = Math.round((q.min + Math.floor(Math.random() * (q.max - q.min + 1))) * bonus);
    if (n > 0) saida.push({ item: q.item, quantidade: n });
  }
  return saida;
}

/** Probabilidade de um bicho nascer mutado, conforme a profundidade. */
export function sortearElite(distanciaAoRele: number): Elite | null {
  const hipotese = Math.min(0.24, 0.02 + distanciaAoRele / 6000);
  if (Math.random() > hipotese) return null;
  return ELITES[Math.floor(Math.random() * ELITES.length)];
}

export { ROCHA, MINERAL };
