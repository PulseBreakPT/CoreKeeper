/** Mundo em chunks gerados sob demanda; só as alterações do jogador são guardadas. */

import { blockDef, BLOCKS, groundDef, type BlockDef, type GroundDef } from './tiles';
import { CHUNK, gerarChunk, type DadosChunk } from './worldgen';

interface Chunk extends DadosChunk {
  cx: number;
  cy: number;
  /** Último instante em que esteve visível, para poder ser descarregado. */
  visto: number;
}

/** Tabela plana de solidez: evita uma indirecção por cada teste de colisão. */
const SOLIDOS = new Uint8Array(256);
for (const b of BLOCKS) SOLIDOS[b.id] = b.solido ? 1 : 0;

interface ProgressoMina {
  hp: number;
  max: number;
  t: number;
}

export interface ResultadoMina {
  partido: boolean;
  progresso: number;
  def: BlockDef;
}

const MAX_CHUNKS = 512;

/**
 * Chave numérica de chunk. Usar `${cx},${cy}` obrigava a criar uma string a
 * cada acesso a um tile — com milhares de acessos por quadro, isso sozinho
 * chegava para comer milissegundos em recolha de lixo.
 */
function chaveChunk(cx: number, cy: number): number {
  return (cx + 0x8000) * 0x10000 + (cy + 0x8000);
}

export class World {
  readonly seed: number;
  private chunks = new Map<number, Chunk>();
  /** Alterações do jogador: chave do chunk -> índice -> (chao << 8) | bloco. */
  private alteracoes = new Map<number, Map<number, number>>();
  private minas = new Map<string, ProgressoMina>();
  private relogio = 0;
  /** Último chunk tocado: os varrimentos do desenho batem quase sempre no mesmo. */
  private ultimoCx = 0x7fffffff;
  private ultimoCy = 0x7fffffff;
  private ultimoChunk: Chunk | null = null;
  /** Sobe a cada alteração de tile: o desenho usa isto para saber se repinta. */
  versao = 0;

  constructor(seed: number) {
    this.seed = seed;
  }

  avancarRelogio(dt: number): void {
    this.relogio += dt;
    // A estrutura dos blocos recupera se o jogador desistir a meio.
    for (const [k, p] of this.minas) {
      if (this.relogio - p.t > 3) {
        this.minas.delete(k);
      }
    }
  }

  chunk(cx: number, cy: number): Chunk {
    if (this.ultimoChunk && cx === this.ultimoCx && cy === this.ultimoCy) return this.ultimoChunk;
    const k = chaveChunk(cx, cy);
    let c = this.chunks.get(k);
    if (!c) {
      const dados = gerarChunk(cx, cy, this.seed);
      c = { ...dados, cx, cy, visto: this.relogio };
      const alt = this.alteracoes.get(k);
      if (alt) {
        for (const [i, v] of alt) {
          c.chao[i] = (v >> 8) & 0xff;
          c.bloco[i] = v & 0xff;
        }
      }
      this.chunks.set(k, c);
    }
    c.visto = this.relogio;
    this.ultimoCx = cx;
    this.ultimoCy = cy;
    this.ultimoChunk = c;
    return c;
  }

  /** CHUNK é potência de dois, por isso dá para usar deslocamentos. */
  private indice(x: number, y: number): number {
    return (y & (CHUNK - 1)) * CHUNK + (x & (CHUNK - 1));
  }

  bloco(x: number, y: number): number {
    const c = this.chunk(x >> 4, y >> 4);
    return c.bloco[(y & 15) * CHUNK + (x & 15)];
  }

  chao(x: number, y: number): number {
    const c = this.chunk(x >> 4, y >> 4);
    return c.chao[(y & 15) * CHUNK + (x & 15)];
  }

  blocoDef(x: number, y: number): BlockDef {
    return blockDef(this.bloco(x, y));
  }

  chaoDef(x: number, y: number): GroundDef {
    return groundDef(this.chao(x, y));
  }

  solido(x: number, y: number): boolean {
    const c = this.chunk(x >> 4, y >> 4);
    return SOLIDOS[c.bloco[(y & 15) * CHUNK + (x & 15)]] === 1;
  }

  private registarAlteracao(cx: number, cy: number, i: number, chao: number, bloco: number): void {
    const k = chaveChunk(cx, cy);
    let alt = this.alteracoes.get(k);
    if (!alt) {
      alt = new Map();
      this.alteracoes.set(k, alt);
    }
    alt.set(i, (chao << 8) | bloco);
  }

  definirBloco(x: number, y: number, id: number): void {
    const cx = x >> 4;
    const cy = y >> 4;
    const c = this.chunk(cx, cy);
    const i = this.indice(x, y);
    c.bloco[i] = id;
    this.registarAlteracao(cx, cy, i, c.chao[i], id);
    this.minas.delete(`${x},${y}`);
    this.versao++;
  }

  definirChao(x: number, y: number, id: number): void {
    const cx = x >> 4;
    const cy = y >> 4;
    const c = this.chunk(cx, cy);
    const i = this.indice(x, y);
    c.chao[i] = id;
    this.registarAlteracao(cx, cy, i, id, c.bloco[i]);
    this.versao++;
  }

  /** Progresso visual de mineração (0..1) de um tile. */
  progressoMina(x: number, y: number): number {
    const p = this.minas.get(`${x},${y}`);
    if (!p) return 0;
    return 1 - p.hp / p.max;
  }

  /** Aplica dano de picareta a um bloco. Devolve se partiu. */
  minar(x: number, y: number, dano: number): ResultadoMina {
    const def = this.blocoDef(x, y);
    if (!def.minavel || def.invulneravel) return { partido: false, progresso: 0, def };
    const k = `${x},${y}`;
    let p = this.minas.get(k);
    if (!p) {
      p = { hp: def.dureza, max: def.dureza, t: this.relogio };
      this.minas.set(k, p);
    }
    p.hp -= dano;
    p.t = this.relogio;
    if (p.hp <= 0) {
      this.minas.delete(k);
      this.definirBloco(x, y, 0);
      return { partido: true, progresso: 1, def };
    }
    return { partido: false, progresso: 1 - p.hp / p.max, def };
  }

  /** Liberta chunks distantes que já não têm nada por mostrar (as alterações ficam guardadas). */
  limpar(px: number, py: number): void {
    if (this.chunks.size <= MAX_CHUNKS) return;
    const pcx = Math.floor(px / CHUNK);
    const pcy = Math.floor(py / CHUNK);
    for (const [k, c] of this.chunks) {
      if (Math.abs(c.cx - pcx) > 6 || Math.abs(c.cy - pcy) > 6) {
        this.chunks.delete(k);
      }
    }
    this.ultimoChunk = null;
  }

  serializar(): Record<string, number[]> {
    const out: Record<string, number[]> = {};
    for (const [k, alt] of this.alteracoes) {
      const lista: number[] = [];
      for (const [i, v] of alt) {
        lista.push(i, v);
      }
      out[String(k)] = lista;
    }
    return out;
  }

  static desserializar(seed: number, dados: Record<string, number[]> | undefined): World {
    const w = new World(seed);
    if (dados) {
      for (const [k, lista] of Object.entries(dados)) {
        const m = new Map<number, number>();
        for (let i = 0; i < lista.length; i += 2) m.set(lista[i], lista[i + 1]);
        w.alteracoes.set(Number(k), m);
      }
    }
    return w;
  }
}
