/** O jogador: movimento, orientação, vida, fome e estado de ataque. */

import { mover, type CorpoMovel } from './fisica';
import type { World } from '../world/world';

export const VELOCIDADE_BASE = 4.4;

export interface EstadoJogador {
  x: number;
  y: number;
  vida: number;
  vidaMax: number;
  fome: number;
  fomeMax: number;
  respawnX: number;
  respawnY: number;
}

export class Player implements CorpoMovel {
  x: number;
  y: number;
  raio = 0.32;
  vida = 100;
  vidaMax = 100;
  fome = 100;
  fomeMax = 100;
  /** Direcção para onde olha (normalizada). */
  dirX = 0;
  dirY = 1;
  /** Tempo restante da animação de golpe. */
  golpe = 0;
  arrefecimento = 0;
  invulneravel = 0;
  regen = 0;
  andar = 0;
  morto = false;
  respawnX = 3;
  respawnY = 3;
  defesa = 0;
  /** Bónus vindos do conjunto de armadura equipado. */
  bonusVelocidade = 0;
  bonusPoder = 0;
  bonusRegen = 0;
  evasao = 0;
  /** Buffs temporários de comida. */
  buffVelocidade = 0;
  buffDefesa = 0;
  buffDano = 0;
  folego = 0;
  private buffs: { tipo: string; valor: number; restante: number }[] = [];

  /** Buffs activos, para o HUD os mostrar. */
  buffsAtivos(): { tipo: string; restante: number }[] {
    return this.buffs.map((b) => ({ tipo: b.tipo, restante: b.restante }));
  }

  aplicarBuff(buff: { tipo: string; valor: number; duracao: number }): void {
    const existente = this.buffs.find((b) => b.tipo === buff.tipo);
    if (existente) {
      existente.valor = Math.max(existente.valor, buff.valor);
      existente.restante = Math.max(existente.restante, buff.duracao);
    } else {
      this.buffs.push({ tipo: buff.tipo, valor: buff.valor, restante: buff.duracao });
    }
  }

  private atualizarBuffs(dt: number): void {
    this.buffVelocidade = 0;
    this.buffDefesa = 0;
    this.buffDano = 0;
    this.folego = 0;
    for (let i = this.buffs.length - 1; i >= 0; i--) {
      const b = this.buffs[i];
      b.restante -= dt;
      if (b.restante <= 0) {
        this.buffs.splice(i, 1);
        continue;
      }
      if (b.tipo === 'velocidade') this.buffVelocidade += b.valor;
      else if (b.tipo === 'defesa') this.buffDefesa += b.valor;
      else if (b.tipo === 'dano') this.buffDano += b.valor;
      else if (b.tipo === 'folego') this.folego = Math.max(this.folego, b.valor);
    }
  }

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  atualizar(dt: number, world: World, moveX: number, moveY: number): void {
    if (this.morto) return;
    this.atualizarBuffs(dt);
    const chao = world.chaoDef(Math.floor(this.x), Math.floor(this.y));
    const vel = (VELOCIDADE_BASE + this.bonusVelocidade) * chao.velocidade * (this.fome <= 0 ? 0.6 : 1);

    if (moveX !== 0 || moveY !== 0) {
      mover(world, this, moveX * vel * dt, moveY * vel * dt);
      this.dirX = moveX;
      this.dirY = moveY;
      const m = Math.hypot(this.dirX, this.dirY) || 1;
      this.dirX /= m;
      this.dirY /= m;
      this.andar += dt * Math.hypot(moveX, moveY) * 7;
    } else {
      this.andar = 0;
    }

    this.golpe = Math.max(0, this.golpe - dt);
    this.arrefecimento = Math.max(0, this.arrefecimento - dt);
    this.invulneravel = Math.max(0, this.invulneravel - dt);

    // Fome desce devagar; com barriga cheia há regeneração lenta.
    this.fome = Math.max(0, this.fome - dt * 0.42);
    if (this.regen > 0) {
      this.regen -= dt;
      this.curar(dt * 6);
    } else if (this.fome > this.fomeMax * 0.7) {
      this.curar(dt * (0.8 + this.bonusRegen));
    }
    if (this.bonusRegen > 0) this.curar(dt * this.bonusRegen * 0.5);
    if (this.fome <= 0) this.ferir(dt * 1.6, 0, 0, true);

    if (chao.dano) this.ferir(chao.dano * dt, 0, 0, true);
  }

  curar(q: number): void {
    this.vida = Math.min(this.vidaMax, this.vida + q);
  }

  /** Aplica dano com defesa, i-frames e empurrão. Devolve o dano efectivo. */
  ferir(dano: number, empurraoX = 0, empurraoY = 0, ignoraIFrames = false): number {
    if (this.morto) return 0;
    if (!ignoraIFrames && this.invulneravel > 0) return 0;
    const efetivo = Math.max(ignoraIFrames ? dano : 1, dano - this.defesa - this.buffDefesa);
    this.vida -= efetivo;
    if (!ignoraIFrames) this.invulneravel = 0.55;
    this.x += empurraoX;
    this.y += empurraoY;
    if (this.vida <= 0) {
      this.vida = 0;
      this.morto = true;
    }
    return efetivo;
  }

  reaparecer(): void {
    this.x = this.respawnX;
    this.y = this.respawnY;
    this.vida = this.vidaMax * 0.6;
    this.fome = Math.max(this.fome, 40);
    this.morto = false;
    this.invulneravel = 2;
  }

  /** Tile para onde o jogador está virado — alvo da picareta e da colocação. */
  tileAlvo(): [number, number] {
    const tx = Math.floor(this.x + this.dirX * 0.85);
    const ty = Math.floor(this.y + this.dirY * 0.85);
    return [tx, ty];
  }

  estado(): EstadoJogador {
    return {
      x: this.x,
      y: this.y,
      vida: this.vida,
      vidaMax: this.vidaMax,
      fome: this.fome,
      fomeMax: this.fomeMax,
      respawnX: this.respawnX,
      respawnY: this.respawnY,
    };
  }

  static de(estado: EstadoJogador): Player {
    const p = new Player(estado.x, estado.y);
    p.vida = estado.vida;
    p.vidaMax = estado.vidaMax;
    p.fome = estado.fome;
    p.fomeMax = estado.fomeMax;
    p.respawnX = estado.respawnX ?? 3;
    p.respawnY = estado.respawnY ?? 3;
    return p;
  }
}
