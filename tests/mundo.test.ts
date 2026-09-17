import { describe, expect, it } from 'vitest';
import { fbm, mulberry32, seedFromText } from '../src/core/rng';
import { biomaEm, BIOMAS, CHUNK, gerarChunk, salasEspeciais } from '../src/world/worldgen';
import { World } from '../src/world/world';
import { Block } from '../src/world/tiles';

describe('geradores', () => {
  it('produz sempre a mesma sequência para a mesma seed', () => {
    const a = mulberry32(1234);
    const b = mulberry32(1234);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('converte texto em seed de forma estável', () => {
    expect(seedFromText('tiago')).toBe(seedFromText('tiago'));
    expect(seedFromText('tiago')).not.toBe(seedFromText('Tiago'));
  });

  it('mantém o ruído fractal dentro de 0..1', () => {
    for (let i = 0; i < 200; i++) {
      const v = fbm(i * 0.37, i * 0.11, 99);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('geração de The Hollow', () => {
  it('gera o mesmo chunk duas vezes seguidas', () => {
    const a = gerarChunk(3, -2, 42);
    const b = gerarChunk(3, -2, 42);
    expect(Array.from(a.bloco)).toEqual(Array.from(b.bloco));
    expect(Array.from(a.chao)).toEqual(Array.from(b.chao));
  });

  it('gera mundos diferentes para seeds diferentes', () => {
    const a = gerarChunk(3, -2, 42);
    const b = gerarChunk(3, -2, 43);
    expect(Array.from(a.bloco)).not.toEqual(Array.from(b.bloco));
  });

  it('coloca o Relé na origem com a câmara aberta à volta', () => {
    const c = gerarChunk(0, 0, 7);
    expect(c.bloco[0]).toBe(Block.Relay);
    // O Portador acorda em (4,4): tem de haver chão livre.
    expect(c.bloco[4 * CHUNK + 4]).toBe(Block.Nenhum);
  });

  it('atravessa as oito camadas à medida que nos afastamos', () => {
    expect(biomaEm(0, 0, 7)).toBe(0);
    expect(biomaEm(1200, 0, 7)).toBe(7);
    // As camadas nunca recuam quando andamos para fora.
    let anterior = -1;
    for (let d = 0; d < 1200; d += 40) {
      const b = biomaEm(d, 0, 7);
      expect(b).toBeGreaterThanOrEqual(anterior - 1);
      anterior = b;
    }
  });

  it('descreve todas as camadas geradas', () => {
    for (let i = 0; i <= 7; i++) {
      expect(BIOMAS[i], `camada ${i}`).toBeDefined();
      expect(BIOMAS[i].nome.length).toBeGreaterThan(3);
    }
  });

  it('coloca uma arena por guardião, sempre no mesmo sítio para a mesma seed', () => {
    const a = salasEspeciais(7);
    const b = salasEspeciais(7);
    expect(a).toEqual(b);
    expect(a.map((s) => s.chefe)).toEqual([
      'goruun', 'myra', 'varkan', 'tempest', 'nereth', 'giant', 'bearer_zero',
    ]);
  });
});

describe('World', () => {
  it('guarda e repõe as alterações do Portador', () => {
    const w = new World(11);
    w.definirBloco(40, 40, Block.Torch);
    w.definirChao(40, 40, 14);
    const copia = World.desserializar(11, w.serializar());
    expect(copia.bloco(40, 40)).toBe(Block.Torch);
    expect(copia.chao(40, 40)).toBe(14);
  });

  it('parte um bloco só depois de dano suficiente', () => {
    const w = new World(12);
    w.definirBloco(5, 5, Block.Slatewall);
    const parcial = w.minar(5, 5, 10);
    expect(parcial.partido).toBe(false);
    expect(parcial.progresso).toBeGreaterThan(0);
    let partido = false;
    for (let i = 0; i < 40 && !partido; i++) partido = w.minar(5, 5, 10).partido;
    expect(partido).toBe(true);
    expect(w.bloco(5, 5)).toBe(Block.Nenhum);
  });

  it('não deixa partir o Relé dos Architects', () => {
    const w = new World(13);
    for (let i = 0; i < 50; i++) w.minar(0, 0, 500);
    expect(w.bloco(0, 0)).toBe(Block.Relay);
  });

  it('esquece o progresso de mineração passados uns segundos', () => {
    const w = new World(14);
    w.definirBloco(9, 9, Block.Slatewall);
    w.minar(9, 9, 20);
    expect(w.progressoMina(9, 9)).toBeGreaterThan(0);
    w.avancarRelogio(4);
    expect(w.progressoMina(9, 9)).toBe(0);
  });
});
