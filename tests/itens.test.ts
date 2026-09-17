import { describe, expect, it } from 'vitest';
import { BLOCKS, blockDef, GROUNDS } from '../src/world/tiles';
import { CONJUNTOS, ITEMS, itemDef } from '../src/game/items';
import { Inventory, TAMANHO_HOTBAR } from '../src/game/inventory';
import { criar, podeCriar, receitasDe, RECEITAS, validarReceitas } from '../src/game/crafting';
import { ELITES, INIMIGOS, sortearElite } from '../src/entities/enemies';

describe('coerência dos registos', () => {
  it('todos os blocos largam itens que existem', () => {
    for (const b of BLOCKS) {
      for (const d of b.drops) expect(itemDef(d.item), `${b.nome} larga ${d.item}`).toBeDefined();
    }
  });

  it('os ids dos blocos e chãos batem certo com a posição no array', () => {
    BLOCKS.forEach((b, i) => expect(b.id, b.nome).toBe(i));
    GROUNDS.forEach((g, i) => expect(g.id, g.nome).toBe(i));
  });

  it('todos os itens colocáveis apontam para blocos válidos', () => {
    for (const item of Object.values(ITEMS)) {
      if (item.coloca === undefined) continue;
      expect(blockDef(item.coloca).id, item.nome).toBe(item.coloca);
      expect(blockDef(item.coloca).nome, item.nome).not.toBe('—');
    }
  });

  it('todas as criaturas largam itens que existem', () => {
    for (const d of Object.values(INIMIGOS)) {
      for (const q of d.quedas) expect(itemDef(q.item), `${d.nome} larga ${q.item}`).toBeDefined();
    }
  });

  it('não há receitas com itens desconhecidos', () => {
    expect(validarReceitas()).toEqual([]);
  });

  it('todas as armas e ferramentas têm forma de ser obtidas', () => {
    const saidas = new Set(RECEITAS.map((r) => r.saida.item));
    const inicio = new Set(['pick_stone', 'rust_cleaver', 'torch', 'glowfruit']);
    for (const item of Object.values(ITEMS)) {
      if (item.categoria !== 'arma' && item.categoria !== 'ferramenta' && item.categoria !== 'armadura') continue;
      expect(saidas.has(item.id) || inicio.has(item.id), `${item.nome} não se consegue criar`).toBe(true);
    }
  });

  it('a progressão de ferramentas chega ao bloco mais duro', () => {
    const nivelMaximoBloco = Math.max(...BLOCKS.filter((b) => b.minavel && !b.invulneravel).map((b) => b.nivel));
    const nivelMaximoFerramenta = Math.max(
      ...Object.values(ITEMS).filter((i) => i.ferramenta).map((i) => i.ferramenta!.nivel),
    );
    expect(nivelMaximoFerramenta).toBeGreaterThanOrEqual(nivelMaximoBloco);
  });

  it('cada conjunto de armadura tem as três peças', () => {
    for (const conj of CONJUNTOS) {
      for (const slot of ['cabeca', 'peito', 'pernas']) {
        expect(itemDef(`${slot}_${conj.chave}`), `${slot}_${conj.chave}`).toBeDefined();
      }
    }
  });

  it('os fragmentos dos guardiões são todos itens reais', () => {
    for (const d of Object.values(INIMIGOS)) {
      if (!d.chefe) continue;
      const fragmento = d.quedas.find((q) => q.item.startsWith('fragmento_') || q.item === 'architect_key');
      expect(fragmento, `${d.nome} não larga fragmento`).toBeDefined();
    }
  });
});

describe('elites', () => {
  it('nunca sorteia elites à superfície com demasiada frequência', () => {
    let contados = 0;
    for (let i = 0; i < 500; i++) if (sortearElite(0)) contados++;
    expect(contados / 500).toBeLessThan(0.08);
  });

  it('aumenta a probabilidade em profundidade', () => {
    let perto = 0;
    let longe = 0;
    for (let i = 0; i < 2000; i++) {
      if (sortearElite(0)) perto++;
      if (sortearElite(1200)) longe++;
    }
    expect(longe).toBeGreaterThan(perto);
  });

  it('todas as mutações reforçam a criatura', () => {
    for (const e of ELITES) {
      expect(e.vida).toBeGreaterThan(1);
      expect(e.dano).toBeGreaterThan(1);
    }
  });
});

describe('inventário', () => {
  it('empilha antes de ocupar slots novos', () => {
    const inv = new Inventory();
    inv.adicionar('slate', 5);
    inv.adicionar('slate', 7);
    expect(inv.contar('slate')).toBe(12);
    expect(inv.slots.filter(Boolean)).toHaveLength(1);
  });

  it('respeita o tamanho máximo de pilha', () => {
    const inv = new Inventory();
    inv.adicionar('pick_ferrite', 3);
    expect(inv.slots.filter((s) => s?.item === 'pick_ferrite')).toHaveLength(3);
  });

  it('devolve o que não coube', () => {
    const inv = new Inventory();
    for (let i = 0; i < inv.slots.length; i++) inv.slots[i] = { item: 'pick_ferrite', quantidade: 1 };
    expect(inv.adicionar('slate', 4)).toBe(4);
  });

  it('remove só quando há quantidade suficiente', () => {
    const inv = new Inventory();
    inv.adicionar('ironroot', 3);
    expect(inv.remover('ironroot', 5)).toBe(false);
    expect(inv.remover('ironroot', 3)).toBe(true);
    expect(inv.contar('ironroot')).toBe(0);
  });

  it('troca e junta pilhas iguais', () => {
    const inv = new Inventory();
    inv.slots[0] = { item: 'slate', quantidade: 5 };
    inv.slots[9] = { item: 'slate', quantidade: 2 };
    inv.trocar(0, 9);
    expect(inv.slots[0]).toBeNull();
    expect(inv.slots[9]?.quantidade).toBe(7);
  });

  it('equipa armadura, soma defesa e reconhece o conjunto completo', () => {
    const inv = new Inventory();
    inv.adicionar('peito_ossuary', 1);
    expect(inv.equipar(0)).toBe(true);
    expect(inv.equipamento.peito).toBe('peito_ossuary');
    expect(inv.defesaTotal()).toBeGreaterThan(0);
    expect(inv.conjuntoCompleto()).toBeNull();

    inv.adicionar('cabeca_ossuary', 1);
    inv.equipar(0);
    inv.adicionar('pernas_ossuary', 1);
    inv.equipar(0);
    expect(inv.conjuntoCompleto()).toBe('ossuary');

    expect(inv.desequipar('peito')).toBe(true);
    expect(inv.conjuntoCompleto()).toBeNull();
  });

  it('sobrevive a uma gravação estragada', () => {
    const inv = Inventory.de({
      slots: [{ item: 'item_que_nao_existe', quantidade: 4 }],
      equipamento: { cabeca: 'nada', peito: null, pernas: null },
      selecionado: 99,
    } as never);
    expect(inv.slots[0]).toBeNull();
    expect(inv.equipamento.cabeca).toBeNull();
    expect(inv.selecionado).toBeLessThan(TAMANHO_HOTBAR);
  });
});

describe('criação', () => {
  it('só deixa criar com todos os ingredientes', () => {
    const inv = new Inventory();
    const bancada = receitasDe(null).find((r) => r.saida.item === 'workbench')!;
    expect(podeCriar(bancada, inv)).toBe(false);
    inv.adicionar('ironroot', 8);
    expect(podeCriar(bancada, inv)).toBe(true);
    expect(criar(bancada, inv)).toBe(true);
    expect(inv.contar('ironroot')).toBe(0);
    expect(inv.contar('workbench')).toBe(1);
  });

  it('funde minério em lingotes na forja', () => {
    const inv = new Inventory();
    inv.adicionar('minerio_ferrite', 6);
    const barra = receitasDe('forja').find((r) => r.saida.item === 'barra_ferrite')!;
    expect(criar(barra, inv)).toBe(true);
    expect(criar(barra, inv)).toBe(true);
    expect(criar(barra, inv)).toBe(false);
    expect(inv.contar('barra_ferrite')).toBe(2);
  });

  it('exige fragmentos de guardião para o equipamento final', () => {
    const nullblade = receitasDe('fundicao').find((r) => r.saida.item === 'nullblade')!;
    expect(nullblade.custo.some((c) => c.item.startsWith('fragmento_'))).toBe(true);
  });
});
