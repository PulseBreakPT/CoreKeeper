/**
 * Lógica pura do jogo da serpente.
 *
 * Não toca em DOM, canvas nem relógio — recebe passos e devolve o que aconteceu.
 * É aqui que vivem as regras todas (movimento, comida, colisões, ritmo), para
 * poderem ser testadas sem browser.
 */

export type Direcao = 'cima' | 'baixo' | 'esquerda' | 'direita';
export type Estado = 'pronto' | 'a-jogar' | 'morto' | 'completo';
/** Clássico: só as paredes e o próprio corpo matam. Relógio: o tempo também. */
export type Modo = 'classico' | 'relogio' | 'portais' | 'zen' | 'escuro' | 'obstaculos' | 'uma-vida' | 'diario';
export type TipoComida = 'normal' | 'ouro' | 'leve' | 'gigante';

export interface Ponto {
  x: number;
  y: number;
}

export interface Comida extends Ponto {
  tipo: TipoComida;
}

/** Lado da arena em células. Quadrada e fixa, para o jogo ser igual em todos os ecrãs. */
export const LADO = 21;
/** Milissegundos por passo no início. */
export const PASSO_INICIAL = 150;
/** Milissegundos por passo no limite da velocidade. */
export const PASSO_MINIMO = 74;
/** Quanto do intervalo restante desaparece a cada comida (aceleração suave e com tecto). */
export const DECAIMENTO = 0.972;
/** De quantas comidas em quantas soa o marco de pontuação. */
export const MARCO = 10;
/** Quantas direcções ficam em fila à espera de passo (absorve rajadas de input). */
export const FILA_MAXIMA = 2;
/** Comprimento da serpente no arranque. */
export const COMPRIMENTO_INICIAL = 3;
/**
 * Segundos para chegar à comida no modo de relógio. O contador volta ao topo a
 * cada refeição, por isso é sempre a mesma janela — não encolhe com a partida.
 *
 * Dez é folgado mas nunca confortável: a maior distância possível numa arena de
 * 21 casas são 40 passos, que ao ritmo inicial de 150 ms dão seis segundos. A
 * folga que sobra é o que dá para hesitar, e é isso que se está a cobrar.
 */
export const SEGUNDOS_RELOGIO = 10;

const VETORES: Record<Direcao, Ponto> = {
  cima: { x: 0, y: -1 },
  baixo: { x: 0, y: 1 },
  esquerda: { x: -1, y: 0 },
  direita: { x: 1, y: 0 },
};

/** As quatro direcções, por ordem fixa — usada nas varreduras da grelha. */
const DIRECCOES: Direcao[] = ['cima', 'baixo', 'esquerda', 'direita'];

export function vetor(d: Direcao): Ponto {
  return VETORES[d];
}

/** Duas direcções são opostas quando somadas dão parado. */
export function opostas(a: Direcao, b: Direcao): boolean {
  return VETORES[a].x + VETORES[b].x === 0 && VETORES[a].y + VETORES[b].y === 0;
}

export interface Resultado {
  moveu: boolean;
  comeu: boolean;
  marco: boolean;
  morreu: boolean;
  completo: boolean;
  cabeca: Ponto;
  ganhos: number;
  tipoComida: TipoComida | null;
  cortou: boolean;
}

export interface OpcoesJogo {
  lado?: number;
  recorde?: number;
  modo?: Modo;
  aleatorio?: () => number;
  dia?: number;
}

function vazio(cabeca: Ponto): Resultado {
  return {
    moveu: false,
    comeu: false,
    marco: false,
    morreu: false,
    completo: false,
    cabeca,
    ganhos: 0,
    tipoComida: null,
    cortou: false,
  };
}

export class Jogo {
  readonly lado: number;
  /** Células ocupadas, da cabeça para a cauda. */
  corpo: Ponto[] = [];
  /** Onde estava cada célula no passo anterior — usado para interpolar o desenho. */
  anterior: Ponto[] = [];
  comida: Comida = { x: 0, y: 0, tipo: 'normal' };
  obstaculos: Ponto[] = [];
  direcao: Direcao = 'direita';
  estado: Estado = 'pronto';
  pontos = 0;
  comidas = 0;
  especiais = 0;
  combo = 0;
  melhorCombo = 0;
  recorde: number;
  modo: Modo;
  readonly dia: number;

  private fila: Direcao[] = [];
  private readonly aleatorio: () => number;
  private passosDesdeComida = 999;
  private crescimentoPendente = 0;

  constructor(opcoes: OpcoesJogo = {}) {
    this.lado = opcoes.lado ?? LADO;
    this.recorde = opcoes.recorde ?? 0;
    this.modo = opcoes.modo ?? 'classico';
    this.dia = opcoes.dia ?? Math.floor(Date.now() / 86_400_000);
    this.aleatorio = opcoes.aleatorio ?? Math.random;
    this.reiniciar();
  }

  /** Deita fora tudo o que havia e monta uma partida limpa. */
  reiniciar(): void {
    const meio = Math.floor(this.lado / 2);
    // Em arenas pequenas (testes) a serpente encolhe para caber sem sair do tabuleiro.
    const comprimento = Math.max(1, Math.min(COMPRIMENTO_INICIAL, meio + 1));
    this.corpo = [];
    for (let i = 0; i < comprimento; i++) this.corpo.push({ x: meio - i, y: meio });
    this.anterior = this.corpo.map((p) => ({ ...p }));
    this.direcao = 'direita';
    this.fila = [];
    this.estado = 'pronto';
    this.pontos = 0;
    this.comidas = 0;
    this.especiais = 0;
    this.combo = 0;
    this.melhorCombo = 0;
    this.passosDesdeComida = 999;
    this.crescimentoPendente = 0;
    this.criarObstaculos();
    this.novaComida();
  }

  /** O desafio diário alterna regras previsíveis sem depender de uma ligação à rede. */
  private varianteDiaria(): number {
    return Math.abs(this.dia * 17 + 11) % 4;
  }

  atravessaParedes(): boolean {
    return this.modo === 'portais' || this.modo === 'zen' || (this.modo === 'diario' && this.varianteDiaria() === 0);
  }

  arenaEscura(): boolean {
    return this.modo === 'escuro' || (this.modo === 'diario' && this.varianteDiaria() === 1);
  }

  temObstaculos(): boolean {
    return this.modo === 'obstaculos' || (this.modo === 'diario' && this.varianteDiaria() === 2);
  }

  semDerrota(): boolean {
    return this.modo === 'zen';
  }

  private criarObstaculos(): void {
    this.obstaculos = [];
    if (!this.temObstaculos()) return;
    const meio = Math.floor(this.lado / 2);
    const desejados = Math.max(5, Math.floor(this.lado * 0.58));
    let tentativas = desejados * 15;
    while (this.obstaculos.length < desejados && tentativas-- > 0) {
      const x = 2 + Math.floor(this.aleatorio() * Math.max(1, this.lado - 4));
      const y = 2 + Math.floor(this.aleatorio() * Math.max(1, this.lado - 4));
      if (Math.abs(x - meio) <= 3 && Math.abs(y - meio) <= 2) continue;
      if (this.obstaculos.some((p) => p.x === x && p.y === y)) continue;
      // Evita muros compactos: cada bloco nasce com, no máximo, um vizinho directo.
      const vizinhos = this.obstaculos.filter((p) => Math.abs(p.x - x) + Math.abs(p.y - y) === 1).length;
      if (vizinhos > 1) continue;
      this.obstaculos.push({ x, y });
    }
  }

  /** Intervalo entre passos, em milissegundos, para a pontuação actual. */
  passoMs(): number {
    const diarioRapido = this.modo === 'diario' && this.varianteDiaria() === 3;
    const inicial = this.modo === 'uma-vida' ? 128 : diarioRapido ? 138 : PASSO_INICIAL;
    const minimo = this.modo === 'zen' ? 88 : PASSO_MINIMO;
    const progresso = this.comidas + Math.floor(this.pontos / 8);
    const extra = (inicial - minimo) * Math.pow(DECAIMENTO, progresso);
    return minimo + extra;
  }

  /** Última direcção com que já se contou — a da fila, ou a que está a ser andada. */
  private referencia(): Direcao {
    return this.fila.length > 0 ? this.fila[this.fila.length - 1] : this.direcao;
  }

  /**
   * Pede uma mudança de direcção. Devolve `true` se foi aceite.
   *
   * Recusa inversões sobre o próprio corpo e repetições, mesmo quando chegam
   * várias no mesmo passo: a comparação é sempre com a última já aceite.
   */
  virar(d: Direcao): boolean {
    if (this.estado === 'morto' || this.estado === 'completo') return false;
    const ref = this.referencia();
    if (d === ref || opostas(d, ref)) return false;
    if (this.fila.length >= FILA_MAXIMA) return false;
    this.fila.push(d);
    if (this.estado === 'pronto') this.estado = 'a-jogar';
    return true;
  }

  /** Arranca sem mudar de direcção (por exemplo, ao tocar no ecrã). */
  comecar(): boolean {
    if (this.estado !== 'pronto') return false;
    this.estado = 'a-jogar';
    return true;
  }

  /**
   * Termina a partida por tempo esgotado. Devolve `false` se já estava acabada.
   *
   * O relógio anda fora daqui, com o resto do tempo real: esta classe conta
   * passos, não segundos. O que lhe compete é a transição de estado, que tem de
   * ser exactamente a mesma de bater na parede — incluindo o recorde.
   */
  esgotar(): boolean {
    if (this.estado !== 'a-jogar') return false;
    this.anterior = this.corpo.map((p) => ({ ...p }));
    this.estado = 'morto';
    this.marcarRecorde();
    return true;
  }

  ocupada(x: number, y: number): boolean {
    return this.corpo.some((p) => p.x === x && p.y === y);
  }

  bloqueada(x: number, y: number): boolean {
    return this.obstaculos.some((p) => p.x === x && p.y === y);
  }

  /** Todas as células fora do corpo — a comida sai daqui, nunca de tentativa e erro. */
  livres(): Ponto[] {
    const ocupadas = new Set([
      ...this.corpo.map((p) => p.y * this.lado + p.x),
      ...this.obstaculos.map((p) => p.y * this.lado + p.x),
    ]);
    const saida: Ponto[] = [];
    for (let y = 0; y < this.lado; y++) {
      for (let x = 0; x < this.lado; x++) {
        if (!ocupadas.has(y * this.lado + x)) saida.push({ x, y });
      }
    }
    return saida;
  }

  /**
   * Parte o espaço livre em regiões ligadas (vizinhança de quatro).
   *
   * Devolve, para cada célula livre, o número da região a que pertence, e o
   * tamanho de cada região. É com isto que se sabe se a comida está do lado
   * certo de uma parede feita pelo próprio corpo.
   */
  private regioes(): { de: Int16Array; tamanhos: number[] } {
    const n = this.lado * this.lado;
    const de = new Int16Array(n).fill(-1);
    const bloqueada = new Uint8Array(n);
    // A cauda não conta como parede: liberta a célula no passo seguinte.
    for (let i = 0; i < this.corpo.length - 1; i++) {
      const p = this.corpo[i];
      bloqueada[p.y * this.lado + p.x] = 1;
    }
    for (const p of this.obstaculos) bloqueada[p.y * this.lado + p.x] = 1;
    const tamanhos: number[] = [];
    const fila = new Int32Array(n);

    for (let inicio = 0; inicio < n; inicio++) {
      if (bloqueada[inicio] || de[inicio] >= 0) continue;
      const regiao = tamanhos.length;
      let escrita = 0;
      let leitura = 0;
      fila[escrita++] = inicio;
      de[inicio] = regiao;
      let tamanho = 0;
      while (leitura < escrita) {
        const c = fila[leitura++];
        tamanho++;
        const x = c % this.lado;
        const y = (c - x) / this.lado;
        if (x > 0) {
          const v = c - 1;
          if (!bloqueada[v] && de[v] < 0) { de[v] = regiao; fila[escrita++] = v; }
        }
        if (x < this.lado - 1) {
          const v = c + 1;
          if (!bloqueada[v] && de[v] < 0) { de[v] = regiao; fila[escrita++] = v; }
        }
        if (y > 0) {
          const v = c - this.lado;
          if (!bloqueada[v] && de[v] < 0) { de[v] = regiao; fila[escrita++] = v; }
        }
        if (y < this.lado - 1) {
          const v = c + this.lado;
          if (!bloqueada[v] && de[v] < 0) { de[v] = regiao; fila[escrita++] = v; }
        }
      }
      tamanhos.push(tamanho);
    }
    return { de, tamanhos };
  }

  /**
   * Põe comida numa célula livre, com critério. Devolve `false` se a arena
   * estiver cheia.
   *
   * Sortear uniformemente entre as livres é o que quase toda a gente faz, e é
   * o que estraga partidas: a comida cai atrás de uma parede feita pelo próprio
   * corpo, ou colada a ele, e o jogador perde sem ter errado. Aqui a escolha
   * passa por dois filtros:
   *
   * 1. só células da maior região a que a cabeça consegue chegar — nunca do
   *    outro lado do corpo, nunca numa bolsa apertada se houver espaço aberto;
   * 2. dentro dessa região, as células desafogadas valem mais no sorteio, por
   *    isso a comida raramente nasce encostada ao corpo ou a um canto.
   *
   * Se a cabeça estiver completamente fechada, a partida já está perdida e a
   * comida vai para a maior região que existir — o jogo continua honesto.
   */
  private novaComida(): boolean {
    const livres = this.livres();
    if (livres.length === 0) return false;

    const { de, tamanhos } = this.regioes();
    const cabeca = this.corpo[0];

    // Regiões onde a cabeça pode entrar: as que tocam uma casa vizinha dela.
    const alcancaveis = new Set<number>();
    for (const d of DIRECCOES) {
      const v = VETORES[d];
      const x = cabeca.x + v.x;
      const y = cabeca.y + v.y;
      if (x < 0 || y < 0 || x >= this.lado || y >= this.lado) continue;
      const r = de[y * this.lado + x];
      if (r >= 0) alcancaveis.add(r);
    }

    // Só contam regiões que tenham mesmo onde pôr comida: a célula da cauda
    // conta como livre para caminhar, mas a comida não pode nascer em cima dela.
    const comVaga = new Set<number>();
    for (const p of livres) comVaga.add(de[p.y * this.lado + p.x]);

    const preferidas = [...alcancaveis].filter((r) => comVaga.has(r));
    const candidatas = preferidas.length > 0 ? preferidas : [...comVaga];
    let melhor = -1;
    for (const r of candidatas) {
      if (melhor < 0 || tamanhos[r] > tamanhos[melhor]) melhor = r;
    }
    // Há células livres, logo há sempre uma região onde as pôr.
    if (melhor < 0) throw new Error('há células livres mas nenhuma região para a comida');

    // Sorteio pesado: uma célula com quatro vizinhos livres vale cinco vezes
    // mais do que uma encurralada com um só.
    const alvos = livres.filter((p) => de[p.y * this.lado + p.x] === melhor);
    let total = 0;
    const pesos = alvos.map((p) => {
      const peso = 1 + this.vizinhasLivres(p, de, melhor);
      total += peso;
      return peso;
    });
    let sorte = this.aleatorio() * total;
    for (let i = 0; i < alvos.length; i++) {
      sorte -= pesos[i];
      if (sorte <= 0) {
        this.comida = { ...alvos[i], tipo: this.sortearTipoComida() };
        return true;
      }
    }
    this.comida = { ...alvos[alvos.length - 1], tipo: this.sortearTipoComida() };
    return true;
  }

  private sortearTipoComida(): TipoComida {
    // A primeira luz é sempre normal; depois, cerca de uma em quatro altera a estratégia.
    if (this.comidas === 0) return 'normal';
    const n = this.aleatorio();
    if (n < 0.1) return 'ouro';
    if (n < 0.18) return 'leve';
    if (n < 0.26) return 'gigante';
    return 'normal';
  }

  /** Quantos dos quatro vizinhos pertencem à mesma região livre. */
  private vizinhasLivres(p: Ponto, de: Int16Array, regiao: number): number {
    let n = 0;
    for (const d of DIRECCOES) {
      const v = VETORES[d];
      const x = p.x + v.x;
      const y = p.y + v.y;
      if (x < 0 || y < 0 || x >= this.lado || y >= this.lado) continue;
      if (de[y * this.lado + x] === regiao) n++;
    }
    return n;
  }

  private marcarRecorde(): void {
    if (this.pontos > this.recorde) this.recorde = this.pontos;
  }

  /** Avança um passo de jogo e conta o que aconteceu. */
  passo(): Resultado {
    const r = vazio(this.corpo[0]);
    if (this.estado !== 'a-jogar') return r;

    const proxima = this.fila.shift();
    if (proxima) this.direcao = proxima;

    this.anterior = this.corpo.map((p) => ({ ...p }));

    const v = VETORES[this.direcao];
    let cabeca: Ponto = { x: this.corpo[0].x + v.x, y: this.corpo[0].y + v.y };
    r.cabeca = cabeca;

    if (cabeca.x < 0 || cabeca.y < 0 || cabeca.x >= this.lado || cabeca.y >= this.lado) {
      if (this.atravessaParedes()) {
        cabeca = { x: (cabeca.x + this.lado) % this.lado, y: (cabeca.y + this.lado) % this.lado };
        r.cabeca = cabeca;
      } else {
        this.estado = 'morto';
        this.marcarRecorde();
        r.morreu = true;
        return r;
      }
    }

    const comeu = cabeca.x === this.comida.x && cabeca.y === this.comida.y;
    let remover = 0;
    if (comeu && this.comida.tipo === 'leve') remover = Math.min(2, Math.max(0, this.corpo.length - 2));
    else if (!comeu && this.crescimentoPendente > 0) this.crescimentoPendente--;
    else if (!comeu) remover = 1;
    let restante = remover > 0 ? this.corpo.slice(0, -remover) : [...this.corpo];

    if (this.bloqueada(cabeca.x, cabeca.y)) {
      this.estado = 'morto';
      this.marcarRecorde();
      r.morreu = true;
      return r;
    }

    const colisaoCorpo = restante.findIndex((p) => p.x === cabeca.x && p.y === cabeca.y);
    if (colisaoCorpo >= 0) {
      if (this.semDerrota()) {
        restante = restante.slice(0, colisaoCorpo);
        r.cortou = true;
      } else {
        this.estado = 'morto';
        this.marcarRecorde();
        r.morreu = true;
        return r;
      }
    }

    this.corpo = [cabeca, ...restante];
    // Alinhar os dois instantes: o segmento novo nasce parado em cima da cauda velha.
    while (this.anterior.length < this.corpo.length) {
      this.anterior.push({ ...this.anterior[this.anterior.length - 1] });
    }

    r.moveu = true;
    this.passosDesdeComida++;

    if (comeu) {
      const tipo = this.comida.tipo;
      this.comidas++;
      if (tipo !== 'normal') this.especiais++;
      this.combo = this.passosDesdeComida <= 22 ? Math.min(5, this.combo + 1) : 1;
      this.melhorCombo = Math.max(this.melhorCombo, this.combo);
      this.passosDesdeComida = 0;
      const base = tipo === 'ouro' ? 3 : tipo === 'gigante' ? 2 : 1;
      const risco = this.modo === 'uma-vida' ? 2 : 1;
      const ganhos = base * this.combo * risco;
      this.pontos += ganhos;
      if (tipo === 'gigante') this.crescimentoPendente += 2;
      this.marcarRecorde();
      r.comeu = true;
      r.ganhos = ganhos;
      r.tipoComida = tipo;
      r.marco = Math.floor((this.pontos - ganhos) / MARCO) !== Math.floor(this.pontos / MARCO);
      if (!this.novaComida()) {
        this.estado = 'completo';
        r.completo = true;
      }
    }

    return r;
  }
}
