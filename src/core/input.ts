/** Entrada unificada: joystick táctil (metade esquerda do ecrã), botões e teclado. */

export type ActionName = 'attack' | 'place' | 'interact' | 'inventory' | 'map' | 'sprint';

const KEY_ACTIONS: Record<string, ActionName> = {
  Space: 'attack',
  KeyJ: 'attack',
  KeyF: 'place',
  KeyE: 'interact',
  KeyI: 'inventory',
  Tab: 'inventory',
  KeyM: 'map',
  ShiftLeft: 'sprint',
};

const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

interface Stick {
  pointerId: number;
  originX: number;
  originY: number;
  x: number;
  y: number;
}

export class Input {
  moveX = 0;
  moveY = 0;
  /** Direção escolhida pelo jogador desde o último passo (para o jogador manter a orientação). */
  private held = new Set<ActionName>();
  private pressed = new Set<ActionName>();
  private keys = new Set<string>();
  private stick: Stick | null = null;
  private readonly stickRadius = 52;
  private onStickMove: ((active: boolean, ox: number, oy: number, dx: number, dy: number) => void) | null = null;
  /** Pausa a entrada enquanto há painéis abertos por cima do jogo. */
  enabled = true;

  attachTouch(surface: HTMLElement): void {
    surface.addEventListener('pointerdown', (e) => this.onStickDown(e, surface), { passive: false });
    surface.addEventListener('pointermove', (e) => this.onStickDrag(e), { passive: false });
    surface.addEventListener('pointerup', (e) => this.onStickUp(e));
    surface.addEventListener('pointercancel', (e) => this.onStickUp(e));
  }

  attachKeyboard(target: Window): void {
    target.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const action = KEY_ACTIONS[e.code];
      if (action) {
        e.preventDefault();
        this.held.add(action);
        this.pressed.add(action);
      }
      if (MOVE_KEYS[e.code]) {
        e.preventDefault();
        this.keys.add(e.code);
      }
      if (/^Digit[1-8]$/.test(e.code)) {
        this.hotbarRequest = Number(e.code.slice(5)) - 1;
      }
    });
    target.addEventListener('keyup', (e) => {
      const action = KEY_ACTIONS[e.code];
      if (action) this.held.delete(action);
      this.keys.delete(e.code);
    });
    target.addEventListener('blur', () => {
      this.keys.clear();
      this.held.clear();
    });
  }

  /** Índice da hotbar pedido por teclado; lido e limpo pelo jogo. */
  hotbarRequest: number | null = null;

  setStickListener(fn: (active: boolean, ox: number, oy: number, dx: number, dy: number) => void): void {
    this.onStickMove = fn;
  }

  /** Liga um elemento do HUD a uma acção, com suporte a "manter premido". */
  bindButton(el: HTMLElement, action: ActionName): void {
    const down = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-down');
      this.held.add(action);
      this.pressed.add(action);
    };
    const up = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('is-down');
      this.held.delete(action);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onStickDown(e: PointerEvent, surface: HTMLElement): void {
    if (!this.enabled || this.stick) return;
    // Nunca roubar o toque a um controlo: o joystick só nasce em cima do mundo.
    const alvo = e.target;
    if (alvo instanceof Element && alvo.closest('button, input, a, .painel, .menu, .hotbar, [data-acao]')) return;
    const rect = surface.getBoundingClientRect();
    if (e.clientX - rect.left > rect.width * 0.55) return; // metade direita é dos botões
    e.preventDefault();
    surface.setPointerCapture(e.pointerId);
    this.stick = { pointerId: e.pointerId, originX: e.clientX, originY: e.clientY, x: 0, y: 0 };
    this.onStickMove?.(true, e.clientX, e.clientY, 0, 0);
  }

  private onStickDrag(e: PointerEvent): void {
    if (!this.stick || this.stick.pointerId !== e.pointerId) return;
    e.preventDefault();
    let dx = e.clientX - this.stick.originX;
    let dy = e.clientY - this.stick.originY;
    const dist = Math.hypot(dx, dy);
    if (dist > this.stickRadius) {
      dx = (dx / dist) * this.stickRadius;
      dy = (dy / dist) * this.stickRadius;
    }
    this.stick.x = dx / this.stickRadius;
    this.stick.y = dy / this.stickRadius;
    this.onStickMove?.(true, this.stick.originX, this.stick.originY, dx, dy);
  }

  private onStickUp(e: PointerEvent): void {
    if (!this.stick || this.stick.pointerId !== e.pointerId) return;
    this.stick = null;
    this.onStickMove?.(false, 0, 0, 0, 0);
  }

  /** Recalcula o vector de movimento normalizado a partir de teclado + joystick. */
  update(): void {
    let x = 0;
    let y = 0;
    if (this.enabled) {
      for (const code of this.keys) {
        const dir = MOVE_KEYS[code];
        if (dir) {
          x += dir[0];
          y += dir[1];
        }
      }
      if (this.stick) {
        const dead = 0.18;
        const mag = Math.hypot(this.stick.x, this.stick.y);
        if (mag > dead) {
          x += this.stick.x;
          y += this.stick.y;
        }
      }
    }
    const mag = Math.hypot(x, y);
    if (mag > 1) {
      x /= mag;
      y /= mag;
    }
    this.moveX = x;
    this.moveY = y;
  }

  isHeld(action: ActionName): boolean {
    return this.enabled && this.held.has(action);
  }

  /** Verdadeiro uma única vez por pressão. */
  consume(action: ActionName): boolean {
    if (!this.pressed.has(action)) return false;
    this.pressed.delete(action);
    return true;
  }

  endFrame(): void {
    this.pressed.clear();
  }

  releaseAll(): void {
    this.held.clear();
    this.pressed.clear();
    this.keys.clear();
    this.stick = null;
    this.onStickMove?.(false, 0, 0, 0, 0);
  }
}
