/** Receitas. Cada estação representa uma era tecnológica de The Hollow. */

import type { StationKind } from '../world/tiles';
import type { Inventory } from './inventory';
import { CONJUNTOS, itemDef } from './items';

export interface Ingrediente {
  item: string;
  quantidade: number;
}

export interface Receita {
  id: string;
  saida: Ingrediente;
  custo: Ingrediente[];
  estacao: StationKind | null;
}

const receitas: Receita[] = [];

function r(saida: string, quantidade: number, estacao: StationKind | null, ...custo: [string, number][]): void {
  receitas.push({
    id: `${estacao ?? 'mao'}:${saida}`,
    saida: { item: saida, quantidade },
    custo: custo.map(([item, q]) => ({ item, quantidade: q })),
    estacao,
  });
}

// --- À mão -------------------------------------------------------------------
r('torch', 4, null, ['ironroot', 1], ['fibra', 2]);
r('workbench', 1, null, ['ironroot', 8]);
r('pick_stone', 1, null, ['slate', 6], ['fibra', 2]);

// --- Bancada -----------------------------------------------------------------
r('forge', 1, 'bancada', ['slate', 20], ['deepclay', 10]);
r('hearth', 1, 'bancada', ['slate', 12], ['ironroot', 6]);
r('foundry', 1, 'bancada', ['barra_ferrite', 8], ['machineplate', 4]);
r('fabricator', 1, 'bancada', ['barra_kaelite', 10], ['machineplate', 8], ['livingcrystal', 2]);
r('cot', 1, 'bancada', ['ironroot', 10], ['fibra', 12]);
r('plankwall', 4, 'bancada', ['lumibark', 2]);
r('brickwall', 4, 'bancada', ['forgebrick', 2]);
r('lajes', 4, 'bancada', ['slate', 2]);
r('glowlamp', 1, 'bancada', ['glowmoss', 4], ['lumibark', 2]);
r('pick_ferrite', 1, 'bancada', ['barra_ferrite', 5], ['ironroot', 2]);
r('scrap_bow', 1, 'bancada', ['ironroot', 6], ['fibra', 8]);
r('thorncaster', 1, 'bancada', ['lumibark', 6], ['fibra', 10], ['barra_verdglass', 2]);

// --- Forja (fundir minério) ---------------------------------------------------
const FUNDICOES: [string, string, [string, number][]][] = [
  ['barra_ferrite', 'minerio_ferrite', []],
  ['barra_tinshade', 'minerio_tinshade', []],
  ['barra_verdglass', 'minerio_verdglass', []],
  ['barra_emberiron', 'minerio_emberiron', [['slag', 1]]],
  ['barra_kaelite', 'minerio_kaelite', []],
  ['barra_palesilver', 'minerio_palesilver', []],
  ['barra_stormglass', 'minerio_stormglass', [['shatterglass', 1]]],
  ['barra_abysspearl', 'minerio_abysspearl', []],
  ['barra_ossium', 'minerio_ossium', [['bonewall', 1]]],
  ['barra_veilore', 'minerio_veilore', [['veilstone', 1]]],
];

for (const [barra, minerio, extra] of FUNDICOES) {
  r(barra, 1, 'forja', [minerio, 3], ...extra);
}
r('forgebrick', 4, 'forja', ['deepclay', 4], ['slag', 1]);
r('pressureglass', 2, 'forja', ['shatterglass', 4], ['slate', 2]);

// --- Fundição de Arco (equipamento) -------------------------------------------
const ARMAS_RECEITA: [string, [string, number][]][] = [
  ['rust_cleaver', [['barra_ferrite', 5], ['ironroot', 2]]],
  ['pickblade', [['barra_tinshade', 4], ['barra_ferrite', 2], ['ironroot', 2]]],
  ['rootfang', [['barra_verdglass', 5], ['fibra', 6]]],
  ['ember_maul', [['barra_emberiron', 8], ['ironroot', 3]]],
  ['kael_glaive', [['barra_kaelite', 6], ['machineplate', 3]]],
  ['storm_sabre', [['barra_stormglass', 7], ['livingcrystal', 2]]],
  ['bone_reaver', [['barra_ossium', 8], ['marrowstone', 4]]],
  ['phase_edge', [['barra_veilore', 8], ['phaseglass', 3]]],
  ['starbreaker', [['starshard', 6], ['barra_ossium', 6], ['fragmento_dominion', 1]]],
  ['nullblade', [['nullstone', 8], ['starshard', 4], ['fragmento_memory', 1]]],
];
for (const [id, custo] of ARMAS_RECEITA) r(id, 1, 'fundicao', ...custo);

r('drill_ember', 1, 'fundicao', ['barra_emberiron', 6], ['machineplate', 2]);
r('bore_ossium', 1, 'fundicao', ['barra_ossium', 6], ['marrowstone', 4]);

const BARRA_CONJUNTO: Record<string, [string, number][]> = {
  delver: [['barra_ferrite', 4]],
  mycel: [['barra_verdglass', 4], ['micelio', 4]],
  forgemaster: [['barra_emberiron', 5]],
  stormwalker: [['barra_stormglass', 5], ['mirrorstone', 2]],
  abyss: [['barra_abysspearl', 5], ['pressureglass', 2]],
  ossuary: [['barra_ossium', 6], ['marrowstone', 3]],
  veilwalker: [['barra_veilore', 6], ['phaseglass', 3]],
  starborn: [['starshard', 5], ['nullstone', 4]],
};

const MULT_PECA: Record<string, number> = { cabeca: 1, peito: 1.6, pernas: 1.3 };

for (const conj of CONJUNTOS) {
  const base = BARRA_CONJUNTO[conj.chave];
  if (!base) continue;
  for (const slot of ['cabeca', 'peito', 'pernas']) {
    const custo = base.map(([i, q]) => [i, Math.ceil(q * MULT_PECA[slot])] as [string, number]);
    r(`${slot}_${conj.chave}`, 1, 'fundicao', ...custo);
  }
}

// --- Lareira (cozinha) --------------------------------------------------------
r('sporecake', 1, 'fogao', ['sporecap', 3], ['ambersap', 1]);
r('bonebroth', 1, 'fogao', ['carne_crua', 2], ['bonewall', 1], ['glowfruit', 1]);
r('phasenectar', 1, 'fogao', ['ambersap', 2], ['veilstone', 1], ['livingcrystal', 1]);
r('emberroot', 2, 'fogao', ['glowfruit', 2], ['slag', 1]);
r('stormberry', 2, 'fogao', ['glowfruit', 2], ['stormsand', 2]);

// --- Fabricador Kael ----------------------------------------------------------
r('laser_kael', 1, 'fabricador', ['barra_kaelite', 6], ['livingcrystal', 2]);
r('extractor_phase', 1, 'fabricador', ['barra_veilore', 6], ['phaseglass', 4]);
r('tool_architect', 1, 'fabricador', ['nullstone', 6], ['starshard', 4], ['architect_key', 1]);
r('bolt_driver', 1, 'fabricador', ['barra_kaelite', 6], ['machineplate', 4]);
r('arc_rifle', 1, 'fabricador', ['barra_stormglass', 6], ['mirrorstone', 3]);
r('pressure_lance', 1, 'fabricador', ['barra_abysspearl', 6], ['pressureglass', 3]);
r('phase_rifle', 1, 'fabricador', ['barra_veilore', 6], ['phaseglass', 4]);
r('starcaster', 1, 'fabricador', ['starshard', 5], ['nullstone', 3]);
r('stormlamp', 1, 'fabricador', ['barra_stormglass', 2], ['shatterglass', 4]);
r('starbeacon', 1, 'fabricador', ['starshard', 2], ['nullstone', 2]);
r('placa_kael', 4, 'fabricador', ['machineplate', 2]);

export const RECEITAS: Receita[] = receitas;

export function receitasDe(estacao: StationKind | null): Receita[] {
  return RECEITAS.filter((rec) => rec.estacao === estacao);
}

export function podeCriar(receita: Receita, inv: Inventory): boolean {
  return receita.custo.every((c) => inv.contar(c.item) >= c.quantidade);
}

export function criar(receita: Receita, inv: Inventory): boolean {
  if (!podeCriar(receita, inv)) return false;
  if (!inv.temEspaco(receita.saida.item, receita.saida.quantidade)) return false;
  for (const c of receita.custo) inv.remover(c.item, c.quantidade);
  inv.adicionar(receita.saida.item, receita.saida.quantidade);
  return true;
}

export function nomeEstacao(estacao: StationKind | null): string {
  switch (estacao) {
    case null: return 'Improviso';
    case 'bancada': return 'Bancada';
    case 'forja': return 'Forja';
    case 'fundicao': return 'Fundição de Arco';
    case 'fogao': return 'Lareira';
    case 'fabricador': return 'Fabricador Kael';
    case 'capsula': return 'Cápsula';
    case 'rele': return 'Relé dos Architects';
    default: return String(estacao);
  }
}

/** Sanidade: garante que toda a receita produz e consome itens conhecidos. */
export function validarReceitas(): string[] {
  const erros: string[] = [];
  for (const rec of RECEITAS) {
    if (!itemDef(rec.saida.item)) erros.push(`saída desconhecida: ${rec.saida.item}`);
    for (const c of rec.custo) {
      if (!itemDef(c.item)) erros.push(`ingrediente desconhecido: ${c.item} (${rec.id})`);
    }
  }
  return erros;
}
