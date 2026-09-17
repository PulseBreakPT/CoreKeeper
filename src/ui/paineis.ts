/** Painel de mochila + criação. Funciona a toques: escolher, trocar, usar, criar. */

import { audio } from '../core/audio';
import { criar, nomeEstacao, podeCriar, receitasDe, type Receita } from '../game/crafting';
import type { Game } from '../game/game';
import { TAMANHO_HOTBAR, TOTAL_SLOTS, type SlotEquipamento } from '../game/inventory';
import { itemDef } from '../game/items';
import type { StationKind } from '../world/tiles';
import { iconeItem } from './icones';

const SLOTS_EQUIPAMENTO: { slot: SlotEquipamento; rotulo: string }[] = [
  { slot: 'cabeca', rotulo: 'Cabeça' },
  { slot: 'peito', rotulo: 'Peito' },
  { slot: 'pernas', rotulo: 'Pernas' },
];

export class PainelInventario {
  readonly raiz: HTMLElement;
  aberto = false;
  private jogo: Game | null = null;
  private estacao: StationKind | null = null;
  private escolhido: number | null = null;
  private grelha!: HTMLElement;
  private listaReceitas!: HTMLElement;
  private titulo!: HTMLElement;
  private equipamento!: HTMLElement;
  private rodape!: HTMLElement;
  private abaAtual: 'mochila' | 'criar' = 'mochila';
  /** Linhas de receita já construídas, para não refazer o DOM a cada frame. */
  private linhasReceita: { receita: Receita; el: HTMLElement; custos: HTMLElement[] }[] = [];
  private estacaoDesenhada: StationKind | null | undefined = undefined;

  constructor(private aoFechar: () => void) {
    this.raiz = document.createElement('div');
    this.raiz.className = 'painel oculto';
    this.raiz.innerHTML = `
      <div class="painel-caixa">
        <header>
          <h2 class="painel-titulo">Mochila</h2>
          <button class="botao-icone painel-fechar" aria-label="Fechar">✕</button>
        </header>
        <nav class="abas">
          <button data-aba="mochila" class="ativa">Mochila</button>
          <button data-aba="criar">Criar</button>
        </nav>
        <section class="aba-mochila">
          <div class="equipamento"></div>
          <div class="grelha"></div>
        </section>
        <section class="aba-criar oculto">
          <div class="receitas"></div>
        </section>
        <footer class="painel-rodape"></footer>
      </div>`;

    this.grelha = this.raiz.querySelector('.grelha') as HTMLElement;
    this.listaReceitas = this.raiz.querySelector('.receitas') as HTMLElement;
    this.titulo = this.raiz.querySelector('.painel-titulo') as HTMLElement;
    this.equipamento = this.raiz.querySelector('.equipamento') as HTMLElement;
    this.rodape = this.raiz.querySelector('.painel-rodape') as HTMLElement;

    this.raiz.querySelector('.painel-fechar')?.addEventListener('click', () => this.fechar());
    this.raiz.addEventListener('pointerdown', (e) => e.stopPropagation());
    for (const b of this.raiz.querySelectorAll<HTMLButtonElement>('[data-aba]')) {
      b.addEventListener('click', () => this.mudarAba(b.dataset.aba as 'mochila' | 'criar'));
    }

    for (let i = 0; i < TOTAL_SLOTS; i++) {
      const el = document.createElement('button');
      el.className = 'socket slot-grande';
      el.dataset.indice = String(i);
      el.innerHTML = '<span class="socket-bisel"></span><img class="icone" alt="" /><span class="contagem"></span>';
      el.addEventListener('click', () => this.tocarSlot(i));
      this.grelha.appendChild(el);
    }

    for (const eq of SLOTS_EQUIPAMENTO) {
      const el = document.createElement('button');
      el.className = 'socket slot-equip';
      el.dataset.equip = eq.slot;
      el.innerHTML = `<span class="socket-bisel"></span><img class="icone" alt="" /><span class="rotulo-equip">${eq.rotulo}</span>`;
      el.addEventListener('click', () => this.tocarEquipamento(eq.slot));
      this.equipamento.appendChild(el);
    }
  }

  abrir(jogo: Game, estacao: StationKind | null): void {
    this.jogo = jogo;
    this.estacao = estacao;
    this.escolhido = null;
    this.aberto = true;
    this.abaAtual = estacao ? 'criar' : 'mochila';
    this.raiz.classList.remove('oculto');
    this.titulo.textContent = estacao ? nomeEstacao(estacao) : 'Mochila';
    this.construirReceitas();
    this.mudarAba(this.abaAtual);
    this.atualizar();
  }

  fechar(): void {
    this.aberto = false;
    this.jogo = null;
    this.raiz.classList.add('oculto');
    this.aoFechar();
  }

  private mudarAba(aba: 'mochila' | 'criar'): void {
    this.abaAtual = aba;
    this.raiz.querySelector('.aba-mochila')?.classList.toggle('oculto', aba !== 'mochila');
    this.raiz.querySelector('.aba-criar')?.classList.toggle('oculto', aba !== 'criar');
    for (const b of this.raiz.querySelectorAll<HTMLButtonElement>('[data-aba]')) {
      b.classList.toggle('ativa', b.dataset.aba === aba);
    }
    this.atualizar();
  }

  private tocarSlot(i: number): void {
    const jogo = this.jogo;
    if (!jogo) return;
    const inv = jogo.inventario;
    if (this.escolhido === null) {
      if (!inv.slots[i]) return;
      this.escolhido = i;
    } else if (this.escolhido === i) {
      // Segundo toque no mesmo slot: usar (equipar, comer) ou pôr na mão.
      const slot = inv.slots[i];
      const def = slot ? itemDef(slot.item) : undefined;
      if (def?.armadura) {
        inv.equipar(i);
        audio.criar();
      } else if (def?.comida) {
        jogo.comer(i);
      } else if (i >= TAMANHO_HOTBAR) {
        const destino = this.primeiroLivreNaHotbar(inv.slots);
        inv.trocar(i, destino);
        inv.selecionado = destino;
      } else {
        inv.selecionado = i;
      }
      this.escolhido = null;
    } else {
      inv.trocar(this.escolhido, i);
      this.escolhido = null;
    }
    this.atualizar();
  }

  private primeiroLivreNaHotbar(slots: unknown[]): number {
    for (let i = 0; i < TAMANHO_HOTBAR; i++) if (!slots[i]) return i;
    return this.jogo?.inventario.selecionado ?? 0;
  }

  private tocarEquipamento(slot: SlotEquipamento): void {
    const jogo = this.jogo;
    if (!jogo) return;
    if (jogo.inventario.desequipar(slot)) audio.apanhar();
    this.atualizar();
  }

  private criarReceita(receita: Receita): void {
    const jogo = this.jogo;
    if (!jogo) return;
    if (criar(receita, jogo.inventario)) {
      audio.criar();
      jogo.texto(
        jogo.player.x,
        jogo.player.y - 1,
        `+${receita.saida.quantidade} ${itemDef(receita.saida.item)?.nome}`,
        '#ffe27a',
      );
    }
    this.atualizar();
  }

  atualizar(): void {
    const jogo = this.jogo;
    if (!jogo || !this.aberto) return;
    const inv = jogo.inventario;

    for (const el of this.grelha.children as HTMLCollectionOf<HTMLElement>) {
      const i = Number(el.dataset.indice);
      const slot = inv.slots[i];
      const img = el.querySelector('img') as HTMLImageElement;
      const contagem = el.querySelector('.contagem') as HTMLElement;
      if (slot) {
        img.src = iconeItem(slot.item);
        img.style.visibility = 'visible';
        contagem.textContent = slot.quantidade > 1 ? String(slot.quantidade) : '';
        el.title = itemDef(slot.item)?.nome ?? slot.item;
      } else {
        img.style.visibility = 'hidden';
        contagem.textContent = '';
        el.title = '';
      }
      el.classList.toggle('escolhido', this.escolhido === i);
      el.classList.toggle('na-mao', i === inv.selecionado);
      el.classList.toggle('de-hotbar', i < TAMANHO_HOTBAR);
    }

    for (const el of this.equipamento.children as HTMLCollectionOf<HTMLElement>) {
      const slot = el.dataset.equip as SlotEquipamento;
      const id = inv.equipamento[slot];
      const img = el.querySelector('img') as HTMLImageElement;
      if (id) {
        img.src = iconeItem(id);
        img.style.visibility = 'visible';
        el.title = itemDef(id)?.nome ?? id;
      } else {
        img.style.visibility = 'hidden';
        el.title = '';
      }
    }

    const escolhido = this.escolhido !== null ? inv.slots[this.escolhido] : null;
    const def = escolhido ? itemDef(escolhido.item) : undefined;
    const conjunto = inv.conjuntoCompleto();
    this.rodape.textContent = def
      ? `${def.nome}${def.desc ? ' — ' + def.desc : ''} · toca outra vez para usar, ou noutro slot para mover.`
      : `Defesa ${inv.defesaTotal()}${conjunto ? ` · conjunto ${conjunto} completo` : ''} · toca num item para o escolher.`;

    if (this.abaAtual === 'criar') this.atualizarReceitas(jogo);
  }

  /** Constrói as linhas uma vez por estação; depois só se actualizam os números. */
  private construirReceitas(): void {
    if (this.estacaoDesenhada === this.estacao) return;
    this.estacaoDesenhada = this.estacao;
    this.linhasReceita = [];
    this.listaReceitas.textContent = '';

    const lista = receitasDe(this.estacao);
    if (lista.length === 0) {
      const vazio = document.createElement('p');
      vazio.className = 'vazio';
      vazio.textContent = 'Nada para criar aqui.';
      this.listaReceitas.appendChild(vazio);
      return;
    }

    for (const receita of lista) {
      const def = itemDef(receita.saida.item);
      if (!def) continue;
      const linha = document.createElement('button');
      linha.className = 'receita';
      linha.innerHTML = `
        <img class="icone" src="${iconeItem(receita.saida.item)}" alt="" />
        <span class="receita-info">
          <strong>${def.nome}${receita.saida.quantidade > 1 ? ` ×${receita.saida.quantidade}` : ''}</strong>
          <span class="custos"></span>
        </span>`;
      const custosEl = linha.querySelector('.custos') as HTMLElement;
      const custos: HTMLElement[] = receita.custo.map(() => {
        const span = document.createElement('span');
        custosEl.appendChild(span);
        return span;
      });
      linha.addEventListener('click', () => this.criarReceita(receita));
      this.listaReceitas.appendChild(linha);
      this.linhasReceita.push({ receita, el: linha, custos });
    }
  }

  private atualizarReceitas(jogo: Game): void {
    for (const linha of this.linhasReceita) {
      linha.el.classList.toggle('bloqueada', !podeCriar(linha.receita, jogo.inventario));
      linha.receita.custo.forEach((c, i) => {
        const tem = jogo.inventario.contar(c.item);
        const span = linha.custos[i];
        const nome = itemDef(c.item)?.nome ?? c.item;
        const texto = tem >= c.quantidade ? `×${c.quantidade} ${nome}` : `×${c.quantidade} ${nome} (tens ${tem})`;
        if (span.textContent !== texto) span.textContent = texto;
        span.className = tem >= c.quantidade ? 'ok' : 'falta';
      });
    }
  }
}
