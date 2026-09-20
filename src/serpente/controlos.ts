/** Teclado no PC, swipe no telemóvel. Um só sítio a traduzir gestos em direcções. */

import type { Direcao } from './logica';

/** Píxeis de arrasto para o swipe contar. Baixo de propósito: tem de ser tolerante. */
const LIMIAR = 16;

const TECLAS: Record<string, Direcao> = {
  ArrowUp: 'cima',
  ArrowDown: 'baixo',
  ArrowLeft: 'esquerda',
  ArrowRight: 'direita',
  KeyW: 'cima',
  KeyS: 'baixo',
  KeyA: 'esquerda',
  KeyD: 'direita',
};

export interface Ouvintes {
  virar(d: Direcao): void;
  /** Enter, espaço, ou toque no ecrã de fim. */
  confirmar(): void;
  /** Qualquer interacção — serve para acordar o áudio. */
  interacao(): void;
}

export function ligarControlos(alvo: HTMLElement, ouvintes: Ouvintes): () => void {
  let origem: { x: number; y: number } | null = null;
  let arrastou = false;

  const aoTeclado = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    const d = TECLAS[e.code];
    if (d) {
      e.preventDefault();
      ouvintes.interacao();
      ouvintes.virar(d);
      return;
    }
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') {
      e.preventDefault();
      ouvintes.interacao();
      ouvintes.confirmar();
    }
  };

  const emitir = (dx: number, dy: number): boolean => {
    if (Math.abs(dx) < LIMIAR && Math.abs(dy) < LIMIAR) return false;
    ouvintes.virar(
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'direita' : 'esquerda') : dy > 0 ? 'baixo' : 'cima',
    );
    return true;
  };

  const aoTocar = (e: TouchEvent): void => {
    const t = e.changedTouches[0];
    if (!t) return;
    origem = { x: t.clientX, y: t.clientY };
    arrastou = false;
    ouvintes.interacao();
  };

  const aoArrastar = (e: TouchEvent): void => {
    // Só travamos o ecrã dentro da arena; o resto da página continua normal.
    e.preventDefault();
    const t = e.changedTouches[0];
    if (!t || !origem) return;
    const dx = t.clientX - origem.x;
    const dy = t.clientY - origem.y;
    // Reancorar depois de cada swipe permite encadear curvas sem levantar o dedo.
    if (emitir(dx, dy)) {
      origem = { x: t.clientX, y: t.clientY };
      arrastou = true;
    }
  };

  const aoLargar = (): void => {
    if (!arrastou) ouvintes.confirmar();
    origem = null;
    arrastou = false;
  };

  window.addEventListener('keydown', aoTeclado);
  alvo.addEventListener('touchstart', aoTocar, { passive: true });
  alvo.addEventListener('touchmove', aoArrastar, { passive: false });
  alvo.addEventListener('touchend', aoLargar, { passive: true });
  alvo.addEventListener('touchcancel', aoLargar, { passive: true });

  return () => {
    window.removeEventListener('keydown', aoTeclado);
    alvo.removeEventListener('touchstart', aoTocar);
    alvo.removeEventListener('touchmove', aoArrastar);
    alvo.removeEventListener('touchend', aoLargar);
    alvo.removeEventListener('touchcancel', aoLargar);
  };
}
