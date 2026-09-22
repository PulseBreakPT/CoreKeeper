/**
 * PRISMA — a luz parte-se contra os prismas.
 *
 * Lógica pura, sem DOM e sem Canvas: o tabuleiro vive num espaço lógico de
 * 90 × 160 unidades e quem desenha que o escale. Assim o jogo é testável e a
 * física não muda com o tamanho do ecrã.
 *
 * Três armadilhas clássicas deste género, todas tratadas aqui:
 *
 * - **Bola presa.** Um ressalto pode deixar a trajectória quase horizontal e a
 *   bola fica a saltar entre paredes sem nunca descer. O ângulo é sempre
 *   reposto para que a componente vertical não desça de um mínimo.
 * - **Atravessar blocos.** A uma velocidade alta, ou num quadro que demore
 *   mais do que devia, a bola saltaria por cima de um bloco inteiro. O passo é
 *   subdividido para nunca avançar mais do que meio raio de cada vez.
 * - **Colisões múltiplas no mesmo quadro.** Cada subpasso resolve no máximo um
 *   bloco, o da menor penetração, e sai de lá antes de continuar.
 */

export const LARGURA = 90;
export const ALTURA = 140;
export const RAIO = 1.7;
export const RAQUETE_LARGURA = 17;
export const RAQUETE_ALTURA = 2.4;
/** Distância entre a raquete e o fundo: espaço para o polegar não tapar a bola. */
export const RAQUETE_Y = ALTURA - 13;
export const COLUNAS = 7;
export const VIDAS_INICIAIS = 3;

const MARGEM_X = 4;
const TOPO_BLOCOS = 20;
const ESPACO = 1.2;
const BLOCO_ALTURA = 5.2;
const VELOCIDADE_BASE = 58;
const VELOCIDADE_MAXIMA = 104;
/** Fracção mínima da velocidade que tem de ser vertical: mata a bola presa. */
const VERTICAL_MINIMA = 0.34;
/**
 * E a mínima horizontal. Sem ela, uma bola devolvida pelo meio da raquete sai
 * a direito, bate no tecto, volta ao mesmo sítio e fica assim para sempre —
 * uma partida que nunca mais acaba sem o jogador ter feito nada de errado.
 */
const HORIZONTAL_MINIMA = 0.15;
/** Ângulo máximo de saída da raquete, medido à vertical. */
const ABERTURA_MAXIMA = 1.05;

export type EstadoPrisma = 'pronto' | 'jogar' | 'pausa' | 'fim';

export interface Bloco {
  x: number;
  y: number;
  largura: number;
  altura: number;
  /** Quantos toques ainda aguenta. */
  resistencia: number;
  /** Desvio de matiz em relação ao dourado da casa. */
  tom: number;
}

export interface Impacto { x: number; y: number; tom: number }

export interface EventoPrisma {
  /** Blocos partidos neste passo. */
  partidos: Impacto[];
  /** Ressaltos sem destruição: paredes, raquete e blocos que aguentaram. */
  toques: Impacto[];
  pontos: number;
  perdeuVida: boolean;
  nivelCompleto: boolean;
  terminou: boolean;
  recordeNovo: boolean;
}

const vazio = (): EventoPrisma => ({
  partidos: [], toques: [], pontos: 0,
  perdeuVida: false, nivelCompleto: false, terminou: false, recordeNovo: false,
});

export interface Opcoes {
  aleatorio?: () => number;
  recorde?: number;
}

export class Quebra {
  raquete = { x: LARGURA / 2, largura: RAQUETE_LARGURA };
  bola = { x: LARGURA / 2, y: RAQUETE_Y - RAIO - 0.2, vx: 0, vy: 0 };
  /** A bola descansa em cima da raquete até ao primeiro toque. */
  presa = true;
  blocos: Bloco[] = [];
  vidas = VIDAS_INICIAIS;
  pontos = 0;
  nivel = 1;
  recorde = 0;
  estado: EstadoPrisma = 'pronto';
  /** Blocos partidos sem a bola tocar na raquete: alimenta o multiplicador. */
  sequencia = 0;
  melhorSequencia = 0;
  private aleatorio: () => number;

  constructor(opcoes: Opcoes = {}) {
    this.aleatorio = opcoes.aleatorio ?? Math.random;
    this.recorde = Math.max(0, Math.floor(opcoes.recorde ?? 0));
    this.reiniciar();
  }

  reiniciar(): void {
    this.vidas = VIDAS_INICIAIS;
    this.pontos = 0;
    this.nivel = 1;
    this.estado = 'pronto';
    this.sequencia = 0;
    this.melhorSequencia = 0;
    this.montarNivel();
  }

  iniciar(): void { if (this.estado === 'pronto') this.estado = 'jogar'; }
  pausar(): void {
    if (this.estado === 'jogar') this.estado = 'pausa';
    else if (this.estado === 'pausa') this.estado = 'jogar';
  }

  /** Velocidade da bola neste nível, com tecto para continuar jogável. */
  velocidade(): number {
    return Math.min(VELOCIDADE_MAXIMA, VELOCIDADE_BASE * Math.pow(1.065, this.nivel - 1));
  }

  /** Quantas filas de prismas este nível tem. */
  private filas(): number { return Math.min(7, 3 + Math.floor((this.nivel + 1) / 2)); }

  private montarNivel(): void {
    this.blocos = [];
    const filas = this.filas();
    const largura = (LARGURA - MARGEM_X * 2 - ESPACO * (COLUNAS - 1)) / COLUNAS;
    for (let fila = 0; fila < filas; fila++) {
      for (let coluna = 0; coluna < COLUNAS; coluna++) {
        // A partir do quarto nível as filas de cima ganham uma segunda camada.
        const dura = this.nivel >= 4 && fila < Math.min(2, this.nivel - 3);
        this.blocos.push({
          x: MARGEM_X + coluna * (largura + ESPACO),
          y: TOPO_BLOCOS + fila * (BLOCO_ALTURA + ESPACO),
          largura,
          altura: BLOCO_ALTURA,
          resistencia: dura ? 2 : 1,
          // O espectro do prisma mantém-se dentro da família da casa: do
          // dourado em baixo ao âmbar em cima. Abrir mais o leque levava as
          // filas de topo para o verde e o jogo deixava de parecer Nexus.
          tom: -(filas - fila) * 5,
        });
      }
    }
    this.reporBola();
  }

  /** Devolve a bola à raquete e volta a prendê-la. */
  private reporBola(): void {
    this.raquete.x = LARGURA / 2;
    this.bola.x = this.raquete.x;
    this.bola.y = RAQUETE_Y - RAIO - 0.2;
    this.bola.vx = 0;
    this.bola.vy = 0;
    this.presa = true;
    this.sequencia = 0;
  }

  /** Arrasta a raquete. O valor vem em unidades lógicas e é preso à arena. */
  mover(x: number): void {
    if (this.estado !== 'jogar' && this.estado !== 'pronto') return;
    const meia = this.raquete.largura / 2;
    this.raquete.x = Math.max(meia, Math.min(LARGURA - meia, x));
    if (this.presa) this.bola.x = this.raquete.x;
  }

  /** Larga a bola. Sai sempre para cima, com um desvio pequeno e aleatório. */
  lancar(): void {
    if (this.estado === 'pronto') this.iniciar();
    if (this.estado !== 'jogar' || !this.presa) return;
    const desvio = (this.aleatorio() - 0.5) * 0.5;
    const v = this.velocidade();
    this.bola.vx = Math.sin(desvio) * v;
    this.bola.vy = -Math.cos(desvio) * v;
    this.presa = false;
  }

  /**
   * Repõe o ângulo para que a bola nunca fique a rasar a horizontal, que é
   * como ela acabava presa a saltar de parede em parede sem descer nunca.
   */
  private normalizar(): void {
    const v = this.velocidade();
    const { vx, vy } = this.bola;
    const actual = Math.hypot(vx, vy) || v;
    let nx = (vx / actual) * v;
    let ny = (vy / actual) * v;

    // Primeiro a vertical: nunca a rasar a horizontal entre as duas paredes.
    const minimoY = v * VERTICAL_MINIMA;
    if (Math.abs(ny) < minimoY) {
      ny = minimoY * (ny === 0 ? -1 : Math.sign(ny));
      nx = Math.sign(nx || 1) * Math.sqrt(Math.max(0, v * v - ny * ny));
    }
    // Depois a horizontal: nunca a subir e a descer na mesma coluna.
    const minimoX = v * HORIZONTAL_MINIMA;
    if (Math.abs(nx) < minimoX) {
      const sinal = nx === 0 ? (this.aleatorio() < 0.5 ? -1 : 1) : Math.sign(nx);
      nx = minimoX * sinal;
      ny = Math.sign(ny || -1) * Math.sqrt(Math.max(0, v * v - nx * nx));
    }

    this.bola.vx = nx;
    this.bola.vy = ny;
  }

  /**
   * O bloco sobreposto mais fundo, e por que eixo e em que sentido sair dele.
   *
   * Resolver por penetração — e não pelo sinal da velocidade — é o que impede
   * a bola de encravar entre dois blocos: sai sempre pela aresta mais curta,
   * exactamente a distância que está enterrada, nunca para dentro do vizinho.
   */
  private colisaoBloco(): { indice: number; eixo: 'x' | 'y'; saida: number; penetracao: number } | null {
    let melhor: { indice: number; eixo: 'x' | 'y'; saida: number; penetracao: number } | null = null;
    for (let i = 0; i < this.blocos.length; i++) {
      const b = this.blocos[i];
      const centroX = b.x + b.largura / 2;
      const centroY = b.y + b.altura / 2;
      const sobraX = RAIO + b.largura / 2 - Math.abs(this.bola.x - centroX);
      const sobraY = RAIO + b.altura / 2 - Math.abs(this.bola.y - centroY);
      if (sobraX <= 0 || sobraY <= 0) continue;
      const eixo: 'x' | 'y' = sobraX < sobraY ? 'x' : 'y';
      const penetracao = Math.min(sobraX, sobraY);
      const distancia = eixo === 'x' ? this.bola.x - centroX : this.bola.y - centroY;
      const saida = Math.sign(distancia) || 1;
      if (!melhor || penetracao > melhor.penetracao) melhor = { indice: i, eixo, saida, penetracao };
    }
    return melhor;
  }

  private pontosDoBloco(b: Bloco): number {
    const fila = Math.round((b.y - TOPO_BLOCOS) / (BLOCO_ALTURA + ESPACO));
    // As filas de cima valem mais, e a sequência sem tocar na raquete soma.
    return (10 + Math.max(0, 6 - fila) * 5) * Math.min(4, 1 + Math.floor(this.sequencia / 4));
  }

  /**
   * Avança o jogo. `dt` vem em segundos e é subdividido para a bola nunca
   * percorrer mais do que meio raio de cada vez — é isso que a impede de
   * atravessar um bloco inteiro num quadro lento.
   */
  passo(dt: number): EventoPrisma {
    const ev = vazio();
    if (this.estado !== 'jogar' || this.presa) return ev;
    const passo = Math.max(0, Math.min(0.05, dt));
    const distancia = Math.hypot(this.bola.vx, this.bola.vy) * passo;
    const subpassos = Math.max(1, Math.ceil(distancia / (RAIO * 0.5)));
    const sub = passo / subpassos;

    for (let i = 0; i < subpassos; i++) {
      if (this.estado !== 'jogar' || this.presa) break;
      this.avancar(sub, ev);
    }

    if (this.pontos > this.recorde) { this.recorde = this.pontos; ev.recordeNovo = true; }
    return ev;
  }

  private avancar(dt: number, ev: EventoPrisma): void {
    this.bola.x += this.bola.vx * dt;
    this.bola.y += this.bola.vy * dt;

    // Paredes laterais e tecto.
    if (this.bola.x - RAIO < 0) {
      this.bola.x = RAIO;
      this.bola.vx = Math.abs(this.bola.vx);
      ev.toques.push({ x: this.bola.x, y: this.bola.y, tom: 0 });
    } else if (this.bola.x + RAIO > LARGURA) {
      this.bola.x = LARGURA - RAIO;
      this.bola.vx = -Math.abs(this.bola.vx);
      ev.toques.push({ x: this.bola.x, y: this.bola.y, tom: 0 });
    }
    if (this.bola.y - RAIO < 0) {
      this.bola.y = RAIO;
      this.bola.vy = Math.abs(this.bola.vy);
      ev.toques.push({ x: this.bola.x, y: this.bola.y, tom: 0 });
    }

    // Raquete: só conta a descer, senão a bola colava-se por baixo.
    const meia = this.raquete.largura / 2;
    const dentroX = this.bola.x > this.raquete.x - meia - RAIO && this.bola.x < this.raquete.x + meia + RAIO;
    const tocaY = this.bola.y + RAIO >= RAQUETE_Y && this.bola.y - RAIO <= RAQUETE_Y + RAQUETE_ALTURA;
    if (this.bola.vy > 0 && dentroX && tocaY) {
      this.bola.y = RAQUETE_Y - RAIO;
      // Onde bate decide para onde sai: é este o controlo fino do jogo.
      const desvio = Math.max(-1, Math.min(1, (this.bola.x - this.raquete.x) / meia));
      const angulo = desvio * ABERTURA_MAXIMA;
      const v = this.velocidade();
      this.bola.vx = Math.sin(angulo) * v;
      this.bola.vy = -Math.cos(angulo) * v;
      this.sequencia = 0;
      ev.toques.push({ x: this.bola.x, y: RAQUETE_Y, tom: 0 });
    }

    // No máximo um bloco por subpasso: sem isto uma bola rápida resolvia dois
    // ao mesmo tempo e saía com a direcção trocada.
    const toque = this.colisaoBloco();
    if (toque) {
      const bloco = this.blocos[toque.indice];
      if (toque.eixo === 'x') {
        this.bola.x += toque.saida * toque.penetracao;
        // Só inverte se ainda ia contra o bloco: já a sair, inverter outra vez
        // era mandá-la de volta para dentro.
        if (Math.sign(this.bola.vx) !== toque.saida) this.bola.vx = -this.bola.vx;
      } else {
        this.bola.y += toque.saida * toque.penetracao;
        if (Math.sign(this.bola.vy) !== toque.saida) this.bola.vy = -this.bola.vy;
      }
      bloco.resistencia--;
      if (bloco.resistencia <= 0) {
        this.blocos.splice(toque.indice, 1);
        this.sequencia++;
        this.melhorSequencia = Math.max(this.melhorSequencia, this.sequencia);
        ev.pontos += this.pontosDoBloco(bloco);
        this.pontos += this.pontosDoBloco(bloco);
        ev.partidos.push({ x: bloco.x + bloco.largura / 2, y: bloco.y + bloco.altura / 2, tom: bloco.tom });
      } else {
        ev.toques.push({ x: this.bola.x, y: this.bola.y, tom: bloco.tom });
      }
      if (this.blocos.length === 0) {
        this.nivel++;
        ev.nivelCompleto = true;
        this.montarNivel();
        return;
      }
    }

    this.normalizar();

    // Caiu abaixo da raquete.
    if (this.bola.y - RAIO > ALTURA) {
      this.vidas--;
      ev.perdeuVida = true;
      if (this.vidas <= 0) {
        this.vidas = 0;
        this.estado = 'fim';
        ev.terminou = true;
      }
      this.reporBola();
    }
  }
}
