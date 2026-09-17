/**
 * Simulação de The Hollow Star: acções do Portador, fauna, itens no chão,
 * guardiões e gravação.
 */

import { audio } from '../core/audio';
import { perf } from '../core/perf';
import type { Input } from '../core/input';
import { randomSeed } from '../core/rng';
import { loadRaw, saveRaw } from '../core/storage';
import {
  Inimigo, INIMIGOS, sortearElite, sortearQuedas, type ContextoIA, type Elite,
} from '../entities/enemies';
import { desencravar } from '../entities/fisica';
import { Player, type EstadoJogador } from '../entities/player';
import type { Renderer } from '../render/renderer';
import { sprite } from '../render/sprites';
import { Lighting, type FonteLuz } from '../world/lighting';
import { Block, blockDef, type StationKind } from '../world/tiles';
import { World } from '../world/world';
import { Bioma, BIOMAS, biomaEm, salasEspeciais, type InfoBioma } from '../world/worldgen';
import { Inventory, type EstadoInventario } from './inventory';
import { bonusConjunto, itemDef, itemNome, PUNHOS } from './items';
import type { Particula, Projetil, Queda, TextoFlutuante } from './tipos';

export interface GanchosUI {
  mensagem(texto: string, tipo?: 'info' | 'bom' | 'aviso' | 'lore'): void;
  abrirEstacao(estacao: StationKind | null): void;
  aoMorrer(): void;
  aoMudarBioma(info: InfoBioma): void;
}

export interface Estatisticas {
  blocos: number;
  bichos: number;
  mortes: number;
  fragmentos: number;
  profundidade: number;
}

export interface EstadoJogo {
  versao: number;
  seed: number;
  tempo: number;
  jogador: EstadoJogador;
  inventario: EstadoInventario;
  mundo: Record<string, number[]>;
  chefes: string[];
  lore: string[];
  estatisticas: Estatisticas;
}

const VERSAO_SAVE = 2;
const LIMITE_BICHOS = 20;
const INTERVALO_GRAVACAO = 20;

/** Fauna por camada. */
const FAUNA: Record<number, string[]> = {
  0: ['grubjaw', 'grubjaw', 'dustling', 'dustling', 'tunnel_maw', 'lantern_tick', 'stoneback'],
  1: ['sporekin', 'sporekin', 'vine_stalker', 'bloom_maw', 'root_walker', 'glowhorn'],
  2: ['furnace_drone', 'scrap_hound', 'scrap_hound', 'forge_sentinel', 'smelter', 'chain_walker'],
  3: ['glasscrawler', 'storm_beetle', 'storm_beetle', 'sand_wraith', 'prism_serpent'],
  4: ['murkfin', 'murkfin', 'shellwarden', 'lantern_eel', 'abyss_mouth'],
  5: ['marrow_crawler', 'bone_weaver', 'pale_hunger', 'ossuary_knight'],
  6: ['furnace_drone', 'echo_shade', 'ossuary_knight', 'phase_hunter'],
  7: ['echo_shade', 'phase_hunter', 'nullborn', 'observer'],
};

export class Game {
  world: World;
  player: Player;
  inventario = new Inventory();
  inimigos: Inimigo[] = [];
  quedas: Queda[] = [];
  particulas: Particula[] = [];
  projeteis: Projetil[] = [];
  textos: TextoFlutuante[] = [];
  lighting = new Lighting();
  chefesDerrotados = new Set<string>();
  /** Blocos cuja lore já foi mostrada. */
  loreVista = new Set<string>();
  estatisticas: Estatisticas = { blocos: 0, bichos: 0, mortes: 0, fragmentos: 0, profundidade: 0 };
  tempo = 0;
  pausado = false;
  estacaoAberta: StationKind | null = null;
  chefeAtivo: Inimigo | null = null;
  /** 0..1 — flash vermelho quando se leva dano. */
  dor = 0;
  biomaAtual = 0;

  readonly renderer: Renderer;
  private input: Input;
  private ganchos: GanchosUI;
  private tempoSpawn = 0;
  private tempoGravacao = 0;
  private tempoMorte = 0;
  private alvo: [number, number] | null = null;
  private alvoValido = false;
  private progressoAlvo = 0;

  constructor(renderer: Renderer, input: Input, ganchos: GanchosUI, seed = randomSeed()) {
    this.renderer = renderer;
    this.input = input;
    this.ganchos = ganchos;
    this.world = new World(seed);
    this.player = new Player(4.5, 4.5);
    this.equipamentoInicial();
    this.colocarJogador();
  }

  private equipamentoInicial(): void {
    this.inventario.adicionar('pick_stone', 1);
    this.inventario.adicionar('rust_cleaver', 1);
    this.inventario.adicionar('torch', 10);
    this.inventario.adicionar('glowfruit', 3);
  }

  private colocarJogador(): void {
    this.player.x = 4.5;
    this.player.y = 4.5;
    this.player.respawnX = 4.5;
    this.player.respawnY = 4.5;
    desencravar(this.world, this.player);
    this.renderer.camera.seguir(this.player.x, this.player.y, 0, true);
  }

  // --- Gravação --------------------------------------------------------------

  guardar(): boolean {
    const estado: EstadoJogo = {
      versao: VERSAO_SAVE,
      seed: this.world.seed,
      tempo: this.tempo,
      jogador: this.player.estado(),
      inventario: this.inventario.estado(),
      mundo: this.world.serializar(),
      chefes: [...this.chefesDerrotados],
      lore: [...this.loreVista],
      estatisticas: this.estatisticas,
    };
    return saveRaw(estado);
  }

  static carregar(renderer: Renderer, input: Input, ganchos: GanchosUI): Game | null {
    const estado = loadRaw<EstadoJogo>();
    if (!estado || estado.versao !== VERSAO_SAVE) return null;
    const jogo = new Game(renderer, input, ganchos, estado.seed);
    jogo.world = World.desserializar(estado.seed, estado.mundo);
    jogo.player = Player.de(estado.jogador);
    jogo.inventario = Inventory.de(estado.inventario);
    jogo.chefesDerrotados = new Set(estado.chefes ?? []);
    jogo.loreVista = new Set(estado.lore ?? []);
    jogo.estatisticas = estado.estatisticas ?? { blocos: 0, bichos: 0, mortes: 0, fragmentos: 0, profundidade: 0 };
    jogo.tempo = estado.tempo ?? 0;
    desencravar(jogo.world, jogo.player);
    renderer.camera.seguir(jogo.player.x, jogo.player.y, 0, true);
    return jogo;
  }

  // --- Ciclo -----------------------------------------------------------------

  passo(dt: number): void {
    if (this.pausado) {
      this.calcularLuz();
      return;
    }
    this.tempo += dt;
    this.dor = Math.max(0, this.dor - dt * 2.4);
    this.world.avancarRelogio(dt);
    this.input.update();
    this.aplicarEquipamento();

    if (this.player.morto) {
      this.tempoMorte += dt;
      if (this.tempoMorte > 2.6) {
        this.player.reaparecer();
        this.estatisticas.mortes++;
        this.tempoMorte = 0;
        this.ganchos.mensagem('A cápsula voltou a montar-te. Bearer 73, tentativa seguinte.', 'aviso');
        this.renderer.camera.seguir(this.player.x, this.player.y, 0, true);
      }
    } else {
      this.player.atualizar(dt, this.world, this.input.moveX, this.input.moveY);
      if (this.player.morto) {
        audio.morte();
        this.ganchos.aoMorrer();
        this.tempoMorte = 0;
      }
      this.acoes(dt);
    }

    this.atualizarInimigos(dt);
    this.atualizarProjeteis(dt);
    this.atualizarQuedas(dt);
    this.atualizarEfeitos(dt);
    this.gerarBichos(dt);
    this.verificarChefes();
    this.verificarBioma();

    this.renderer.camera.seguir(this.player.x, this.player.y, dt);
    this.renderer.camera.atualizarAbanao(dt);
    this.calcularLuz();
    this.world.limpar(this.player.x, this.player.y);

    const prof = Math.round(Math.hypot(this.player.x, this.player.y));
    if (prof > this.estatisticas.profundidade) this.estatisticas.profundidade = prof;

    this.tempoGravacao += dt;
    if (this.tempoGravacao > INTERVALO_GRAVACAO) {
      this.tempoGravacao = 0;
      this.guardar();
    }

    const pedido = this.input.hotbarRequest;
    if (pedido !== null) {
      this.inventario.selecionado = pedido;
      this.input.hotbarRequest = null;
    }
    this.input.endFrame();
  }

  /** Defesa, velocidade e regeneração vindas do equipamento. */
  private aplicarEquipamento(): void {
    this.player.defesa = this.inventario.defesaTotal();
    const conj = this.inventario.conjuntoCompleto();
    const b = conj ? bonusConjunto(conj) : { velocidade: 0, poder: 0, regen: 0, evasao: 0 };
    this.player.bonusVelocidade = b.velocidade + this.player.buffVelocidade;
    this.player.bonusPoder = b.poder;
    this.player.bonusRegen = b.regen;
    this.player.evasao = b.evasao;
  }

  private calcularLuz(): void {
    perf.comecarLuz();
    // Margem generosa: uma tocha fora do ecrã continua a iluminar a beira dele.
    // Com margem curta, as luzes "nasciam" à medida que entravam na vista.
    const area = this.renderer.camera.areaVisivel(7);
    const extras: FonteLuz[] = [];
    if (!this.player.morto) {
      extras.push({ x: this.player.x, y: this.player.y, intensidade: 0.85, cor: [1, 0.88, 0.74] });
    }
    for (const p of this.projeteis) extras.push({ x: p.x, y: p.y, intensidade: 0.45, cor: [1, 0.75, 0.5] });
    for (const e of this.inimigos) {
      if (e.def.luz) extras.push({ x: e.x, y: e.y, intensidade: e.def.luz, cor: [0.75, 0.85, 1] });
    }
    this.lighting.ambiente = BIOMAS[this.biomaAtual]?.ambiente ?? 0.1;
    this.lighting.calcular(this.world, area.x0, area.y0, area.x1 - area.x0 + 1, area.y1 - area.y0 + 1, extras);
    perf.fimLuz();
  }

  desenhar(dtMs: number): void {
    const equip = this.inventario.equipamento;
    const mao = this.inventario.itemSelecionado();
    this.renderer.desenhar(
      {
        world: this.world,
        player: this.player,
        inimigos: this.inimigos,
        quedas: this.quedas,
        particulas: this.particulas,
        projeteis: this.projeteis,
        textos: this.textos,
        lighting: this.lighting,
        alvo: this.alvo,
        alvoValido: this.alvoValido,
        progressoAlvo: this.progressoAlvo,
        corArmadura: equip.peito ? itemDef(equip.peito)?.paleta.base ?? null : null,
        corElmo: equip.cabeca ? itemDef(equip.cabeca)?.paleta.base ?? null : null,
        iconeMao: mao ? sprite(mao.sprite, 0, mao.paleta) : null,
        bioma: BIOMAS[this.biomaAtual] ?? BIOMAS[0],
        tempo: this.tempo,
        dor: this.dor,
      },
      dtMs,
    );
  }

  // --- Acções ----------------------------------------------------------------

  private acoes(dt: number): void {
    const [tx, ty] = this.player.tileAlvo();
    const def = this.world.blocoDef(tx, ty);
    const item = this.inventario.itemSelecionado();
    const ferramenta = (item ?? PUNHOS).ferramenta ?? PUNHOS.ferramenta!;
    const podeConstruir = !!item && (item.coloca !== undefined || item.colocaChao !== undefined);

    if (def.id === Block.Nenhum) {
      this.alvo = podeConstruir ? [tx, ty] : null;
      this.alvoValido = podeConstruir;
      this.progressoAlvo = 0;
    } else {
      this.alvo = def.minavel && !def.invulneravel ? [tx, ty] : null;
      this.alvoValido = def.minavel && !def.invulneravel && def.nivel <= ferramenta.nivel;
      this.progressoAlvo = this.world.progressoMina(tx, ty);
    }

    if (this.input.consume('interact')) this.interagir();
    if (this.input.isHeld('attack') || this.input.consume('attack')) this.atacarOuMinar(tx, ty);
    if ((this.input.isHeld('place') || this.input.consume('place')) && item) this.colocar(tx, ty);
    void dt;
  }

  private atacarOuMinar(tx: number, ty: number): void {
    if (this.player.arrefecimento > 0) return;
    const item = this.inventario.itemSelecionado() ?? PUNHOS;
    const arma = item.arma ?? PUNHOS.arma!;

    // Armas de projéctil disparam sempre, mesmo sem alvo à frente.
    if (arma.projectil) {
      this.dispararProjectil(arma.projectil.velocidade, arma.dano, arma.projectil.cor, arma.projectil.perfura ?? 0, arma.projectil.salta ?? 0);
      this.player.golpe = 0.2;
      this.player.arrefecimento = arma.cadencia;
      audio.golpe();
      return;
    }

    const alvos = this.inimigosNoArco(arma.alcance, arma.arco);
    this.player.golpe = 0.25;
    this.player.arrefecimento = arma.cadencia;

    if (alvos.length > 0) {
      audio.golpe();
      this.renderer.camera.abanar(2);
      for (const e of alvos) this.golpear(e, arma, item.id);
      return;
    }

    const def = this.world.blocoDef(tx, ty);
    if (!def.minavel || def.invulneravel) return;
    const ferramenta = item.ferramenta ?? PUNHOS.ferramenta!;
    if (def.nivel > ferramenta.nivel) {
      this.texto(tx + 0.5, ty + 0.2, 'ferramenta fraca', '#ff9a8a');
      audio.dano();
      this.player.arrefecimento = 0.5;
      return;
    }
    const poder = ferramenta.poder + this.player.bonusPoder;
    const resultado = this.world.minar(tx, ty, 11 * poder);
    audio.picareta();
    this.explodir(tx + 0.5, ty + 0.5, def.paleta.claro, 4, 1.6);
    if (resultado.partido) {
      audio.partiu();
      this.estatisticas.blocos++;
      this.renderer.camera.abanar(1.6);
      this.explodir(tx + 0.5, ty + 0.5, def.paleta.base, 14, 2.8);
      this.explodir(tx + 0.5, ty + 0.5, def.paleta.escuro, 8, 2);
      for (const d of def.drops) {
        if (d.chance !== undefined && Math.random() > d.chance) continue;
        const n = d.min + Math.floor(Math.random() * (d.max - d.min + 1));
        if (n > 0) this.largar(tx + 0.5, ty + 0.5, d.item, n);
      }
      if (def.lore && !this.loreVista.has(def.sprite)) {
        this.loreVista.add(def.sprite);
        this.ganchos.mensagem(`${def.nome} — ${def.lore}`, 'lore');
      }
    }
  }

  private golpear(e: Inimigo, arma: NonNullable<ReturnType<typeof itemDef>>['arma'], _idArma: string): void {
    if (!arma) return;
    const dx = e.x - this.player.x;
    const dy = e.y - this.player.y;
    const m = Math.hypot(dx, dy) || 1;
    const critico = Math.random() < (arma.critico ?? 0);
    const dano = Math.round(arma.dano * (critico ? 2 : 1));
    const efetivo = e.ferir(dano, (dx / m) * arma.empurrao, (dy / m) * arma.empurrao, arma.perfuraArmadura ?? 0);
    this.texto(e.x, e.y - 0.7, critico ? `${efetivo}!` : String(efetivo), critico ? '#ffd166' : '#ffe27a', critico);
    this.explodir(e.x, e.y, e.def.paleta.claro, critico ? 12 : 6, critico ? 3.4 : 2.2);
    if (arma.roubo) this.player.curar(efetivo * arma.roubo);
    if (arma.area) {
      for (const outro of this.inimigos) {
        if (outro === e) continue;
        if (Math.hypot(outro.x - e.x, outro.y - e.y) > arma.area) continue;
        outro.ferir(Math.round(dano * 0.55), 0, 0, arma.perfuraArmadura ?? 0);
        this.explodir(outro.x, outro.y, '#ffb05c', 6, 2);
        if (outro.morto) this.matar(outro);
      }
      this.renderer.camera.abanar(4);
    }
    if (e.morto) this.matar(e);
  }

  private dispararProjectil(velocidade: number, dano: number, cor: string, perfura: number, salta: number): void {
    const dx = this.player.dirX;
    const dy = this.player.dirY;
    this.projeteis.push({
      x: this.player.x + dx * 0.5,
      y: this.player.y + dy * 0.5,
      vx: dx * velocidade,
      vy: dy * velocidade,
      dano,
      cor,
      vida: 2.2,
      raio: 0.16,
      doJogador: true,
      perfura,
      salta,
      atingidos: new Set(),
    });
  }

  private inimigosNoArco(alcance: number, arco: number): Inimigo[] {
    const base = Math.atan2(this.player.dirY, this.player.dirX);
    const saida: Inimigo[] = [];
    for (const e of this.inimigos) {
      if (e.escondido) continue;
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      const d = Math.hypot(dx, dy);
      if (d > alcance + e.raio) continue;
      let diff = Math.atan2(dy, dx) - base;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) <= arco / 2 || d < e.raio + 0.35) saida.push(e);
    }
    return saida;
  }

  private colocar(tx: number, ty: number): void {
    const slot = this.inventario.slotSelecionado();
    const item = this.inventario.itemSelecionado();
    if (!slot || !item || this.player.arrefecimento > 0) return;

    if (item.coloca !== undefined) {
      if (this.world.bloco(tx, ty) !== Block.Nenhum) return;
      const solido = blockDef(item.coloca).solido;
      if (solido && this.ocupado(tx, ty)) {
        this.ganchos.mensagem('Está alguém nesse sítio.', 'aviso');
        this.player.arrefecimento = 0.3;
        return;
      }
      this.world.definirBloco(tx, ty, item.coloca);
      this.inventario.gastar(this.inventario.selecionado);
      audio.colocar();
      this.explodir(tx + 0.5, ty + 0.5, item.paleta.claro, 5, 1.4);
      this.player.arrefecimento = 0.16;
      return;
    }

    if (item.colocaChao !== undefined) {
      if (this.world.chao(tx, ty) === item.colocaChao) return;
      this.world.definirChao(tx, ty, item.colocaChao);
      this.inventario.gastar(this.inventario.selecionado);
      audio.colocar();
      this.player.arrefecimento = 0.16;
    }
  }

  private ocupado(tx: number, ty: number): boolean {
    const dentro = (x: number, y: number, r: number) => x + r > tx && x - r < tx + 1 && y + r > ty && y - r < ty + 1;
    if (dentro(this.player.x, this.player.y, this.player.raio)) return true;
    return this.inimigos.some((e) => dentro(e.x, e.y, e.raio));
  }

  private interagir(): void {
    const estacao = this.estacaoPerto();
    if (estacao) {
      if (estacao.kind === 'capsula') {
        this.player.respawnX = estacao.x + 0.5;
        this.player.respawnY = estacao.y + 0.5;
        this.ganchos.mensagem('Cápsula sincronizada. É aqui que voltas a acordar.', 'bom');
        audio.criar();
        return;
      }
      if (estacao.kind === 'rele') {
        this.ganchos.mensagem(this.scanner(), 'lore');
        audio.apanhar();
        return;
      }
      this.estacaoAberta = estacao.kind;
      this.ganchos.abrirEstacao(estacao.kind);
      return;
    }

    const item = this.inventario.itemSelecionado();
    if (item?.comida) {
      this.comer(this.inventario.selecionado);
      return;
    }
    this.ganchos.mensagem('Não há nada aqui para usar.', 'info');
  }

  estacaoPerto(): { kind: StationKind; x: number; y: number } | null {
    const px = Math.floor(this.player.x);
    const py = Math.floor(this.player.y);
    let melhor: { kind: StationKind; x: number; y: number; d: number } | null = null;
    for (let y = py - 2; y <= py + 2; y++) {
      for (let x = px - 2; x <= px + 2; x++) {
        const def = this.world.blocoDef(x, y);
        if (!def.estacao) continue;
        const d = Math.hypot(x + 0.5 - this.player.x, y + 0.5 - this.player.y);
        if (d > 2.3) continue;
        if (!melhor || d < melhor.d) melhor = { kind: def.estacao, x, y, d };
      }
    }
    return melhor ? { kind: melhor.kind, x: melhor.x, y: melhor.y } : null;
  }

  comer(indice: number): boolean {
    const slot = this.inventario.slots[indice];
    const def = slot ? itemDef(slot.item) : undefined;
    if (!def?.comida) return false;
    if (this.player.fome >= this.player.fomeMax && this.player.vida >= this.player.vidaMax && !def.comida.buff) {
      this.ganchos.mensagem('Não te cabe mais nada.', 'aviso');
      return false;
    }
    this.player.fome = Math.min(this.player.fomeMax, this.player.fome + def.comida.fome);
    this.player.curar(def.comida.cura);
    this.player.regen = Math.max(this.player.regen, def.comida.regen);
    if (def.comida.buff) this.player.aplicarBuff(def.comida.buff);
    this.inventario.gastar(indice);
    audio.apanhar();
    this.texto(this.player.x, this.player.y - 0.9, def.nome, '#9fe6a0');
    return true;
  }

  /** O Relé aponta para o guardião vivo mais próximo. */
  scanner(): string {
    const salas = salasEspeciais(this.world.seed).filter((s) => !this.chefesDerrotados.has(s.chefe));
    if (salas.length === 0) {
      return 'O Relé está em silêncio. Todos os fragmentos regressaram — e Veyra está inteira outra vez.';
    }
    let melhor = salas[0];
    let melhorD = Infinity;
    for (const s of salas) {
      const d = Math.hypot(s.x - this.player.x, s.y - this.player.y);
      if (d < melhorD) {
        melhorD = d;
        melhor = s;
      }
    }
    const ang = Math.atan2(melhor.y - this.player.y, melhor.x - this.player.x);
    const nome = INIMIGOS[melhor.chefe]?.nome ?? melhor.chefe;
    return `Portador identificado. ${nome}: ${Math.round(melhorD)} unidades a ${bussola(ang)}.`;
  }

  // --- Fauna -----------------------------------------------------------------

  private contextoIA(dt: number): ContextoIA {
    return {
      dt,
      tempo: this.tempo,
      world: this.world,
      alvoX: this.player.x,
      alvoY: this.player.y,
      alvoVivo: !this.player.morto,
      alvoDirX: this.player.dirX,
      alvoDirY: this.player.dirY,
      atacar: (dano, kx, ky) => this.ferirJogador(dano, kx, ky),
      projetil: (x, y, vx, vy, dano, cor) => {
        this.projeteis.push({ x, y, vx, vy, dano, cor, vida: 3.5, raio: 0.17, doJogador: false, perfura: 0, salta: 0 });
      },
      invocar: (id, x, y) => {
        if (this.inimigos.length < LIMITE_BICHOS + 14) this.criarInimigo(id, x, y);
      },
      particulas: (x, y, cor, n, forca) => this.explodir(x, y, cor, n, forca ?? 2),
      abanar: (f) => this.renderer.camera.abanar(f),
      apagarBloco: (x, y) => {
        const def = this.world.blocoDef(x, y);
        if (def.minavel && !def.invulneravel) {
          this.world.definirBloco(x, y, Block.Nenhum);
          this.explodir(x + 0.5, y + 0.5, '#8f8fbf', 8, 2);
        }
      },
    };
  }

  private ferirJogador(dano: number, kx: number, ky: number): void {
    if (Math.random() < this.player.evasao) {
      this.texto(this.player.x, this.player.y - 0.9, 'fase', '#d5a8ff');
      return;
    }
    const efetivo = this.player.ferir(dano, kx, ky);
    if (efetivo > 0) {
      audio.dano();
      this.dor = Math.min(1, this.dor + efetivo / 45);
      this.texto(this.player.x, this.player.y - 0.9, `-${Math.round(efetivo)}`, '#ff8a8a');
      this.renderer.camera.abanar(3 + efetivo * 0.08);
    }
  }

  private atualizarInimigos(dt: number): void {
    const ctx = this.contextoIA(dt);
    for (let i = this.inimigos.length - 1; i >= 0; i--) {
      const e = this.inimigos[i];
      e.atualizar(ctx);
      if (e.morto) {
        this.matar(e);
        continue;
      }
      if (!e.def.chefe && Math.hypot(e.x - this.player.x, e.y - this.player.y) > 52) this.inimigos.splice(i, 1);
    }
  }

  private matar(e: Inimigo): void {
    const i = this.inimigos.indexOf(e);
    if (i >= 0) this.inimigos.splice(i, 1);
    this.estatisticas.bichos++;
    this.explodir(e.x, e.y, e.def.paleta.base, 18, 3.2);
    this.explodir(e.x, e.y, e.def.paleta.acento, 10, 4);
    audio.partiu();

    if (e.def.explode) {
      this.renderer.camera.abanar(6);
      this.explodir(e.x, e.y, '#d9c2ff', 26, 5);
      if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < 2.6) {
        this.ferirJogador(e.def.explode, 0, 0);
      }
      for (const outro of this.inimigos) {
        if (Math.hypot(outro.x - e.x, outro.y - e.y) < 2.6) outro.ferir(e.def.explode, 0, 0);
      }
    }
    if (e.def.id === 'dustling' && e.vidaMax > 10) {
      for (let k = 0; k < 2; k++) {
        const filho = this.criarInimigo('dustling', e.x + (Math.random() - 0.5) * 1.5, e.y + (Math.random() - 0.5) * 1.5);
        if (filho) {
          filho.vidaMax = Math.round(e.vidaMax * 0.4);
          filho.vida = filho.vidaMax;
          filho.raio = e.raio * 0.7;
          filho.acordado = true;
        }
      }
    }

    for (const q of sortearQuedas(e.def, e.elite)) this.largar(e.x, e.y, q.item, q.quantidade);

    if (e.def.chefe) {
      this.chefesDerrotados.add(e.def.id);
      this.chefeAtivo = null;
      this.estatisticas.fragmentos++;
      this.renderer.camera.abanar(14);
      this.player.vidaMax += 25;
      this.player.vida = this.player.vidaMax;
      this.ganchos.mensagem(
        `${e.def.nome} caiu. O fragmento regressa — e Veyra fica um pouco mais desperta.`,
        'lore',
      );
      this.guardar();
    }
  }

  criarInimigo(id: string, x: number, y: number, elite: Elite | null = null): Inimigo | null {
    const def = INIMIGOS[id];
    if (!def) return null;
    const e = new Inimigo(def, x, y, elite);
    desencravar(this.world, e);
    this.inimigos.push(e);
    return e;
  }

  private gerarBichos(dt: number): void {
    this.tempoSpawn -= dt;
    if (this.tempoSpawn > 0) return;
    this.tempoSpawn = 1.2;
    if (this.inimigos.filter((e) => !e.def.chefe).length >= LIMITE_BICHOS) return;

    for (let tentativa = 0; tentativa < 12; tentativa++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 12 + Math.random() * 8;
      const tx = Math.floor(this.player.x + Math.cos(ang) * dist);
      const ty = Math.floor(this.player.y + Math.sin(ang) * dist);
      if (this.world.solido(tx, ty)) continue;
      if (this.world.chaoDef(tx, ty).dano) continue;
      const bioma = biomaEm(tx, ty, this.world.seed);
      const lista = FAUNA[bioma] ?? FAUNA[0];
      const id = lista[Math.floor(Math.random() * lista.length)];
      const elite = sortearElite(Math.hypot(tx, ty));
      this.criarInimigo(id, tx + 0.5, ty + 0.5, elite);
      return;
    }
  }

  private verificarChefes(): void {
    if (this.chefeAtivo && !this.inimigos.includes(this.chefeAtivo)) this.chefeAtivo = null;
    for (const sala of salasEspeciais(this.world.seed)) {
      if (this.chefesDerrotados.has(sala.chefe)) continue;
      if (Math.hypot(sala.x - this.player.x, sala.y - this.player.y) > sala.raio) continue;
      if (this.inimigos.some((e) => e.def.id === sala.chefe)) continue;
      const chefe = this.criarInimigo(sala.chefe, sala.x + 0.5, sala.y + 0.5);
      if (chefe) {
        chefe.acordado = true;
        this.chefeAtivo = chefe;
        audio.chefe();
        this.renderer.camera.abanar(10);
        this.ganchos.mensagem(`${chefe.def.nome} acordou.`, 'aviso');
        if (chefe.def.lore) this.ganchos.mensagem(chefe.def.lore, 'lore');
      }
    }
  }

  private verificarBioma(): void {
    const b = biomaEm(Math.floor(this.player.x), Math.floor(this.player.y), this.world.seed);
    if (b === this.biomaAtual) return;
    this.biomaAtual = b;
    this.ganchos.aoMudarBioma(BIOMAS[b]);
  }

  // --- Itens, projécteis e efeitos --------------------------------------------

  largar(x: number, y: number, item: string, quantidade: number): void {
    const ang = Math.random() * Math.PI * 2;
    this.quedas.push({
      x, y, item, quantidade, t: 0,
      vx: Math.cos(ang) * 1.8,
      vy: Math.sin(ang) * 1.8,
      atraso: 0.25,
    });
  }

  private atualizarQuedas(dt: number): void {
    for (let i = this.quedas.length - 1; i >= 0; i--) {
      const q = this.quedas[i];
      q.t += dt;
      q.atraso -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 1 - Math.min(1, dt * 6);
      q.vy *= 1 - Math.min(1, dt * 6);
      if (q.atraso > 0 || this.player.morto) continue;

      const dx = this.player.x - q.x;
      const dy = this.player.y - q.y;
      const d = Math.hypot(dx, dy);
      if (d < 2) {
        const puxao = Math.min(11, 3.5 + (2 - d) * 10);
        q.x += (dx / (d || 1)) * puxao * dt;
        q.y += (dy / (d || 1)) * puxao * dt;
      }
      if (d < 0.5) {
        if (!this.inventario.temEspaco(q.item, q.quantidade)) continue;
        this.inventario.adicionar(q.item, q.quantidade);
        this.quedas.splice(i, 1);
        audio.apanhar();
        this.texto(this.player.x, this.player.y - 1.2, `+${q.quantidade} ${itemNome(q.item)}`, '#d8f0ff');
      }
    }
  }

  private atualizarProjeteis(dt: number): void {
    for (let i = this.projeteis.length - 1; i >= 0; i--) {
      const p = this.projeteis[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vida -= dt;
      let morreu = p.vida <= 0;

      if (this.world.solido(Math.floor(p.x), Math.floor(p.y))) {
        if (p.perfura > 0) p.perfura--;
        else morreu = true;
      }

      if (p.doJogador) {
        for (const e of this.inimigos) {
          if (e.escondido || p.atingidos?.has(e)) continue;
          if (Math.hypot(p.x - e.x, p.y - e.y) > e.raio + p.raio) continue;
          const efetivo = e.ferir(p.dano, p.vx * 0.05, p.vy * 0.05);
          this.texto(e.x, e.y - 0.7, String(efetivo), '#ffe27a');
          this.explodir(p.x, p.y, p.cor, 8, 2.4);
          p.atingidos?.add(e);
          if (e.morto) this.matar(e);
          if (p.salta > 0) {
            const proximo = this.inimigos.find(
              (o) => o !== e && !p.atingidos?.has(o) && Math.hypot(o.x - p.x, o.y - p.y) < 5,
            );
            if (proximo) {
              const dx = proximo.x - p.x;
              const dy = proximo.y - p.y;
              const m = Math.hypot(dx, dy) || 1;
              const v = Math.hypot(p.vx, p.vy);
              p.vx = (dx / m) * v;
              p.vy = (dy / m) * v;
              p.salta--;
              break;
            }
          }
          if (p.perfura > 0) p.perfura--;
          else morreu = true;
          break;
        }
      } else if (!this.player.morto && Math.hypot(p.x - this.player.x, p.y - this.player.y) < this.player.raio + p.raio) {
        this.ferirJogador(p.dano, p.vx * 0.02, p.vy * 0.02);
        morreu = true;
      }

      if (morreu) {
        this.explodir(p.x, p.y, p.cor, 7, 2.2);
        this.projeteis.splice(i, 1);
      }
    }
  }

  explodir(x: number, y: number, cor: string, quantidade: number, forca = 2): void {
    for (let i = 0; i < quantidade; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = forca * (0.3 + Math.random() * 0.8);
      this.particulas.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        vida: 0.32 + Math.random() * 0.42,
        vidaMax: 0.74,
        cor,
        tam: 0.07 + Math.random() * 0.1,
      });
    }
    if (this.particulas.length > 460) this.particulas.splice(0, this.particulas.length - 460);
  }

  texto(x: number, y: number, texto: string, cor: string, grande = false): void {
    this.textos.push({ x, y, texto, vida: 0.95, cor, grande });
    if (this.textos.length > 46) this.textos.shift();
  }

  private atualizarEfeitos(dt: number): void {
    for (let i = this.particulas.length - 1; i >= 0; i--) {
      const p = this.particulas[i];
      p.vida -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - Math.min(1, dt * 3);
      p.vy *= 1 - Math.min(1, dt * 3);
      if (p.vida <= 0) this.particulas.splice(i, 1);
    }
    for (let i = this.textos.length - 1; i >= 0; i--) {
      const t = this.textos[i];
      t.vida -= dt;
      t.y -= dt * 1.2;
      if (t.vida <= 0) this.textos.splice(i, 1);
    }
  }

  // --- Informação ------------------------------------------------------------

  infoBioma(): InfoBioma {
    return BIOMAS[this.biomaAtual] ?? BIOMAS[0];
  }

  nomeBioma(): string {
    return this.infoBioma().nome;
  }

  distanciaAoRele(): number {
    return Math.round(Math.hypot(this.player.x, this.player.y));
  }

  fragmentosReunidos(): number {
    return this.chefesDerrotados.size;
  }

  totalGuardioes(): number {
    return salasEspeciais(this.world.seed).length;
  }
}

function bussola(ang: number): string {
  const dirs = ['este', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste', 'norte', 'nordeste'];
  const i = Math.round(((ang + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8;
  return dirs[i];
}

export { Bioma };
