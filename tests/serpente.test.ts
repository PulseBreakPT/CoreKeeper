import { describe, expect, it } from 'vitest';
import {
  COMPRIMENTO_INICIAL,
  DECAIMENTO,
  FILA_MAXIMA,
  Jogo,
  LADO,
  MARCO,
  PASSO_INICIAL,
  PASSO_MINIMO,
  opostas,
  vetor,
  type Direcao,
  type Ponto,
} from '../src/serpente/logica';

/** Gerador determinístico, para as partidas simuladas darem sempre o mesmo. */
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

const DIRECCOES: Direcao[] = ['cima', 'baixo', 'esquerda', 'direita'];

function igual(a: Ponto, b: Ponto): boolean {
  return a.x === b.x && a.y === b.y;
}

function duplicados(corpo: Ponto[]): boolean {
  return new Set(corpo.map((p) => `${p.x},${p.y}`)).size !== corpo.length;
}

describe('arranque', () => {
  it('começa parado, centrado e com o comprimento certo', () => {
    const j = new Jogo();
    expect(j.estado).toBe('pronto');
    expect(j.corpo).toHaveLength(COMPRIMENTO_INICIAL);
    expect(j.pontos).toBe(0);
    expect(j.comidas).toBe(0);
    expect(j.direcao).toBe('direita');
    const meio = Math.floor(LADO / 2);
    expect(j.corpo[0]).toEqual({ x: meio, y: meio });
    expect(duplicados(j.corpo)).toBe(false);
  });

  it('não anda enquanto o jogador não der a primeira ordem', () => {
    const j = new Jogo();
    const antes = j.corpo.map((p) => ({ ...p }));
    const r = j.passo();
    expect(r.moveu).toBe(false);
    expect(j.corpo).toEqual(antes);
  });

  it('a primeira direcção válida arranca o jogo', () => {
    const j = new Jogo();
    expect(j.virar('cima')).toBe(true);
    expect(j.estado).toBe('a-jogar');
    expect(j.passo().moveu).toBe(true);
  });

  it('tocar no ecrã arranca sem mudar de direcção', () => {
    const j = new Jogo();
    expect(j.comecar()).toBe(true);
    expect(j.estado).toBe('a-jogar');
    expect(j.comecar()).toBe(false);
    j.passo();
    expect(j.direcao).toBe('direita');
  });
});

describe('direcções', () => {
  it('só são opostas as que se anulam', () => {
    expect(opostas('cima', 'baixo')).toBe(true);
    expect(opostas('esquerda', 'direita')).toBe(true);
    expect(opostas('cima', 'cima')).toBe(false);
    expect(opostas('cima', 'esquerda')).toBe(false);
  });

  it('recusa a inversão directa sobre o próprio corpo', () => {
    const j = new Jogo();
    expect(j.virar('esquerda')).toBe(false);
    expect(j.estado).toBe('pronto');
    expect(j.direcao).toBe('direita');
  });

  it('recusa repetir a direcção actual', () => {
    const j = new Jogo();
    expect(j.virar('direita')).toBe(false);
  });

  it('uma rajada de inputs no mesmo passo não faz meia-volta', () => {
    const j = new Jogo();
    // direita -> cima é válido; cima -> baixo, na mesma fila, seria suicídio.
    expect(j.virar('cima')).toBe(true);
    expect(j.virar('baixo')).toBe(false);
    expect(j.virar('esquerda')).toBe(true);
    j.passo();
    expect(j.direcao).toBe('cima');
    j.passo();
    expect(j.direcao).toBe('esquerda');
    expect(duplicados(j.corpo)).toBe(false);
  });

  it('a fila tem tecto e não engole ordens a mais', () => {
    const j = new Jogo();
    expect(j.virar('cima')).toBe(true);
    expect(j.virar('esquerda')).toBe(true);
    expect(j.virar('baixo')).toBe(false);
    expect(FILA_MAXIMA).toBe(2);
  });

  it('não aceita ordens depois de morrer', () => {
    const j = new Jogo({ lado: 7 });
    j.comecar();
    for (let i = 0; i < 10; i++) j.passo();
    expect(j.estado).toBe('morto');
    expect(j.virar('cima')).toBe(false);
  });
});

describe('colisões', () => {
  for (const d of DIRECCOES) {
    it(`bater na parede (${d}) termina a partida sem mexer o corpo`, () => {
      const j = new Jogo({ lado: 9 });
      // Serpente de um só segmento no centro: o único obstáculo possível é a parede.
      j.corpo = [{ x: 4, y: 4 }];
      j.anterior = [{ x: 4, y: 4 }];
      j.comida = { x: 0, y: 0 };
      j.direcao = d;
      j.comecar();
      let passos = 0;
      while (j.estado === 'a-jogar' && passos++ < 50) j.passo();
      expect(j.estado).toBe('morto');
      expect(passos).toBe(5);
      const v = vetor(d);
      const cabeca = j.corpo[0];
      // A cabeça ficou na última célula legal, encostada à parede.
      if (v.x !== 0) expect(cabeca.x).toBe(v.x > 0 ? 8 : 0);
      if (v.y !== 0) expect(cabeca.y).toBe(v.y > 0 ? 8 : 0);
      expect(j.corpo).toHaveLength(1);
    });
  }

  it('morder o próprio corpo termina a partida', () => {
    const j = new Jogo({ lado: 11 });
    j.corpo = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
      { x: 6, y: 6 },
    ];
    j.anterior = j.corpo.map((p) => ({ ...p }));
    j.comida = { x: 0, y: 0 };
    j.direcao = 'direita';
    j.comecar();
    j.virar('baixo');
    const r = j.passo();
    expect(r.morreu).toBe(true);
    expect(j.estado).toBe('morto');
    // O corpo fica inteiro para o desenho do impacto não perder um segmento.
    expect(j.corpo).toHaveLength(5);
  });

  it('entrar na célula que a cauda liberta é legal', () => {
    const j = new Jogo({ lado: 11 });
    j.corpo = [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
    ];
    j.anterior = j.corpo.map((p) => ({ ...p }));
    j.comida = { x: 0, y: 0 };
    j.direcao = 'direita';
    j.comecar();
    j.virar('baixo');
    const r = j.passo();
    expect(r.morreu).toBe(false);
    expect(j.corpo[0]).toEqual({ x: 5, y: 6 });
    expect(duplicados(j.corpo)).toBe(false);
  });
});

describe('comida e pontuação', () => {
  it('comer cresce um segmento, soma um ponto e repõe comida fora do corpo', () => {
    const j = new Jogo({ lado: 11, aleatorio: semente(7) });
    j.comecar();
    j.comida = { x: j.corpo[0].x + 1, y: j.corpo[0].y };
    const antes = j.corpo.length;
    const r = j.passo();
    expect(r.comeu).toBe(true);
    expect(j.corpo).toHaveLength(antes + 1);
    expect(j.pontos).toBe(1);
    expect(j.comidas).toBe(1);
    expect(j.corpo.some((p) => igual(p, j.comida))).toBe(false);
    expect(duplicados(j.corpo)).toBe(false);
  });

  it('a comida cai sempre dentro da arena e nunca em cima da serpente', () => {
    const j = new Jogo({ lado: 9, aleatorio: semente(99) });
    j.comecar();
    for (let i = 0; i < 400; i++) {
      // Põe a comida sempre à frente da cabeça: come a cada passo e a serpente enche.
      j.comida = vetorAplicado(j);
      j.passo();
      if (j.estado !== 'a-jogar') {
        j.reiniciar();
        j.comecar();
      }
      expect(j.comida.x).toBeGreaterThanOrEqual(0);
      expect(j.comida.y).toBeGreaterThanOrEqual(0);
      expect(j.comida.x).toBeLessThan(9);
      expect(j.comida.y).toBeLessThan(9);
      expect(j.corpo.some((p) => igual(p, j.comida))).toBe(false);
    }
  });

  it('marca o marco de pontuação de dez em dez comidas', () => {
    // Arena larga: a serpente come em linha recta sem chegar à parede.
    const j = new Jogo({ lado: MARCO * 4 + 1, aleatorio: semente(3) });
    j.comecar();
    const marcos: number[] = [];
    for (let i = 0; i < MARCO * 2; i++) {
      j.comida = vetorAplicado(j);
      const r = j.passo();
      expect(r.comeu).toBe(true);
      if (r.marco) marcos.push(j.comidas);
    }
    expect(marcos).toEqual([MARCO, MARCO * 2]);
  });

  it('encher a arena termina a partida em vitória', () => {
    const j = new Jogo({ lado: 4, aleatorio: semente(1) });
    const caminho: Ponto[] = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
      { x: 3, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 1 },
      { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 },
      { x: 3, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 3 },
    ];
    j.corpo = caminho.slice().reverse();
    j.anterior = j.corpo.map((p) => ({ ...p }));
    j.comida = { x: 0, y: 3 };
    j.direcao = 'esquerda';
    j.comecar();
    const r = j.passo();
    expect(r.comeu).toBe(true);
    expect(r.completo).toBe(true);
    expect(j.estado).toBe('completo');
    expect(j.corpo).toHaveLength(16);
    expect(j.livres()).toHaveLength(0);
    expect(j.passo().moveu).toBe(false);
  });
});

describe('ritmo', () => {
  it('acelera com as comidas, sempre acima do mínimo', () => {
    const j = new Jogo();
    expect(j.passoMs()).toBeCloseTo(PASSO_INICIAL, 5);
    let anterior = j.passoMs();
    for (let i = 1; i <= 300; i++) {
      j.comidas = i;
      const agora = j.passoMs();
      expect(agora).toBeLessThan(anterior);
      expect(agora).toBeGreaterThanOrEqual(PASSO_MINIMO);
      anterior = agora;
    }
    expect(anterior).toBeLessThan(PASSO_MINIMO + 1);
  });

  it('a aceleração é suave — nenhum salto passa de 3 ms', () => {
    const j = new Jogo();
    for (let i = 1; i <= 120; i++) {
      j.comidas = i - 1;
      const antes = j.passoMs();
      j.comidas = i;
      expect(antes - j.passoMs()).toBeLessThan(3);
    }
    expect(DECAIMENTO).toBeLessThan(1);
  });
});

describe('reinício e recorde', () => {
  it('reiniciar apaga tudo o que era da partida anterior', () => {
    const j = new Jogo({ lado: 11, aleatorio: semente(5) });
    j.comecar();
    j.comida = vetorAplicado(j);
    j.passo();
    j.virar('cima');
    while (j.estado === 'a-jogar') j.passo();
    expect(j.estado).toBe('morto');

    j.reiniciar();
    expect(j.estado).toBe('pronto');
    expect(j.pontos).toBe(0);
    expect(j.comidas).toBe(0);
    expect(j.direcao).toBe('direita');
    expect(j.corpo).toHaveLength(COMPRIMENTO_INICIAL);
    expect(j.anterior).toEqual(j.corpo);
    expect(j.corpo.some((p) => igual(p, j.comida))).toBe(false);
    // A fila de direcções também tem de ficar vazia.
    expect(j.virar('esquerda')).toBe(false);
  });

  it('o recorde sobe mas nunca desce entre partidas', () => {
    const j = new Jogo({ lado: 11, aleatorio: semente(11) });
    j.comecar();
    for (let i = 0; i < 4; i++) {
      j.comida = vetorAplicado(j);
      j.passo();
    }
    expect(j.pontos).toBe(4);
    expect(j.recorde).toBe(4);
    j.reiniciar();
    expect(j.recorde).toBe(4);
    expect(j.pontos).toBe(0);
    j.comecar();
    j.comida = vetorAplicado(j);
    j.passo();
    expect(j.recorde).toBe(4);
  });

  it('aguenta muitas partidas seguidas sem estado sujo', () => {
    const rng = semente(2024);
    const j = new Jogo({ lado: 13, aleatorio: rng });
    for (let partida = 0; partida < 30; partida++) {
      j.reiniciar();
      j.comecar();
      let passos = 0;
      while (j.estado === 'a-jogar' && passos++ < 600) {
        if (rng() < 0.25) j.virar(DIRECCOES[Math.floor(rng() * 4)]);
        j.passo();
        expect(duplicados(j.corpo)).toBe(false);
        expect(j.corpo.some((p) => igual(p, j.comida))).toBe(false);
        for (const p of j.corpo) {
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThan(13);
          expect(p.y).toBeLessThan(13);
        }
        expect(j.anterior).toHaveLength(j.corpo.length);
      }
      expect(j.pontos).toBeLessThanOrEqual(j.recorde);
    }
  });
});

/** Célula imediatamente à frente da cabeça, para forçar uma refeição. */
function vetorAplicado(j: Jogo): Ponto {
  const v = vetor(j.direcao);
  return { x: j.corpo[0].x + v.x, y: j.corpo[0].y + v.y };
}
