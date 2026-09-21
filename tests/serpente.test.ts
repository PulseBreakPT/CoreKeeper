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
    // Três curvas antecipadas, como o próprio jogo anuncia ao jogador.
    expect(j.virar('cima')).toBe(true);
    expect(j.virar('esquerda')).toBe(true);
    expect(j.virar('baixo')).toBe(true);
    expect(j.virar('direita')).toBe(false);
    expect(FILA_MAXIMA).toBe(3);
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
      j.comida = { x: 0, y: 0, tipo: 'normal' };
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
    j.comida = { x: 0, y: 0, tipo: 'normal' };
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
    j.comida = { x: 0, y: 0, tipo: 'normal' };
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
    j.comida = { x: j.corpo[0].x + 1, y: j.corpo[0].y, tipo: 'normal' };
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
      j.comida = { ...vetorAplicado(j), tipo: 'normal' };
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
      j.comida = { ...vetorAplicado(j), tipo: 'normal' };
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
    j.comida = { x: 0, y: 3, tipo: 'normal' };
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
    j.comida = { ...vetorAplicado(j), tipo: 'normal' };
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
      j.comida = { ...vetorAplicado(j), tipo: 'normal' };
      j.passo();
    }
    expect(j.pontos).toBe(4);
    expect(j.recorde).toBe(4);
    j.reiniciar();
    expect(j.recorde).toBe(4);
    expect(j.pontos).toBe(0);
    j.comecar();
    j.comida = { ...vetorAplicado(j), tipo: 'normal' };
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

/** BFS independente da implementação: onde é que a cabeça consegue mesmo chegar. */
function alcancavel(j: Jogo, alvo: Ponto): boolean {
  const bloqueada = new Set(j.corpo.slice(0, -1).map((p) => `${p.x},${p.y}`));
  const visto = new Set<string>();
  const fila: Ponto[] = [];
  for (const d of ['cima', 'baixo', 'esquerda', 'direita'] as Direcao[]) {
    const v = vetor(d);
    const p = { x: j.corpo[0].x + v.x, y: j.corpo[0].y + v.y };
    if (p.x < 0 || p.y < 0 || p.x >= j.lado || p.y >= j.lado) continue;
    if (!bloqueada.has(`${p.x},${p.y}`)) fila.push(p);
  }
  while (fila.length > 0) {
    const p = fila.pop() as Ponto;
    const chave = `${p.x},${p.y}`;
    if (visto.has(chave) || bloqueada.has(chave)) continue;
    visto.add(chave);
    if (igual(p, alvo)) return true;
    for (const d of ['cima', 'baixo', 'esquerda', 'direita'] as Direcao[]) {
      const v = vetor(d);
      const q = { x: p.x + v.x, y: p.y + v.y };
      if (q.x < 0 || q.y < 0 || q.x >= j.lado || q.y >= j.lado) continue;
      if (!visto.has(`${q.x},${q.y}`)) fila.push(q);
    }
  }
  return false;
}

/** Vizinhos de `p` que estão dentro da arena e fora do corpo. */
function desafogo(j: Jogo, p: Ponto): number {
  let n = 0;
  for (const d of ['cima', 'baixo', 'esquerda', 'direita'] as Direcao[]) {
    const v = vetor(d);
    const q = { x: p.x + v.x, y: p.y + v.y };
    if (q.x < 0 || q.y < 0 || q.x >= j.lado || q.y >= j.lado) continue;
    if (!j.corpo.some((c) => igual(c, q))) n++;
  }
  return n;
}

describe('onde a comida nasce', () => {
  it('nunca do outro lado de uma parede feita pelo próprio corpo', () => {
    // Corpo em parede vertical completa: esquerda 35 casas, direita 36. A
    // direita é maior, mas a cabeça não lá chega — a comida tem de ficar na
    // esquerda, que é o lado onde a serpente pode jogar.
    const j = new Jogo({ lado: 9, aleatorio: semente(4) });
    const corpo: Ponto[] = [{ x: 3, y: 8 }];
    for (let y = 8; y >= 0; y--) corpo.push({ x: 4, y });
    corpo.push({ x: 3, y: 0 });
    j.corpo = corpo;
    j.anterior = corpo.map((c) => ({ ...c }));
    j.direcao = 'esquerda';
    j.comida = { x: 2, y: 8, tipo: 'normal' };
    j.comecar();
    const r = j.passo();
    expect(r.comeu).toBe(true);
    expect(j.comida.x, `comida em ${j.comida.x},${j.comida.y}`).toBeLessThan(4);
    expect(alcancavel(j, j.comida)).toBe(true);
  });

  it('em partidas inteiras, a comida está sempre ao alcance da cabeça', () => {
    const rng = semente(31337);
    const j = new Jogo({ lado: 11, aleatorio: rng });
    for (let partida = 0; partida < 12; partida++) {
      j.reiniciar();
      j.comecar();
      expect(alcancavel(j, j.comida)).toBe(true);
      let passos = 0;
      while (j.estado === 'a-jogar' && passos++ < 500) {
        // Come sempre que pode, para o corpo crescer e fechar regiões.
        const v = vetor(j.direcao);
        const frente = { x: j.corpo[0].x + v.x, y: j.corpo[0].y + v.y };
        const dentro = frente.x >= 0 && frente.y >= 0 && frente.x < 11 && frente.y < 11;
        if (dentro && !j.corpo.some((c) => igual(c, frente))) j.comida = { ...frente, tipo: 'normal' };
        else j.virar(DIRECCOES[Math.floor(rng() * 4)]);
        j.passo();
        if (j.estado === 'a-jogar') expect(alcancavel(j, j.comida)).toBe(true);
      }
    }
  });

  it('prefere o desafogo: a comida raramente nasce encostada ao corpo', () => {
    const rng = semente(808);
    const j = new Jogo({ lado: 9, aleatorio: rng });
    // Corpo em serpentina, a deixar casas apertadas e casas abertas.
    const corpo: Ponto[] = [];
    for (let x = 1; x <= 7; x++) corpo.push({ x, y: 4 });
    for (let y = 5; y <= 7; y++) corpo.push({ x: 7, y });
    j.corpo = corpo;
    j.anterior = corpo.map((c) => ({ ...c }));
    j.direcao = 'esquerda';
    j.comecar();

    const livres = j.livres();
    const mediaGeral = livres.reduce((a, p) => a + desafogo(j, p), 0) / livres.length;
    const apertadasNaArena = livres.filter((p) => desafogo(j, p) <= 2).length / livres.length;

    let soma = 0;
    let apertadas = 0;
    const amostras = 300;
    for (let i = 0; i < amostras; i++) {
      j.comida = { x: 0, y: 4, tipo: 'normal' };
      j.corpo = corpo.map((c) => ({ ...c }));
      j.anterior = j.corpo.map((c) => ({ ...c }));
      j.direcao = 'esquerda';
      j.estado = 'a-jogar';
      j.passo();
      const espaco = desafogo(j, j.comida);
      soma += espaco;
      if (espaco <= 2) apertadas++;
    }
    // O sorteio pesado tem de bater o sorteio uniforme nas duas medidas: mais
    // desafogo em média, e menos comida em casas apertadas do que a arena tem.
    expect(soma / amostras).toBeGreaterThan(mediaGeral);
    expect(apertadas / amostras).toBeLessThan(apertadasNaArena);
  });

  it('só declara vitória com a arena mesmo cheia', () => {
    const rng = semente(2718);
    const j = new Jogo({ lado: 7, aleatorio: rng });
    for (let partida = 0; partida < 25; partida++) {
      j.reiniciar();
      j.comecar();
      let passos = 0;
      while (j.estado === 'a-jogar' && passos++ < 400) {
        const v = vetor(j.direcao);
        const frente = { x: j.corpo[0].x + v.x, y: j.corpo[0].y + v.y };
        const dentro = frente.x >= 0 && frente.y >= 0 && frente.x < 7 && frente.y < 7;
        if (dentro && !j.corpo.some((c) => igual(c, frente))) j.comida = { ...frente, tipo: 'normal' };
        else j.virar(DIRECCOES[Math.floor(rng() * 4)]);
        j.passo();
      }
      if (j.estado === 'completo') expect(j.livres()).toHaveLength(0);
    }
  });
});
