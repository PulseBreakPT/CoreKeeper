/** Inventário: 8 slots de acesso rápido, 24 na mochila e 3 de equipamento. */

import { itemDef, type ItemDef } from './items';

export interface Slot {
  item: string;
  quantidade: number;
}

export const TAMANHO_HOTBAR = 8;
export const TAMANHO_MOCHILA = 24;
export const TOTAL_SLOTS = TAMANHO_HOTBAR + TAMANHO_MOCHILA;

export type SlotEquipamento = 'cabeca' | 'peito' | 'pernas';

export interface EstadoInventario {
  slots: (Slot | null)[];
  equipamento: Record<SlotEquipamento, string | null>;
  selecionado: number;
}

export class Inventory {
  slots: (Slot | null)[] = new Array(TOTAL_SLOTS).fill(null);
  equipamento: Record<SlotEquipamento, string | null> = { cabeca: null, peito: null, pernas: null };
  selecionado = 0;

  /** Junta a pilhas existentes e só depois ocupa slots vazios. Devolve o que não coube. */
  adicionar(item: string, quantidade: number): number {
    const def = itemDef(item);
    if (!def) return quantidade;
    let resto = quantidade;
    for (let i = 0; i < this.slots.length && resto > 0; i++) {
      const s = this.slots[i];
      if (s && s.item === item && s.quantidade < def.pilha) {
        const cabe = Math.min(def.pilha - s.quantidade, resto);
        s.quantidade += cabe;
        resto -= cabe;
      }
    }
    for (let i = 0; i < this.slots.length && resto > 0; i++) {
      if (!this.slots[i]) {
        const cabe = Math.min(def.pilha, resto);
        this.slots[i] = { item, quantidade: cabe };
        resto -= cabe;
      }
    }
    return resto;
  }

  contar(item: string): number {
    let n = 0;
    for (const s of this.slots) if (s?.item === item) n += s.quantidade;
    return n;
  }

  remover(item: string, quantidade: number): boolean {
    if (this.contar(item) < quantidade) return false;
    let resto = quantidade;
    for (let i = 0; i < this.slots.length && resto > 0; i++) {
      const s = this.slots[i];
      if (!s || s.item !== item) continue;
      const tira = Math.min(s.quantidade, resto);
      s.quantidade -= tira;
      resto -= tira;
      if (s.quantidade <= 0) this.slots[i] = null;
    }
    return true;
  }

  temEspaco(item: string, quantidade: number): boolean {
    const def = itemDef(item);
    if (!def) return false;
    let livre = 0;
    for (const s of this.slots) {
      if (!s) livre += def.pilha;
      else if (s.item === item) livre += def.pilha - s.quantidade;
      if (livre >= quantidade) return true;
    }
    return livre >= quantidade;
  }

  trocar(a: number, b: number): void {
    if (a < 0 || b < 0 || a >= this.slots.length || b >= this.slots.length || a === b) return;
    const sa = this.slots[a];
    const sb = this.slots[b];
    // Empilha se forem o mesmo item e houver espaço.
    if (sa && sb && sa.item === sb.item) {
      const def = itemDef(sa.item);
      if (def) {
        const move = Math.min(sa.quantidade, def.pilha - sb.quantidade);
        if (move > 0) {
          sb.quantidade += move;
          sa.quantidade -= move;
          if (sa.quantidade <= 0) this.slots[a] = null;
          return;
        }
      }
    }
    this.slots[a] = sb;
    this.slots[b] = sa;
  }

  slotSelecionado(): Slot | null {
    return this.slots[this.selecionado] ?? null;
  }

  itemSelecionado(): ItemDef | undefined {
    const s = this.slotSelecionado();
    return s ? itemDef(s.item) : undefined;
  }

  /** Gasta uma unidade do slot indicado (para colocar blocos ou comer). */
  gastar(indice: number, quantidade = 1): boolean {
    const s = this.slots[indice];
    if (!s || s.quantidade < quantidade) return false;
    s.quantidade -= quantidade;
    if (s.quantidade <= 0) this.slots[indice] = null;
    return true;
  }

  /** Equipa uma peça de armadura, devolvendo ao inventário a que estava. */
  equipar(indice: number): boolean {
    const s = this.slots[indice];
    if (!s) return false;
    const def = itemDef(s.item);
    if (!def?.armadura) return false;
    const slot = def.armadura.slot;
    const anterior = this.equipamento[slot];
    this.equipamento[slot] = s.item;
    this.slots[indice] = anterior ? { item: anterior, quantidade: 1 } : null;
    return true;
  }

  desequipar(slot: SlotEquipamento): boolean {
    const atual = this.equipamento[slot];
    if (!atual) return false;
    if (!this.temEspaco(atual, 1)) return false;
    this.equipamento[slot] = null;
    this.adicionar(atual, 1);
    return true;
  }

  /** Conjunto de armadura completo, ou null se as três peças não combinarem. */
  conjuntoCompleto(): string | null {
    const cabeca = this.equipamento.cabeca ? itemDef(this.equipamento.cabeca)?.armadura?.conjunto : undefined;
    const peito = this.equipamento.peito ? itemDef(this.equipamento.peito)?.armadura?.conjunto : undefined;
    const pernas = this.equipamento.pernas ? itemDef(this.equipamento.pernas)?.armadura?.conjunto : undefined;
    return cabeca && cabeca === peito && peito === pernas ? cabeca : null;
  }

  /** Soma da defesa das peças equipadas. */
  defesaTotal(): number {
    let d = 0;
    for (const id of Object.values(this.equipamento)) {
      if (!id) continue;
      d += itemDef(id)?.armadura?.defesa ?? 0;
    }
    return d;
  }

  estado(): EstadoInventario {
    return { slots: this.slots, equipamento: this.equipamento, selecionado: this.selecionado };
  }

  static de(estado: EstadoInventario | undefined): Inventory {
    const inv = new Inventory();
    if (!estado) return inv;
    if (Array.isArray(estado.slots)) {
      for (let i = 0; i < Math.min(TOTAL_SLOTS, estado.slots.length); i++) {
        const s = estado.slots[i];
        inv.slots[i] = s && itemDef(s.item) ? { item: s.item, quantidade: s.quantidade } : null;
      }
    }
    if (estado.equipamento) {
      for (const slot of ['cabeca', 'peito', 'pernas'] as SlotEquipamento[]) {
        const id = estado.equipamento[slot];
        inv.equipamento[slot] = id && itemDef(id) ? id : null;
      }
    }
    inv.selecionado = Math.max(0, Math.min(TAMANHO_HOTBAR - 1, estado.selecionado ?? 0));
    return inv;
  }
}
