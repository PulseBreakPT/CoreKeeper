export type DirecaoMaze = 'cima' | 'baixo' | 'esquerda' | 'direita';
export type EstadoFantasma = 'normal' | 'assustado' | 'olhos';
export interface Posicao { x: number; y: number }
export interface Entidade extends Posicao { anterior: Posicao; direcao: DirecaoMaze }
export interface Fantasma extends Entidade { id: number; estado: EstadoFantasma; casa: Posicao }
export interface EventoMaze { comeu: number; energia: boolean; fantasma: number; fruta: boolean; morreu: boolean; nivel: boolean; terminou: boolean }

export const MAPA_BASE = [
  '###################', '#o.......#.......o#', '#.###.##.#.##.###.#', '#.................#',
  '#.###.#.###.#.###.#', '#.....#..#..#.....#', '#####.## # ##.#####', '    #.#     #.#    ',
  '#####.# ### #.#####', '     .  # #  .     ', '#####.# ### #.#####', '    #.#     #.#    ',
  '#####.#.###.#.#####', '#........#........#', '#.###.##.#.##.###.#', '#o..#.........#..o#',
  '##.#.#.#####.#.#.##', '#.....#..#..#.....#', '#.#######.#######.#', '#.................#',
  '###################',
] as const;
export const COLUNAS_MAZE = 19;
export const LINHAS_MAZE = MAPA_BASE.length;
const V: Record<DirecaoMaze, Posicao> = { cima:{x:0,y:-1}, baixo:{x:0,y:1}, esquerda:{x:-1,y:0}, direita:{x:1,y:0} };
const DIRECOES: DirecaoMaze[] = ['cima','esquerda','baixo','direita'];
const OPOSTA: Record<DirecaoMaze, DirecaoMaze> = { cima:'baixo', baixo:'cima', esquerda:'direita', direita:'esquerda' };

const vazio = (): EventoMaze => ({ comeu:0, energia:false, fantasma:0, fruta:false, morreu:false, nivel:false, terminou:false });

export class Labirinto {
  mapa: string[][] = [];
  jogador: Entidade = { x:9, y:15, anterior:{x:9,y:15}, direcao:'esquerda' };
  fantasmas: Fantasma[] = [];
  desejada: DirecaoMaze = 'esquerda';
  pontos = 0;
  recorde = 0;
  vidas = 3;
  nivel = 1;
  pellets = 0;
  comboFantasmas = 0;
  energia = 0;
  fruta: Posicao | null = null;
  estado: 'pronto'|'jogar'|'pausa'|'fim'|'nivel' = 'pronto';
  mensagem = '';
  private passos = 0;
  private pausaPassos = 0;
  private modoPassos = 0;
  private perseguir = false;
  private frutaApareceu = new Set<number>();

  constructor(private aleatorio: () => number = Math.random) { this.reiniciar(); }

  reiniciar(): void {
    this.pontos = 0; this.vidas = 3; this.nivel = 1; this.estado = 'pronto'; this.carregarNivel();
  }

  private carregarNivel(): void {
    this.mapa = MAPA_BASE.map((r) => [...r].map((c) => c === '.' || c === 'o' ? c : c === '#' ? '#' : ' '));
    this.pellets = this.mapa.flat().filter((c) => c === '.' || c === 'o').length;
    this.frutaApareceu.clear(); this.fruta = null; this.energia = 0; this.comboFantasmas = 0; this.passos = 0; this.modoPassos = 0; this.perseguir = false;
    this.reporPosicoes();
  }

  private reporPosicoes(): void {
    this.jogador = { x:9, y:15, anterior:{x:9,y:15}, direcao:'esquerda' }; this.desejada = 'esquerda';
    const casas = [{x:9,y:11},{x:8,y:11},{x:10,y:11},{x:7,y:11}];
    this.fantasmas = casas.map((c,id) => ({ ...c, anterior:{...c}, direcao: id % 2 ? 'direita':'esquerda', id, estado:'normal', casa:{...c} }));
    this.pausaPassos = 7;
  }

  iniciar(): void { if (this.estado === 'pronto') this.estado = 'jogar'; }
  pausar(): void { if (this.estado === 'jogar') this.estado = 'pausa'; else if (this.estado === 'pausa') this.estado = 'jogar'; }
  pedir(d: DirecaoMaze): void { if (this.estado === 'pronto') this.iniciar(); if (this.estado === 'jogar') this.desejada = d; }
  /** Ritmo pensado para gestos num ecrã tátil: começa legível e acelera sem se tornar caótico. */
  intervalo(): number { return Math.max(180, 320 - (this.nivel - 1) * 8); }

  private destino(p: Posicao, d: DirecaoMaze): Posicao {
    let x = p.x + V[d].x, y = p.y + V[d].y;
    if (x < 0) x = COLUNAS_MAZE - 1; else if (x >= COLUNAS_MAZE) x = 0;
    return { x, y };
  }

  private livre(p: Posicao): boolean { return p.y >= 0 && p.y < LINHAS_MAZE && this.mapa[p.y][p.x] !== '#'; }
  private pode(p: Posicao, d: DirecaoMaze): boolean { return this.livre(this.destino(p,d)); }

  private mover(e: Entidade, d: DirecaoMaze): void {
    e.anterior = { x:e.x, y:e.y }; const p = this.destino(e,d); e.x = p.x; e.y = p.y; e.direcao = d;
    if (Math.abs(e.x - e.anterior.x) > 2) e.anterior.x = e.x;
  }

  private alvoFantasma(f: Fantasma): Posicao {
    if (!this.perseguir) return [{x:17,y:1},{x:1,y:1},{x:17,y:19},{x:1,y:19}][f.id];
    const v = V[this.jogador.direcao];
    if (f.id === 0) return { x:this.jogador.x, y:this.jogador.y };
    if (f.id === 1) return { x:this.jogador.x + v.x * 4, y:this.jogador.y + v.y * 4 };
    if (f.id === 2) {
      const vermelho = this.fantasmas[0], frente = { x:this.jogador.x + v.x * 2, y:this.jogador.y + v.y * 2 };
      return { x:frente.x * 2 - vermelho.x, y:frente.y * 2 - vermelho.y };
    }
    const distancia = Math.hypot(f.x - this.jogador.x, f.y - this.jogador.y);
    return distancia > 7 ? { x:this.jogador.x, y:this.jogador.y } : { x:1, y:19 };
  }

  /** Distância de rota real por BFS: os fantasmas compreendem paredes e túneis. */
  private distancia(origem: Posicao, alvo: Posicao): number {
    const vistos = new Set<string>([`${origem.x},${origem.y}`]); const fila: { p:Posicao; d:number }[] = [{p:origem,d:0}];
    while (fila.length) {
      const {p,d} = fila.shift()!;
      if (p.x === alvo.x && p.y === alvo.y) return d;
      for (const dir of DIRECOES) { const n = this.destino(p,dir), k=`${n.x},${n.y}`; if (this.livre(n) && !vistos.has(k)) { vistos.add(k); fila.push({p:n,d:d+1}); } }
    }
    return Math.abs(origem.x-alvo.x)+Math.abs(origem.y-alvo.y)+50;
  }

  private escolherFantasma(f: Fantasma): DirecaoMaze {
    let opcoes = DIRECOES.filter((d) => this.pode(f,d) && d !== OPOSTA[f.direcao]);
    if (!opcoes.length) opcoes = DIRECOES.filter((d) => this.pode(f,d));
    if (f.estado === 'assustado') return opcoes[Math.floor(this.aleatorio()*opcoes.length)] ?? OPOSTA[f.direcao];
    const alvo = f.estado === 'olhos' ? f.casa : this.alvoFantasma(f);
    return opcoes.sort((a,b) => this.distancia(this.destino(f,a),alvo)-this.distancia(this.destino(f,b),alvo))[0] ?? f.direcao;
  }

  private colisao(ev: EventoMaze): boolean {
    for (const f of this.fantasmas) {
      const cruzou = (f.x===this.jogador.x && f.y===this.jogador.y) || (f.x===this.jogador.anterior.x && f.y===this.jogador.anterior.y && f.anterior.x===this.jogador.x && f.anterior.y===this.jogador.y);
      if (!cruzou || f.estado === 'olhos') continue;
      if (f.estado === 'assustado') { f.estado='olhos'; this.comboFantasmas++; ev.fantasma = 200 * 2 ** (this.comboFantasmas-1); this.pontos += ev.fantasma; f.direcao=OPOSTA[f.direcao]; }
      else { this.vidas--; ev.morreu=true; this.energia=0; this.comboFantasmas=0; if (this.vidas<=0) { this.estado='fim'; ev.terminou=true; } else this.reporPosicoes(); return true; }
    }
    return false;
  }

  passo(): EventoMaze {
    const ev=vazio(); if (this.estado!=='jogar') return ev;
    if (this.pausaPassos>0) { this.pausaPassos--; return ev; }
    this.passos++; this.modoPassos++;
    if (this.modoPassos >= (this.perseguir ? 150 : 52)) { this.perseguir=!this.perseguir; this.modoPassos=0; for (const f of this.fantasmas) if (f.estado==='normal') f.direcao=OPOSTA[f.direcao]; }
    if (this.energia>0 && --this.energia===0) { this.comboFantasmas=0; for (const f of this.fantasmas) if(f.estado==='assustado') f.estado='normal'; }

    if (this.pode(this.jogador,this.desejada)) this.jogador.direcao=this.desejada;
    if (this.pode(this.jogador,this.jogador.direcao)) this.mover(this.jogador,this.jogador.direcao); else this.jogador.anterior={x:this.jogador.x,y:this.jogador.y};
    const celula=this.mapa[this.jogador.y][this.jogador.x];
    if (celula==='.' || celula==='o') {
      ev.comeu=celula==='o'?50:10; this.pontos+=ev.comeu; this.pellets--; this.mapa[this.jogador.y][this.jogador.x]=' ';
      if (celula==='o') { ev.energia=true; this.energia=Math.max(34,70-this.nivel*4); this.comboFantasmas=0; for(const f of this.fantasmas) if(f.estado==='normal'){f.estado='assustado';f.direcao=OPOSTA[f.direcao];} }
      const comidos=MAPA_BASE.flatMap(r=>[...r]).filter(c=>c==='.'||c==='o').length-this.pellets;
      for(const marco of [45,115]) if(comidos>=marco&&!this.frutaApareceu.has(marco)){this.frutaApareceu.add(marco);this.fruta={x:9,y:15};}
    }
    if(this.fruta&&this.fruta.x===this.jogador.x&&this.fruta.y===this.jogador.y){ev.fruta=true;this.pontos+=100*this.nivel;this.fruta=null;}
    if(this.colisao(ev)) return ev;
    for(const f of this.fantasmas){
      if(f.estado==='olhos'&&f.x===f.casa.x&&f.y===f.casa.y)f.estado='normal';
      const vantagemInicial = this.nivel <= 2 && (this.passos + f.id) % 4 === 0;
      const maisLento=(f.estado==='assustado'&&this.passos%2===0) || vantagemInicial;
      if(!maisLento)this.mover(f,this.escolherFantasma(f));else f.anterior={x:f.x,y:f.y};
    }
    this.colisao(ev);
    if(this.pellets<=0){this.nivel++;ev.nivel=true;this.estado='nivel';this.carregarNivel();this.estado='jogar';this.pausaPassos=12;}
    if(this.pontos>this.recorde)this.recorde=this.pontos;
    return ev;
  }
}
