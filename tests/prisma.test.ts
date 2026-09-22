/**
 * PRISMA: física e as três armadilhas do género — bola presa, blocos
 * atravessados e colisões a dobrar no mesmo quadro.
 */

import { describe, expect, it } from 'vitest';
import {
  ALTURA, COLUNAS, LARGURA, Quebra, RAIO, RAQUETE_Y, VIDAS_INICIAIS,
} from '../src/prisma/logica';
import { aceitaJogada } from '../src/serpente/estados';

function semente(s: number): () => number {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uma partida a sério: lança e joga, seguindo a bola com a raquete. */
function jogar(j: Quebra, passos: number, dt = 1 / 60, aoPasso?: () => void): void {
  j.iniciar();
  j.lancar();
  for (let i = 0; i < passos; i++) {
    j.mover(j.bola.x);
    if (j.presa && j.estado === 'jogar') j.lancar();
    j.passo(dt);
    aoPasso?.();
    if (j.estado === 'fim') break;
  }
}

const dentroDeAlgumBloco = (j: Quebra): boolean =>
  j.blocos.some((b) =>
    j.bola.x + RAIO > b.x + 0.01 && j.bola.x - RAIO < b.x + b.largura - 0.01
    && j.bola.y + RAIO > b.y + 0.01 && j.bola.y - RAIO < b.y + b.altura - 0.01);

describe('prisma: arranque e controlo', () => {
  it('começa parado, com a bola presa à raquete e três vidas', () => {
    const j = new Quebra({ aleatorio: semente(1) });
    expect(j.estado).toBe('pronto');
    expect(j.presa).toBe(true);
    expect(j.vidas).toBe(VIDAS_INICIAIS);
    expect(j.blocos.length).toBeGreaterThan(0);
    expect(j.blocos.length % COLUNAS).toBe(0);
  });

  it('a bola só anda depois de lançada', () => {
    const j = new Quebra({ aleatorio: semente(2) });
    j.iniciar();
    const antes = { ...j.bola };
    for (let i = 0; i < 30; i++) j.passo(1 / 60);
    expect(j.bola.x).toBe(antes.x);
    expect(j.bola.y).toBe(antes.y);
  });

  it('presa, a bola acompanha a raquete', () => {
    const j = new Quebra({ aleatorio: semente(3) });
    j.mover(20);
    expect(j.bola.x).toBe(j.raquete.x);
    j.mover(70);
    expect(j.bola.x).toBe(j.raquete.x);
  });

  it('a raquete nunca sai da arena, por muito que se arraste', () => {
    const j = new Quebra({ aleatorio: semente(4) });
    for (const x of [-500, -1, 0, LARGURA / 2, LARGURA, LARGURA + 500]) {
      j.mover(x);
      expect(j.raquete.x - j.raquete.largura / 2).toBeGreaterThanOrEqual(-0.001);
      expect(j.raquete.x + j.raquete.largura / 2).toBeLessThanOrEqual(LARGURA + 0.001);
    }
  });

  it('lançar manda sempre a bola para cima', () => {
    for (let i = 0; i < 50; i++) {
      const j = new Quebra({ aleatorio: semente(i + 10) });
      j.iniciar();
      j.lancar();
      expect(j.bola.vy).toBeLessThan(0);
      expect(j.presa).toBe(false);
    }
  });
});

describe('prisma: as três armadilhas', () => {
  it('a bola nunca fica presa a rasar a horizontal', () => {
    const j = new Quebra({ aleatorio: semente(7) });
    let minimo = Infinity;
    jogar(j, 4000, 1 / 60, () => {
      if (!j.presa) minimo = Math.min(minimo, Math.abs(j.bola.vy) / j.velocidade());
    });
    // O motor garante um terço da velocidade na vertical; com folga de
    // arredondamento, nunca pode descer daí.
    expect(minimo).toBeGreaterThan(0.33);
  });

  it('nunca fica a subir e a descer na mesma coluna', () => {
    const j = new Quebra({ aleatorio: semente(21) });
    let minimo = Infinity;
    // A raquete devolve sempre a bola pelo meio, que é o caso que produzia a
    // trajectória perfeitamente vertical e a partida infinita.
    jogar(j, 3000, 1 / 60, () => {
      if (!j.presa) minimo = Math.min(minimo, Math.abs(j.bola.vx) / j.velocidade());
    });
    expect(minimo).toBeGreaterThan(0.14);
  });

  it('a bola nunca acaba dentro de um bloco, nem com quadros lentos', () => {
    const j = new Quebra({ aleatorio: semente(8) });
    j.nivel = 9; // velocidade no tecto
    let dentro = false;
    // 50 ms é o quadro mais lento que o motor aceita: é aqui que se atravessam
    // blocos se não houver subdivisão.
    jogar(j, 3000, 0.05, () => { if (dentroDeAlgumBloco(j)) dentro = true; });
    expect(dentro).toBe(false);
  });

  it('um bloco só desaparece por colisão, nunca por ser saltado', () => {
    const j = new Quebra({ aleatorio: semente(9) });
    j.nivel = 9;
    let anterior = j.blocos.length;
    let partidosContados = 0;
    j.iniciar();
    j.lancar();
    for (let i = 0; i < 3000 && j.estado !== 'fim'; i++) {
      j.mover(j.bola.x);
      if (j.presa) j.lancar();
      const ev = j.passo(0.05);
      if (!ev.nivelCompleto) {
        // A queda no número de blocos tem de bater certo com os partidos.
        expect(anterior - j.blocos.length).toBe(ev.partidos.length);
        partidosContados += ev.partidos.length;
      }
      anterior = j.blocos.length;
    }
    expect(partidosContados).toBeGreaterThan(10);
  });

  it('a velocidade mantém-se constante: nunca há duas reflexões a anularem-se', () => {
    const j = new Quebra({ aleatorio: semente(11) });
    j.nivel = 6;
    let piorDesvio = 0;
    jogar(j, 3000, 1 / 90, () => {
      if (j.presa) return;
      const v = Math.hypot(j.bola.vx, j.bola.vy);
      piorDesvio = Math.max(piorDesvio, Math.abs(v - j.velocidade()) / j.velocidade());
    });
    expect(piorDesvio).toBeLessThan(0.02);
  });

  it('a bola nunca sai da arena pelos lados nem pelo topo', () => {
    const j = new Quebra({ aleatorio: semente(12) });
    let fora = false;
    jogar(j, 4000, 1 / 60, () => {
      if (j.bola.x < -0.01 || j.bola.x > LARGURA + 0.01 || j.bola.y < -0.01) fora = true;
    });
    expect(fora).toBe(false);
  });
});

describe('prisma: vidas, níveis e recorde', () => {
  it('deixar cair a bola tira uma vida e prende-a outra vez', () => {
    const j = new Quebra({ aleatorio: semente(13) });
    j.iniciar();
    j.lancar();
    j.bola.y = ALTURA + RAIO * 3;
    j.bola.vy = Math.abs(j.bola.vy);
    const ev = j.passo(1 / 60);
    expect(ev.perdeuVida).toBe(true);
    expect(j.vidas).toBe(VIDAS_INICIAIS - 1);
    expect(j.presa).toBe(true);
    expect(j.bola.y).toBeLessThan(RAQUETE_Y);
  });

  it('à terceira perda a partida termina e deixa de aceitar jogadas', () => {
    const j = new Quebra({ aleatorio: semente(14) });
    j.iniciar();
    for (let vida = 0; vida < VIDAS_INICIAIS; vida++) {
      j.lancar();
      j.bola.y = ALTURA + RAIO * 3;
      j.bola.vy = Math.abs(j.bola.vy);
      j.passo(1 / 60);
    }
    expect(j.estado).toBe('fim');
    expect(j.vidas).toBe(0);
    expect(aceitaJogada(j.estado)).toBe(false);
    const posicao = { ...j.bola };
    j.lancar();
    j.passo(1 / 60);
    expect(j.bola.x).toBe(posicao.x);
    expect(j.bola.y).toBe(posicao.y);
  });

  it('limpar os blocos sobe o nível, enche o tabuleiro e acelera', () => {
    const j = new Quebra({ aleatorio: semente(15) });
    j.iniciar();
    j.lancar();
    const velocidadeAntes = j.velocidade();
    j.blocos = [{ x: j.bola.x - 3, y: j.bola.y - 8, largura: 6, altura: 5, resistencia: 1, tom: 0 }];
    j.bola.vy = -Math.abs(j.bola.vy);
    let completo = false;
    for (let i = 0; i < 400 && !completo; i++) completo = j.passo(1 / 60).nivelCompleto;
    expect(completo).toBe(true);
    expect(j.nivel).toBe(2);
    expect(j.blocos.length).toBeGreaterThan(0);
    expect(j.velocidade()).toBeGreaterThan(velocidadeAntes);
    expect(j.presa).toBe(true);
  });

  it('em pausa nada se mexe', () => {
    const j = new Quebra({ aleatorio: semente(16) });
    j.iniciar();
    j.lancar();
    j.passo(1 / 60);
    j.pausar();
    expect(j.estado).toBe('pausa');
    expect(aceitaJogada(j.estado)).toBe(false);
    const antes = { ...j.bola };
    for (let i = 0; i < 60; i++) j.passo(1 / 60);
    expect(j.bola.x).toBe(antes.x);
    expect(j.bola.y).toBe(antes.y);
  });

  it('o recorde sobe com a pontuação e nunca desce', () => {
    const j = new Quebra({ aleatorio: semente(17), recorde: 40 });
    expect(j.recorde).toBe(40);
    jogar(j, 1500);
    expect(j.recorde).toBeGreaterThanOrEqual(Math.max(40, j.pontos));
    const recorde = j.recorde;
    j.reiniciar();
    expect(j.recorde).toBe(recorde);
    expect(j.pontos).toBe(0);
    expect(j.vidas).toBe(VIDAS_INICIAIS);
    expect(j.nivel).toBe(1);
  });

  it('dez reinícios seguidos deixam sempre o mesmo estado limpo', () => {
    const j = new Quebra({ aleatorio: semente(18) });
    for (let i = 0; i < 10; i++) {
      jogar(j, 200);
      j.reiniciar();
      expect(j.estado).toBe('pronto');
      expect(j.presa).toBe(true);
      expect(j.pontos).toBe(0);
      expect(j.nivel).toBe(1);
      expect(j.bola.vx).toBe(0);
      expect(j.bola.vy).toBe(0);
    }
  });
});
