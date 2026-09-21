export type TipoPeca = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type Celula = TipoPeca | null;
export interface Peca { tipo: TipoPeca; x: number; y: number; rotacao: number }
export interface EventoTetris { linhas: number; pontos: number; nome: string; terminou: boolean; nivelSubiu: boolean; limpas: { y: number; tipos: TipoPeca[] }[] }

export const COLUNAS = 10;
export const LINHAS = 22;
export const OCULTAS = 2;
const TIPOS: TipoPeca[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

const FORMAS: Record<TipoPeca, number[][][]> = {
  I: [
    [[0,1],[1,1],[2,1],[3,1]], [[2,0],[2,1],[2,2],[2,3]],
    [[0,2],[1,2],[2,2],[3,2]], [[1,0],[1,1],[1,2],[1,3]],
  ],
  O: Array(4).fill([[1,0],[2,0],[1,1],[2,1]]),
  T: [
    [[1,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[2,1],[1,2]], [[1,0],[0,1],[1,1],[1,2]],
  ],
  S: [
    [[1,0],[2,0],[0,1],[1,1]], [[1,0],[1,1],[2,1],[2,2]],
    [[1,1],[2,1],[0,2],[1,2]], [[0,0],[0,1],[1,1],[1,2]],
  ],
  Z: [
    [[0,0],[1,0],[1,1],[2,1]], [[2,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[1,2],[2,2]], [[1,0],[0,1],[1,1],[0,2]],
  ],
  J: [
    [[0,0],[0,1],[1,1],[2,1]], [[1,0],[2,0],[1,1],[1,2]],
    [[0,1],[1,1],[2,1],[2,2]], [[1,0],[1,1],[0,2],[1,2]],
  ],
  L: [
    [[2,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,1],[0,2]], [[0,0],[1,0],[1,1],[1,2]],
  ],
};

export function blocos(peca: Peca): { x: number; y: number }[] {
  return FORMAS[peca.tipo][peca.rotacao].map(([x, y]) => ({ x: peca.x + x, y: peca.y + y }));
}

export class Tetris {
  grelha: Celula[][] = [];
  peca!: Peca;
  fila: TipoPeca[] = [];
  reserva: TipoPeca | null = null;
  podeReservar = true;
  pontos = 0;
  linhas = 0;
  nivel = 1;
  combo = -1;
  recorde = 0;
  estado: 'pronto' | 'jogar' | 'pausa' | 'fim' = 'pronto';
  quedaMs = 0;
  bloqueioMs = 0;
  private repeticoesBloqueio = 0;
  private ultimaFoiRotacao = false;
  private backToBack = false;
  private saco: TipoPeca[] = [];

  constructor(private aleatorio: () => number = Math.random) { this.reiniciar(); }

  reiniciar(): void {
    this.grelha = Array.from({ length: LINHAS }, () => Array<Celula>(COLUNAS).fill(null));
    this.fila = []; this.saco = []; this.reserva = null; this.podeReservar = true;
    this.pontos = 0; this.linhas = 0; this.nivel = 1; this.combo = -1;
    this.quedaMs = 0; this.bloqueioMs = 0; this.repeticoesBloqueio = 0;
    this.estado = 'pronto'; this.encherFila(); this.criarPeca();
  }

  iniciar(): void { if (this.estado === 'pronto') this.estado = 'jogar'; }
  pausa(): void { if (this.estado === 'jogar') this.estado = 'pausa'; else if (this.estado === 'pausa') this.estado = 'jogar'; }

  private encherFila(): void {
    while (this.fila.length < 6) {
      if (!this.saco.length) {
        this.saco = [...TIPOS];
        for (let i = this.saco.length - 1; i > 0; i--) { const j = Math.floor(this.aleatorio() * (i + 1)); [this.saco[i], this.saco[j]] = [this.saco[j], this.saco[i]]; }
      }
      this.fila.push(this.saco.pop()!);
    }
  }

  private criarPeca(tipo = this.fila.shift()!): void {
    this.encherFila();
    this.peca = { tipo, x: 3, y: 1, rotacao: 0 };
    this.podeReservar = true; this.bloqueioMs = 0; this.repeticoesBloqueio = 0; this.ultimaFoiRotacao = false;
    if (this.colide(this.peca)) this.estado = 'fim';
  }

  colide(p: Peca): boolean {
    return blocos(p).some(({ x, y }) => x < 0 || x >= COLUNAS || y >= LINHAS || (y >= 0 && this.grelha[y][x] !== null));
  }

  mover(dx: number, dy: number, manual = false): boolean {
    if (this.estado !== 'jogar') return false;
    const apoiada = this.colide({ ...this.peca, y: this.peca.y + 1 });
    const alvo = { ...this.peca, x: this.peca.x + dx, y: this.peca.y + dy };
    if (this.colide(alvo)) return false;
    this.peca = alvo; this.ultimaFoiRotacao = false;
    if (manual && dy > 0) this.pontos += dy;
    if (dx !== 0 && apoiada && this.repeticoesBloqueio < 15) { this.bloqueioMs = 0; this.repeticoesBloqueio++; }
    return true;
  }

  rodar(sentido = 1): boolean {
    if (this.estado !== 'jogar' || this.peca.tipo === 'O') return false;
    const apoiada = this.colide({ ...this.peca, y: this.peca.y + 1 });
    const de = this.peca.rotacao;
    const para = (de + sentido + 4) % 4;
    const testes = this.peca.tipo === 'I'
      ? [[0,0],[-2,0],[1,0],[-2,-1],[1,2],[0,-1],[0,1]]
      : [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1],[0,1]];
    for (const [dx, dy] of testes) {
      const alvo = { ...this.peca, rotacao: para, x: this.peca.x + dx, y: this.peca.y + dy };
      if (!this.colide(alvo)) {
        this.peca = alvo; this.ultimaFoiRotacao = true;
        if (apoiada && this.repeticoesBloqueio < 15) { this.bloqueioMs = 0; this.repeticoesBloqueio++; }
        return true;
      }
    }
    return false;
  }

  reservar(): boolean {
    if (this.estado !== 'jogar' || !this.podeReservar) return false;
    const actual = this.peca.tipo;
    if (this.reserva) { const guardada = this.reserva; this.reserva = actual; this.criarPeca(guardada); }
    else { this.reserva = actual; this.criarPeca(); }
    this.podeReservar = false;
    return true;
  }

  fantasma(): Peca { const p = { ...this.peca }; while (!this.colide({ ...p, y: p.y + 1 })) p.y++; return p; }

  quedaTotal(): EventoTetris {
    if (this.estado !== 'jogar') return { linhas: 0, pontos: 0, nome: '', terminou: false, nivelSubiu: false, limpas: [] };
    const inicio = this.peca.y; this.peca = this.fantasma(); this.pontos += Math.max(0, this.peca.y - inicio) * 2;
    return this.fixar();
  }

  actualizar(ms: number): EventoTetris | null {
    if (this.estado !== 'jogar') return null;
    this.quedaMs += ms;
    const intervalo = Math.max(55, 900 * Math.pow(.82, this.nivel - 1));
    if (this.quedaMs >= intervalo) { this.quedaMs %= intervalo; if (!this.mover(0, 1)) this.bloqueioMs += ms; }
    else if (this.colide({ ...this.peca, y: this.peca.y + 1 })) this.bloqueioMs += ms;
    else this.bloqueioMs = 0;
    return this.bloqueioMs >= 480 ? this.fixar() : null;
  }

  private tSpin(): boolean {
    if (this.peca.tipo !== 'T' || !this.ultimaFoiRotacao) return false;
    const cx = this.peca.x + 1, cy = this.peca.y + 1;
    return [[-1,-1],[1,-1],[-1,1],[1,1]].filter(([dx,dy]) => cx + dx < 0 || cx + dx >= COLUNAS || cy + dy >= LINHAS || cy + dy < 0 || this.grelha[cy + dy][cx + dx]).length >= 3;
  }

  private fixar(): EventoTetris {
    const antes = this.pontos; const nivelAntes = this.nivel; const spin = this.tSpin();
    for (const { x, y } of blocos(this.peca)) { if (y < 0) { this.estado = 'fim'; return { linhas: 0, pontos: 0, nome: 'FIM', terminou: true, nivelSubiu: false, limpas: [] }; } this.grelha[y][x] = this.peca.tipo; }
    const completas: number[] = [];
    for (let y = 0; y < LINHAS; y++) if (this.grelha[y].every(Boolean)) completas.push(y);
    const limpas = completas.map((y) => ({ y, tipos: this.grelha[y] as TipoPeca[] }));
    for (const y of completas) { this.grelha.splice(y, 1); this.grelha.unshift(Array<Celula>(COLUNAS).fill(null)); }
    const n = completas.length; this.combo = n ? this.combo + 1 : -1;
    const base = spin ? [400, 800, 1200, 1600][n] : [0, 100, 300, 500, 800][n];
    const dificil = n === 4 || spin;
    this.pontos += Math.round(base * this.nivel * (dificil && this.backToBack ? 1.5 : 1));
    if (n && this.combo > 0) this.pontos += 50 * this.combo * this.nivel;
    if (n && this.grelha.every((linha) => linha.every((c) => !c))) this.pontos += 3500 * this.nivel;
    if (dificil) this.backToBack = true; else if (n) this.backToBack = false;
    this.linhas += n; this.nivel = 1 + Math.floor(this.linhas / 10);
    this.criarPeca();
    const nomes = spin ? `T-SPIN${n ? ` ×${n}` : ''}` : n === 4 ? 'TETRIS' : n ? `${n} LINHA${n > 1 ? 'S' : ''}` : '';
    return { linhas: n, pontos: this.pontos - antes, nome: nomes, terminou: this.estado === 'fim', nivelSubiu: this.nivel > nivelAntes, limpas };
  }
}
