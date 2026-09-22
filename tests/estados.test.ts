/**
 * Invariantes de estado do Nexus e situações absurdas.
 *
 * Um jogo nunca pode estar pausado, terminado e a processar entradas ao mesmo
 * tempo. Estes testes batem nos motores com o que um jogador irritado faz:
 * carregar em tudo ao mesmo tempo, reiniciar dez vezes seguidas, marcar o
 * tabuleiro inteiro com bandeiras.
 */

import { describe, expect, it } from 'vitest';
import { Jogo, type Direcao } from '../src/serpente/logica';
import { Jogo2048 } from '../src/game2048/main';
import { CampoMinado, COLUNAS, LINHAS, MINAS } from '../src/minesweeper/main';
import { Labirinto, MAPA_BASE } from '../src/pacman/logica';
import { aceitaJogada, estadoNexus, terminou } from '../src/serpente/estados';

const DIRECCOES: Direcao[] = ['cima', 'baixo', 'esquerda', 'direita'];

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

describe('vocabulário comum', () => {
  it('todos os nomes internos dos cinco motores são reconhecidos', () => {
    const internos = [
      'pronto', 'a-jogar', 'morto', 'completo', // serpente
      'jogar', 'pausa', 'fim', // blocos
      'nivel', // labirinto
      'ganhou', // 2048
      'venceu', 'perdeu', // campo minado
    ];
    for (const interno of internos) expect(estadoNexus(interno)).not.toBe('LOADING');
  });

  it('pausado, ganho e perdido nunca aceitam jogadas', () => {
    for (const interno of ['pausa', 'fim', 'morto', 'completo', 'ganhou', 'venceu', 'perdeu']) {
      expect(aceitaJogada(interno)).toBe(false);
    }
    for (const interno of ['pronto', 'a-jogar', 'jogar', 'nivel']) {
      expect(aceitaJogada(interno)).toBe(true);
    }
  });

  it('terminado e aceitar jogada excluem-se sempre', () => {
    for (const interno of ['pronto', 'a-jogar', 'jogar', 'pausa', 'nivel', 'fim', 'morto', 'completo', 'ganhou', 'venceu', 'perdeu']) {
      expect(terminou(interno) && aceitaJogada(interno)).toBe(false);
    }
  });
});

describe('serpente sob abuso', () => {
  it('vinte setas seguidas não fazem mais do que uma curva por passo', () => {
    const j = new Jogo({ lado: 15, aleatorio: semente(1) });
    j.comecar();
    for (let i = 0; i < 20; i++) for (const d of DIRECCOES) j.virar(d);
    const antes = j.direcao;
    j.passo();
    // Uma única mudança por passo, e nunca uma inversão.
    expect(j.direcao === antes || !saoOpostas(j.direcao, antes)).toBe(true);
  });

  it('nem com spam a serpente se vira sobre o próprio pescoço', () => {
    const j = new Jogo({ lado: 15, aleatorio: semente(2) });
    j.comecar();
    for (let passo = 0; passo < 120; passo++) {
      const antes = j.direcao;
      for (let i = 0; i < 12; i++) j.virar(DIRECCOES[i % 4]);
      j.passo();
      expect(saoOpostas(j.direcao, antes)).toBe(false);
      if (j.estado !== 'a-jogar') break;
    }
  });

  it('depois de morrer nenhuma direcção é aceite', () => {
    const j = new Jogo({ lado: 7, aleatorio: semente(3) });
    j.comecar();
    j.virar('cima');
    let guarda = 0;
    while (j.estado === 'a-jogar' && guarda++ < 200) j.passo();
    expect(j.estado).toBe('morto');
    expect(aceitaJogada(j.estado)).toBe(false);
    for (const d of DIRECCOES) expect(j.virar(d)).toBe(false);
  });

  it('dez reinícios seguidos não deixam estado sujo', () => {
    const j = new Jogo({ lado: 11, aleatorio: semente(4) });
    for (let i = 0; i < 10; i++) {
      j.comecar();
      j.virar('cima');
      j.passo();
      j.reiniciar();
      expect(j.estado).toBe('pronto');
      expect(j.pontos).toBe(0);
      expect(j.corpo.length).toBe(3);
      // A fila de direcções tem de morrer com a partida, senão a seguinte
      // arranca já virada para onde o jogador carregou na anterior.
      expect(j.direcao).toBe('direita');
    }
  });
});

function saoOpostas(a: Direcao, b: Direcao): boolean {
  return (a === 'cima' && b === 'baixo') || (a === 'baixo' && b === 'cima')
    || (a === 'esquerda' && b === 'direita') || (a === 'direita' && b === 'esquerda');
}

describe('2048 sob abuso', () => {
  // Depois de um movimento válido nasce sempre uma peça nova. Para julgar a
  // fusão é preciso lê-la sem essa peça, senão o teste mede as duas coisas.
  const linhaDe = (j: Jogo2048, y: number): number[] =>
    j.grelha[y].map((v, x) => (j.novas.some((p) => p.x === x && p.y === y) ? 0 : v));

  it('compacta, funde e volta a compactar pela ordem certa', () => {
    const j = new Jogo2048();
    j.grelha = [[2, 0, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    j.estado = 'jogar';
    j.mover('esquerda');
    expect(linhaDe(j, 0)).toEqual([4, 2, 0, 0]);
  });

  it('a mesma peça não funde duas vezes no mesmo movimento', () => {
    const j = new Jogo2048();
    j.grelha = [[2, 2, 4, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    j.estado = 'jogar';
    j.mover('esquerda');
    expect(linhaDe(j, 0)).toEqual([4, 4, 0, 0]);
  });

  it('um movimento que não muda nada não faz nascer peça nova', () => {
    const j = new Jogo2048();
    j.grelha = [[2, 4, 8, 16], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    j.estado = 'jogar';
    const antes = j.grelha.flat().filter(Boolean).length;
    const r = j.mover('esquerda');
    expect(r.mudou).toBe(false);
    expect(j.grelha.flat().filter(Boolean).length).toBe(antes);
  });

  it('vinte movimentos seguidos mantêm o tabuleiro coerente', () => {
    const j = new Jogo2048();
    let pontosAnteriores = 0;
    for (let i = 0; i < 20; i++) {
      j.mover((['esquerda', 'cima', 'direita', 'baixo'] as const)[i % 4]);
      expect(j.grelha.flat().length).toBe(16);
      expect(j.grelha.flat().every((v) => v === 0 || Number.isInteger(Math.log2(v)))).toBe(true);
      expect(j.pontos).toBeGreaterThanOrEqual(pontosAnteriores);
      pontosAnteriores = j.pontos;
    }
  });

  it('desfazer repõe tabuleiro e pontuação juntos', () => {
    const j = new Jogo2048();
    j.grelha = [[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    j.estado = 'jogar';
    j.pontos = 100;
    j.mover('esquerda');
    expect(j.pontos).toBe(104);
    expect(j.desfazer()).toBe(true);
    expect(j.pontos).toBe(100);
    expect(linhaDe(j, 0)).toEqual([2, 2, 0, 0]);
  });
});

describe('campo minado sob abuso', () => {
  it('o primeiro toque nunca mata, nem as oito casas à volta têm mina', () => {
    for (let tentativa = 0; tentativa < 40; tentativa++) {
      const j = new CampoMinado();
      expect(j.abrir(4, 6)).not.toBe('explodiu');
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = 4 + dx, y = 6 + dy;
        if (x >= 0 && y >= 0 && x < COLUNAS && y < LINHAS) expect(j.grelha[y][x].mina).toBe(false);
      }
    }
  });

  it('não se marcam mais bandeiras do que há minas', () => {
    const j = new CampoMinado();
    j.abrir(0, 0);
    for (let y = 0; y < LINHAS; y++) for (let x = 0; x < COLUNAS; x++) j.bandeira(x, y);
    expect(j.bandeiras()).toBeLessThanOrEqual(MINAS);
  });

  it('uma célula aberta não recebe bandeira e uma marcada não abre', () => {
    const j = new CampoMinado();
    j.abrir(4, 6);
    expect(j.bandeira(4, 6)).toBe(false);
    const fechada = procurarFechada(j);
    expect(j.bandeira(fechada.x, fechada.y)).toBe(true);
    expect(j.abrir(fechada.x, fechada.y)).toBe('nada');
    expect(j.grelha[fechada.y][fechada.x].aberta).toBe(false);
  });

  it('nenhuma célula é contada duas vezes como aberta', () => {
    const j = new CampoMinado();
    j.abrir(4, 6);
    const abertasAntes = j.abertas;
    for (let i = 0; i < 20; i++) j.abrir(4, 6);
    expect(j.abertas).toBe(abertasAntes);
    expect(j.grelha.flat().filter((c) => c.aberta).length).toBe(j.abertas);
  });

  it('o cronómetro só arranca na primeira jogada a sério', () => {
    const j = new CampoMinado();
    expect(j.tempo()).toBe(0);
    j.bandeira(0, 0);
    expect(j.tempo()).toBe(0);
    j.abrir(4, 6);
    expect(j.estado).toBe('jogar');
  });

  it('depois de perder nada mais se abre nem se marca', () => {
    const j = new CampoMinado();
    j.abrir(4, 6);
    const mina = procurarMina(j);
    expect(j.abrir(mina.x, mina.y)).toBe('explodiu');
    expect(aceitaJogada(j.estado)).toBe(false);
    expect(j.abrir(0, 0)).toBe('nada');
    expect(j.bandeira(0, 0)).toBe(false);
  });
});

function procurarFechada(j: CampoMinado): { x: number; y: number } {
  for (let y = 0; y < LINHAS; y++) for (let x = 0; x < COLUNAS; x++) {
    if (!j.grelha[y][x].aberta) return { x, y };
  }
  throw new Error('sem casas fechadas');
}
function procurarMina(j: CampoMinado): { x: number; y: number } {
  for (let y = 0; y < LINHAS; y++) for (let x = 0; x < COLUNAS; x++) {
    if (j.grelha[y][x].mina) return { x, y };
  }
  throw new Error('sem minas');
}

describe('labirinto sob abuso', () => {
  it('vinte direcções seguidas não atravessam paredes', () => {
    const j = new Labirinto();
    j.iniciar();
    for (let passo = 0; passo < 60; passo++) {
      for (let i = 0; i < 20; i++) j.pedir((['cima', 'baixo', 'esquerda', 'direita'] as const)[i % 4]);
      j.passo();
      expect(MAPA_LIVRE(j.jogador.x, j.jogador.y)).toBe(true);
      if (j.estado !== 'jogar') break;
    }
  });

  it('perder uma vida dá tempo antes de os inimigos voltarem a andar', () => {
    const j = new Labirinto();
    j.iniciar();
    let guarda = 0;
    while (j.vidas === 3 && guarda++ < 4000) j.passo();
    expect(j.vidas).toBe(2);
    // Logo a seguir à morte o jogador não pode estar outra vez em cima de um
    // inimigo, nem estes podem ter andado já no mesmo instante.
    const emCima = j.fantasmas.some((f) => f.x === j.jogador.x && f.y === j.jogador.y);
    expect(emCima).toBe(false);
    const posicoes = j.fantasmas.map((f) => `${f.x},${f.y}`);
    j.passo();
    expect(j.fantasmas.map((f) => `${f.x},${f.y}`)).toEqual(posicoes);
  });

  it('depois de acabar não aceita mais direcções', () => {
    const j = new Labirinto();
    j.iniciar();
    let guarda = 0;
    while (j.estado === 'jogar' && guarda++ < 20000) j.passo();
    if (j.estado === 'fim') {
      expect(aceitaJogada(j.estado)).toBe(false);
      const antes = `${j.jogador.x},${j.jogador.y}`;
      j.pedir('cima');
      j.passo();
      expect(`${j.jogador.x},${j.jogador.y}`).toBe(antes);
    }
  });
});

const MAPA_LIVRE = (x: number, y: number): boolean => MAPA_BASE[y]?.[x] !== '#';
