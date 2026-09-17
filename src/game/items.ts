/**
 * Itens de The Hollow Star. Cada material da progressão abre uma mecânica
 * nova — não é só a mesma espada com mais dano.
 */

import { MINERAL, ORGANICO, ROCHA, paleta, type Paleta } from '../render/paleta';
import { Block, Ground } from '../world/tiles';

export type ItemCategoria = 'material' | 'ferramenta' | 'arma' | 'armadura' | 'comida' | 'construcao' | 'relíquia';

export interface FerramentaStats {
  nivel: number;
  poder: number;
}

export interface ArmaStats {
  dano: number;
  alcance: number;
  cadencia: number;
  arco: number;
  empurrao: number;
  /** Arma de projéctil: velocidade do tiro. */
  projectil?: { velocidade: number; cor: string; perfura?: number; salta?: number };
  /** Rouba vida por golpe (fracção do dano). */
  roubo?: number;
  /** Probabilidade de crítico (x2). */
  critico?: number;
  /** Ignora esta fracção da defesa do alvo. */
  perfuraArmadura?: number;
  /** Dano em área à volta do alvo. */
  area?: number;
}

export interface ArmaduraStats {
  slot: 'cabeca' | 'peito' | 'pernas';
  defesa: number;
  conjunto: string;
}

export interface ComidaStats {
  fome: number;
  cura: number;
  regen: number;
  /** Buff temporário concedido. */
  buff?: { tipo: 'velocidade' | 'defesa' | 'dano' | 'folego'; valor: number; duracao: number };
}

export interface ItemDef {
  id: string;
  nome: string;
  categoria: ItemCategoria;
  sprite: string;
  paleta: Paleta;
  pilha: number;
  ferramenta?: FerramentaStats;
  arma?: ArmaStats;
  armadura?: ArmaduraStats;
  comida?: ComidaStats;
  coloca?: number;
  colocaChao?: number;
  /** Variante do pintor: distingue peças que partilham a mesma forma base. */
  variante?: number;
  desc?: string;
}

const defs: ItemDef[] = [];
function reg(d: ItemDef): void {
  defs.push(d);
}

function material(id: string, nome: string, sprite: string, p: Paleta, desc?: string, variante = 0): void {
  reg({ id, nome, categoria: 'material', sprite, paleta: p, pilha: 999, variante, desc });
}

// --- Materiais de rocha ------------------------------------------------------
material('duststone', 'Duststone', 'i_po', ROCHA.duststone);
material('slate', 'Ardósia', 'i_po', ROCHA.slate);
material('deepclay', 'Argila profunda', 'i_po', ROCHA.argila);
material('ironroot', 'Ironroot', 'i_madeira', ROCHA.raiz, 'Madeira mineralizada. Dura como pedra, arde como lenha.');
material('lumibark', 'Lumibark', 'i_madeira', ROCHA.lumibark, 'Madeira bioluminescente do Verdant Deep.');
material('micelio', 'Micélio', 'i_fibra', ROCHA.micelio);
material('fibra', 'Fibra de thornvine', 'i_fibra', ROCHA.rootmass);
material('glowmoss', 'Glowmoss', 'i_fibra', ROCHA.lumibark);
material('ambersap', 'Amber Sap', 'i_fragmento', ORGANICO.seiva, 'Resina endurecida. Base de toda a alquimia.');
material('forgebrick', 'Forgebrick', 'i_placa', ROCHA.forgebrick);
material('slag', 'Escória', 'i_po', ROCHA.slag);
material('machineplate', 'Chapa de máquina', 'i_placa', ROCHA.maquina);
material('shatterglass', 'Shatterglass', 'i_cristal', ROCHA.vidro);
material('stormsand', 'Areia de tempestade', 'i_po', ROCHA.areia);
material('mirrorstone', 'Mirrorstone', 'i_placa', ROCHA.espelho);
material('tidebrick', 'Tidebrick', 'i_placa', ROCHA.mare);
material('coralstone', 'Coralstone', 'i_po', ROCHA.coral);
material('pressureglass', 'Vidro de pressão', 'i_cristal', ROCHA.mare);
material('bonewall', 'Osso fossilizado', 'i_po', ROCHA.osso);
material('marrowstone', 'Marrowstone', 'i_po', ROCHA.medula);
material('nervecrystal', 'Cristal nervoso', 'i_cristal', MINERAL.abysspearl, 'Ainda reage quando te mexes ao pé dele.');
material('veilstone', 'Veilstone', 'i_fragmento', MINERAL.veilstone, 'Parcialmente fora da realidade.');
material('phaseglass', 'Phase Glass', 'i_cristal', ROCHA.veil);
material('echoblock', 'Echo Block', 'i_placa', ROCHA.veil, 'Guarda vozes de há mil anos.');
material('nullstone', 'Nullstone', 'i_placa', MINERAL.nullstone, 'Tecnologia dos Architects. Não reflecte luz.');
material('livingcrystal', 'Cristal vivo', 'i_cristal', MINERAL.cristal);
material('starshard', 'Starshard', 'i_estrela', MINERAL.starshard, 'Um caco de Veyra. Pulsa como um coração.');

// --- Minérios e lingotes -----------------------------------------------------
const MINERIOS: [string, string, Paleta][] = [
  ['ferrite', 'Ferrite', MINERAL.ferrite],
  ['tinshade', 'Tinshade', MINERAL.tinshade],
  ['verdglass', 'Verdglass', MINERAL.verdglass],
  ['emberiron', 'Ember Iron', MINERAL.emberiron],
  ['kaelite', 'Kaelite', MINERAL.kaelite],
  ['palesilver', 'Pale Silver', MINERAL.palesilver],
  ['stormglass', 'Stormglass', MINERAL.stormglass],
  ['abysspearl', 'Abyss Pearl', MINERAL.abysspearl],
  ['ossium', 'Ossium', MINERAL.ossium],
  ['veilore', 'Veilstone bruto', MINERAL.veilstone],
];

MINERIOS.forEach(([chave, nome, p], nivel) => {
  material(`minerio_${chave}`, `Minério de ${nome}`, 'i_minerio', p, undefined, nivel);
  material(`barra_${chave}`, `Lingote de ${nome}`, 'i_lingote', p, undefined, nivel);
});

// --- Fragmentos do Núcleo ----------------------------------------------------
const FRAGMENTOS: [string, string, string][] = [
  ['hunger', 'Fome', 'Arrancado a Goruun. Ainda tenta engolir o que lhe toca.'],
  ['growth', 'Crescimento', 'O que resta da Mother Below.'],
  ['dominion', 'Domínio', 'Varkan continuava a defender uma guerra acabada.'],
  ['motion', 'Movimento', 'Não fica quieto na mochila.'],
  ['sight', 'Visão', 'Nereth calculou 8.417 mortes tuas. Este é o resto.'],
  ['memory', 'Memória', 'O Hollow Giant lembrava-se de quem o matou.'],
];

FRAGMENTOS.forEach(([chave, nome, desc], i) => {
  reg({
    id: `fragmento_${chave}`,
    nome: `Fragmento: ${nome}`,
    categoria: 'relíquia',
    sprite: 'i_nucleo',
    paleta: MINERAL.starshard,
    pilha: 9,
    variante: i,
    desc,
  });
});

reg({
  id: 'architect_key', nome: 'Chave dos Architects', categoria: 'relíquia', sprite: 'i_chave',
  paleta: MINERAL.nullstone, pilha: 1, desc: 'Bearer Zero guardou-a durante milhares de anos. Agora é tua.',
});
reg({
  id: 'bearer_token', nome: 'Marca de Portador', categoria: 'relíquia', sprite: 'i_placa',
  paleta: MINERAL.palesilver, pilha: 99, desc: 'Ninguém sabe quantas destas existem.',
});

// --- Comida ------------------------------------------------------------------
interface DefComida {
  id: string;
  nome: string;
  sprite: string;
  p: Paleta;
  fome: number;
  cura: number;
  regen: number;
  buff?: ComidaStats['buff'];
  desc?: string;
}

const COMIDAS: DefComida[] = [
  { id: 'glowfruit', nome: 'Glowfruit', sprite: 'i_fruto', p: ORGANICO.glowfruit, fome: 18, cura: 6, regen: 0 },
  {
    id: 'sporecap', nome: 'Sporecap', sprite: 'i_cogumelo', p: ORGANICO.spore, fome: 12, cura: 3, regen: 0,
    desc: 'Cru sabe a terra molhada. Cozinhado, vale bem mais.',
  },
  {
    id: 'emberroot', nome: 'Ember Root', sprite: 'i_raiz', p: ORGANICO.emberroot, fome: 16, cura: 4, regen: 2,
    buff: { tipo: 'defesa', valor: 4, duracao: 90 }, desc: 'Aguenta-te o calor das Foundries.',
  },
  {
    id: 'sporecake', nome: 'Sporecake', sprite: 'i_bolo', p: ORGANICO.spore, fome: 34, cura: 16, regen: 22,
    desc: 'Regeneração prolongada.',
  },
  {
    id: 'stormberry', nome: 'Stormberry', sprite: 'i_baga', p: ORGANICO.stormberry, fome: 14, cura: 4, regen: 0,
    buff: { tipo: 'velocidade', valor: 1.6, duracao: 60 },
  },
  {
    id: 'abysskelp', nome: 'Abyss Kelp', sprite: 'i_alga', p: ORGANICO.kelp, fome: 12, cura: 6, regen: 4,
    buff: { tipo: 'folego', valor: 1, duracao: 120 }, desc: 'Deixa-te respirar debaixo de água.',
  },
  {
    id: 'bonebroth', nome: 'Caldo de osso', sprite: 'i_tigela', p: ORGANICO.caldo, fome: 40, cura: 24, regen: 14,
    buff: { tipo: 'defesa', valor: 6, duracao: 120 },
  },
  {
    id: 'phasenectar', nome: 'Néctar de Fase', sprite: 'i_frasco', p: ORGANICO.nectar, fome: 6, cura: 55, regen: 6,
    desc: 'Hipótese de atravessares um golpe sem o sentires.',
  },
  {
    id: 'starfruit', nome: 'Starfruit', sprite: 'i_estrela', p: MINERAL.starshard, fome: 50, cura: 80, regen: 40,
    buff: { tipo: 'dano', valor: 8, duracao: 180 }, desc: 'Extremamente raro. Sabe a luz.',
  },
  { id: 'carne_crua', nome: 'Carne de caverna', sprite: 'i_carne', p: ORGANICO.carne, fome: 10, cura: 0, regen: 0 },
];

for (const c of COMIDAS) {
  reg({
    id: c.id, nome: c.nome, categoria: 'comida', sprite: c.sprite, paleta: c.p, pilha: 99,
    comida: { fome: c.fome, cura: c.cura, regen: c.regen, buff: c.buff }, desc: c.desc,
  });
}

// --- Construções -------------------------------------------------------------
function construcao(id: string, nome: string, sprite: string, p: Paleta, bloco: number, desc?: string): void {
  reg({ id, nome, categoria: 'construcao', sprite, paleta: p, pilha: 99, coloca: bloco, desc });
}

construcao('torch', 'Tocha', 'b_torch', ORGANICO.emberroot, Block.Torch);
construcao('glowlamp', 'Lâmpada de Glowmoss', 'b_glowlamp', ROCHA.lumibark, Block.GlowLamp);
construcao('stormlamp', 'Lâmpada de Stormglass', 'b_stormlamp', MINERAL.stormglass, Block.StormLamp);
construcao('starbeacon', 'Farol Estelar', 'b_starbeacon', MINERAL.starshard, Block.StarBeacon, 'Ilumina meia caverna.');
construcao('workbench', 'Bancada', 'b_workbench', ROCHA.raiz, Block.Workbench);
construcao('forge', 'Forja', 'b_forge', ROCHA.forgebrick, Block.Forge);
construcao('foundry', 'Fundição de Arco', 'b_foundry', ROCHA.maquina, Block.Foundry);
construcao('hearth', 'Lareira de cozinha', 'b_hearth', ROCHA.slate, Block.Hearth);
construcao('fabricator', 'Fabricador Kael', 'b_fabricator', ROCHA.kael, Block.Fabricator);
construcao('cot', 'Cápsula de Portador', 'b_cot', ROCHA.maquina, Block.Cot, 'Define onde acordas da próxima vez.');
construcao('plankwall', 'Parede de Lumibark', 'b_plankwall', ROCHA.lumibark, Block.PlankWall);
construcao('brickwall', 'Parede de Forgebrick', 'b_brickwall', ROCHA.forgebrick, Block.BrickWall);
reg({
  id: 'lajes', nome: 'Lajes', categoria: 'construcao', sprite: 'g_lajes', paleta: ROCHA.slate, pilha: 99,
  colocaChao: Ground.Lajes,
});
reg({
  id: 'placa_kael', nome: 'Placa Kael', categoria: 'construcao', sprite: 'g_kael', paleta: ROCHA.kael, pilha: 99,
  colocaChao: Ground.Kael,
});

// --- Ferramentas -------------------------------------------------------------
interface DefFerramenta {
  id: string;
  nome: string;
  nivel: number;
  poder: number;
  p: Paleta;
  sprite: string;
  desc: string;
}

const FERRAMENTAS: DefFerramenta[] = [
  { id: 'pick_stone', nome: 'Picareta de pedra', nivel: 1, poder: 1, p: ROCHA.slate, sprite: 'i_picareta', desc: 'O que se arranja no primeiro dia.' },
  { id: 'pick_ferrite', nome: 'Picareta de Ferrite', nivel: 2, poder: 1.5, p: MINERAL.ferrite, sprite: 'i_picareta', desc: 'Abre ardósia e os primeiros veios.' },
  { id: 'drill_ember', nome: 'Broca de Ember', nivel: 3, poder: 2.1, p: MINERAL.emberiron, sprite: 'i_broca', desc: 'Aquece a rocha até ela ceder.' },
  { id: 'laser_kael', nome: 'Laser mineiro Kael', nivel: 4, poder: 2.9, p: MINERAL.kaelite, sprite: 'i_laser', desc: 'Corta Mirrorstone e Tidebrick.' },
  { id: 'bore_ossium', nome: 'Perfurador de Ossium', nivel: 5, poder: 3.8, p: MINERAL.ossium, sprite: 'i_perfurador', desc: 'Feito do osso que resistiu a tudo.' },
  { id: 'extractor_phase', nome: 'Extractor de Fase', nivel: 6, poder: 4.8, p: MINERAL.veilstone, sprite: 'i_extractor', desc: 'Arranca blocos que não deviam sair.' },
  { id: 'tool_architect', nome: 'Mão dos Architects', nivel: 7, poder: 6.5, p: MINERAL.nullstone, sprite: 'i_mao', desc: 'Não parece uma ferramenta. Manipula matéria.' },
];

for (const f of FERRAMENTAS) {
  reg({
    id: f.id, nome: f.nome, categoria: 'ferramenta', sprite: f.sprite, paleta: f.p, pilha: 1,
    variante: f.id === 'pick_stone' ? 0 : 1,
    ferramenta: { nivel: f.nivel, poder: f.poder },
    arma: { dano: 4 + f.nivel * 3, alcance: 1.2, cadencia: 0.45, arco: 1.5, empurrao: 3 },
    desc: `${f.desc} · Parte blocos até ao nível ${f.nivel}.`,
  });
}

// --- Armas corpo a corpo -----------------------------------------------------
interface DefArma {
  id: string;
  nome: string;
  sprite: string;
  p: Paleta;
  dano: number;
  alcance: number;
  cadencia: number;
  arco: number;
  empurrao: number;
  extra?: Partial<ArmaStats>;
  desc: string;
}

const ARMAS: DefArma[] = [
  {
    id: 'rust_cleaver', nome: 'Rust Cleaver', sprite: 'i_cutelo', p: MINERAL.ferrite,
    dano: 11, alcance: 1.5, cadencia: 0.38, arco: 1.9, empurrao: 5, desc: 'Ferro enferrujado de uma expedição perdida.',
  },
  {
    id: 'pickblade', nome: 'Miner Pickblade', sprite: 'i_picalamina', p: MINERAL.tinshade,
    dano: 13, alcance: 1.35, cadencia: 0.42, arco: 1.7, empurrao: 4, desc: 'Mina e mata sem trocar de mão.',
  },
  {
    id: 'rootfang', nome: 'Rootfang', sprite: 'i_presa', p: MINERAL.verdglass,
    dano: 16, alcance: 1.25, cadencia: 0.3, arco: 1.6, empurrao: 3, extra: { roubo: 0.22 },
    desc: 'Rouba vida a cada golpe.',
  },
  {
    id: 'ember_maul', nome: 'Ember Maul', sprite: 'i_martelo', p: MINERAL.emberiron,
    dano: 30, alcance: 1.5, cadencia: 0.8, arco: 2.4, empurrao: 12, extra: { area: 1.6 },
    desc: 'Cada pancada abre um raio de brasa.',
  },
  {
    id: 'kael_glaive', nome: 'Kael Glaive', sprite: 'i_alabarda', p: MINERAL.kaelite,
    dano: 26, alcance: 2.4, cadencia: 0.5, arco: 1.1, empurrao: 8, desc: 'Alcance de lança Kael.',
  },
  {
    id: 'storm_sabre', nome: 'Storm Sabre', sprite: 'i_sabre', p: MINERAL.stormglass,
    dano: 34, alcance: 1.6, cadencia: 0.32, arco: 2, empurrao: 6, extra: { critico: 0.25 },
    desc: 'Acumula carga e descarrega-a no alvo.',
  },
  {
    id: 'bone_reaver', nome: 'Bone Reaver', sprite: 'i_machado', p: MINERAL.ossium,
    dano: 44, alcance: 1.7, cadencia: 0.6, arco: 2.2, empurrao: 10, extra: { critico: 0.35, roubo: 0.1 },
    desc: 'Críticos brutais. O osso lembra-se.',
  },
  {
    id: 'phase_edge', nome: 'Phase Edge', sprite: 'i_espada', p: MINERAL.veilstone,
    dano: 52, alcance: 1.7, cadencia: 0.34, arco: 2, empurrao: 7, extra: { perfuraArmadura: 0.6 },
    desc: 'Atravessa parte da armadura do alvo.',
  },
  {
    id: 'starbreaker', nome: 'Starbreaker', sprite: 'i_malho', p: MINERAL.starshard,
    dano: 78, alcance: 1.8, cadencia: 0.75, arco: 2.6, empurrao: 16, extra: { area: 2.4, critico: 0.2 },
    desc: 'Feito com o que sobrou de um guardião.',
  },
  {
    id: 'nullblade', nome: 'Nullblade', sprite: 'i_nullblade', p: MINERAL.nullstone,
    dano: 92, alcance: 1.9, cadencia: 0.3, arco: 2.1, empurrao: 9,
    extra: { perfuraArmadura: 1, critico: 0.3 }, desc: 'Ignora armadura. Ignora quase tudo.',
  },
];

for (const a of ARMAS) {
  reg({
    id: a.id, nome: a.nome, categoria: 'arma', sprite: a.sprite, paleta: a.p, pilha: 1,
    arma: { dano: a.dano, alcance: a.alcance, cadencia: a.cadencia, arco: a.arco, empurrao: a.empurrao, ...a.extra },
    desc: `${a.dano} de dano · ${a.desc}`,
  });
}

// --- Armas à distância -------------------------------------------------------
const DISTANCIA: DefArma[] = [
  {
    id: 'scrap_bow', nome: 'Scrap Bow', sprite: 'i_arco', p: MINERAL.ferrite,
    dano: 14, alcance: 9, cadencia: 0.55, arco: 0.4, empurrao: 3,
    extra: { projectil: { velocidade: 14, cor: '#d9b48f' } }, desc: 'Improvisado com sucata e fibra.',
  },
  {
    id: 'thorncaster', nome: 'Thorncaster', sprite: 'i_besta', p: MINERAL.verdglass,
    dano: 20, alcance: 10, cadencia: 0.45, arco: 0.4, empurrao: 3,
    extra: { projectil: { velocidade: 15, cor: '#8fffc4' } }, desc: 'A munição volta a crescer sozinha.',
  },
  {
    id: 'bolt_driver', nome: 'Bolt Driver', sprite: 'i_rebitadora', p: MINERAL.kaelite,
    dano: 32, alcance: 11, cadencia: 0.62, arco: 0.35, empurrao: 8,
    extra: { projectil: { velocidade: 18, cor: '#6de0ff', perfura: 1 } }, desc: 'Dispara rebites que atravessam um alvo.',
  },
  {
    id: 'arc_rifle', nome: 'Arc Rifle', sprite: 'i_espingarda', p: MINERAL.stormglass,
    dano: 38, alcance: 12, cadencia: 0.5, arco: 0.3, empurrao: 5,
    extra: { projectil: { velocidade: 22, cor: '#d9c2ff', salta: 2 } }, desc: 'O disparo salta entre inimigos.',
  },
  {
    id: 'pressure_lance', nome: 'Pressure Lance', sprite: 'i_jacto', p: MINERAL.abysspearl,
    dano: 46, alcance: 10, cadencia: 0.42, arco: 0.35, empurrao: 10,
    extra: { projectil: { velocidade: 19, cor: '#b6ffff' } }, desc: 'Jacto de alta pressão do Drowned Kingdom.',
  },
  {
    id: 'phase_rifle', nome: 'Phase Rifle', sprite: 'i_canhao', p: MINERAL.veilstone,
    dano: 60, alcance: 13, cadencia: 0.55, arco: 0.3, empurrao: 6,
    extra: { projectil: { velocidade: 24, cor: '#d5a8ff', perfura: 3 } }, desc: 'Os tiros atravessam paredes finas.',
  },
  {
    id: 'starcaster', nome: 'Starcaster', sprite: 'i_bastao', p: MINERAL.starshard,
    dano: 84, alcance: 14, cadencia: 0.6, arco: 0.3, empurrao: 12,
    extra: { projectil: { velocidade: 20, cor: '#fff3b0', perfura: 2, salta: 1 } },
    desc: 'Transforma Starshards em projécteis.',
  },
];

for (const a of DISTANCIA) {
  reg({
    id: a.id, nome: a.nome, categoria: 'arma', sprite: a.sprite, paleta: a.p, pilha: 1,
    arma: { dano: a.dano, alcance: a.alcance, cadencia: a.cadencia, arco: a.arco, empurrao: a.empurrao, ...a.extra },
    desc: `${a.dano} de dano à distância · ${a.desc}`,
  });
}

// --- Armaduras ---------------------------------------------------------------
export interface ConjuntoArmadura {
  chave: string;
  nome: string;
  p: Paleta;
  defesa: number;
  bonus: string;
}

export const CONJUNTOS: ConjuntoArmadura[] = [
  { chave: 'delver', nome: 'Delver', p: MINERAL.ferrite, defesa: 3, bonus: 'Movimento e mineração mais rápidos.' },
  { chave: 'mycel', nome: 'Mycel', p: MINERAL.verdglass, defesa: 5, bonus: 'Regeneração constante.' },
  { chave: 'forgemaster', nome: 'Forgemaster', p: MINERAL.emberiron, defesa: 8, bonus: 'Resistência ao calor.' },
  { chave: 'stormwalker', nome: 'Stormwalker', p: MINERAL.stormglass, defesa: 10, bonus: 'Velocidade e dano eléctrico.' },
  { chave: 'abyss', nome: 'Abyss Diver', p: MINERAL.abysspearl, defesa: 12, bonus: 'Fôlego debaixo de água.' },
  { chave: 'ossuary', nome: 'Ossuary', p: MINERAL.ossium, defesa: 15, bonus: 'Críticos e roubo de vida.' },
  { chave: 'veilwalker', nome: 'Veilwalker', p: MINERAL.veilstone, defesa: 18, bonus: 'Evasão e passo de fase.' },
  { chave: 'starborn', nome: 'Starborn', p: MINERAL.starshard, defesa: 24, bonus: 'Interage com os fragmentos de Veyra.' },
];

const PECAS: { slot: ArmaduraStats['slot']; nome: string; sprite: string; mult: number }[] = [
  { slot: 'cabeca', nome: 'Elmo', sprite: 'i_elmo', mult: 0.8 },
  { slot: 'peito', nome: 'Peitoral', sprite: 'i_peitoral', mult: 1.3 },
  { slot: 'pernas', nome: 'Grevas', sprite: 'i_grevas', mult: 0.9 },
];

CONJUNTOS.forEach((conj, iConj) => {
  for (const peca of PECAS) {
    reg({
      id: `${peca.slot}_${conj.chave}`,
      nome: `${peca.nome} ${conj.nome}`,
      categoria: 'armadura',
      sprite: peca.sprite,
      paleta: conj.p,
      pilha: 1,
      variante: iConj,
      armadura: { slot: peca.slot, defesa: Math.round(conj.defesa * peca.mult), conjunto: conj.chave },
      desc: `Conjunto ${conj.nome} — ${conj.bonus}`,
    });
  }
});

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(defs.map((d) => [d.id, d]));

export function itemDef(id: string): ItemDef | undefined {
  return ITEMS[id];
}

export function itemNome(id: string): string {
  return ITEMS[id]?.nome ?? id;
}

/** Usado quando não há nada equipado. */
export const PUNHOS: ItemDef = {
  id: 'punhos',
  nome: 'Mãos nuas',
  categoria: 'arma',
  sprite: 'i_espada',
  paleta: paleta('#2a1d18', '#5d4436', '#8a6a52', '#b08a6a', '#d9b48f'),
  pilha: 1,
  ferramenta: { nivel: 1, poder: 0.3 },
  arma: { dano: 4, alcance: 1.05, cadencia: 0.5, arco: 1.5, empurrao: 2 },
};

/** Bónus de conjunto completo. */
export function bonusConjunto(conjunto: string): { velocidade: number; poder: number; regen: number; evasao: number } {
  switch (conjunto) {
    case 'delver':
      return { velocidade: 0.6, poder: 0.35, regen: 0, evasao: 0 };
    case 'mycel':
      return { velocidade: 0.2, poder: 0.1, regen: 1.6, evasao: 0 };
    case 'forgemaster':
      return { velocidade: -0.2, poder: 0.3, regen: 0.4, evasao: 0 };
    case 'stormwalker':
      return { velocidade: 1.2, poder: 0.3, regen: 0.2, evasao: 0.08 };
    case 'abyss':
      return { velocidade: 0.6, poder: 0.4, regen: 0.8, evasao: 0.05 };
    case 'ossuary':
      return { velocidade: 0.4, poder: 0.5, regen: 1, evasao: 0.05 };
    case 'veilwalker':
      return { velocidade: 1.4, poder: 0.6, regen: 0.8, evasao: 0.22 };
    case 'starborn':
      return { velocidade: 1.6, poder: 1, regen: 2.4, evasao: 0.18 };
    default:
      return { velocidade: 0, poder: 0, regen: 0, evasao: 0 };
  }
}
