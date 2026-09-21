/** Teclado no PC, swipe no telemóvel. Um só sítio a traduzir gestos em direcções. */

import type { Direcao } from './logica';

/** Distância mínima para distinguir um swipe de um toque. */
const LIMIAR = 11;

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
  virar(d: Direcao): boolean;
  /** Enter, espaço, ou toque no ecrã de fim. */
  confirmar(): void;
  /** Qualquer interacção — serve para acordar o áudio. */
  interacao(): void;
}

export function ligarControlos(alvo: HTMLElement, ouvintes: Ouvintes): () => void {
  let origem: { x: number; y: number } | null = null;
  let arrastou = false;
  let emitiu = false;
  let toqueId = -1;

  const aoTeclado = (e: KeyboardEvent): void => {
    if (e.repeat || (e.target instanceof Element && e.target.closest('button, a, input, textarea, select'))) return;
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
    if (Math.hypot(dx, dy) < LIMIAR) return false;
    const direcao: Direcao =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'direita' : 'esquerda') : dy > 0 ? 'baixo' : 'cima';
    ouvintes.virar(direcao);
    return true;
  };

  const aoTocar = (e: TouchEvent): void => {
    if (e.target instanceof Element && e.target.closest('button')) { origem = null; return; }
    const t = e.changedTouches[0];
    if (!t) return;
    origem = { x: t.clientX, y: t.clientY };
    arrastou = false;
    emitiu = false;
    toqueId = t.identifier;
    ouvintes.interacao();
  };

  const aoArrastar = (e: TouchEvent): void => {
    // Só travamos o ecrã dentro da arena; o resto da página continua normal.
    e.preventDefault();
    if (emitiu || !origem) return;
    const t = [...e.touches].find((toque) => toque.identifier === toqueId);
    if (!t) return;
    const dx = t.clientX - origem.x;
    const dy = t.clientY - origem.y;
    // Uma passagem do dedo produz uma ordem. Isso impede que uma ligeira curva
    // no fim do gesto meta uma segunda direcção na fila sem o jogador querer.
    if (emitir(dx, dy)) {
      arrastou = true;
      emitiu = true;
    }
  };

  const aoLargar = (e: TouchEvent): void => {
    // Alguns WebViews não entregam um touchmove num gesto muito rápido. A
    // distância final garante que o flick ainda conta antes do dedo sair.
    const t = [...e.changedTouches].find((toque) => toque.identifier === toqueId);
    if (!emitiu && origem && t) {
      arrastou = emitir(t.clientX - origem.x, t.clientY - origem.y);
    }
    if (origem && !arrastou) ouvintes.confirmar();
    origem = null;
    arrastou = false;
    emitiu = false;
    toqueId = -1;
  };

  const aoCancelar = (): void => {
    origem = null;
    arrastou = false;
    emitiu = false;
    toqueId = -1;
  };

  window.addEventListener('keydown', aoTeclado);
  alvo.addEventListener('touchstart', aoTocar, { passive: true });
  alvo.addEventListener('touchmove', aoArrastar, { passive: false });
  alvo.addEventListener('touchend', aoLargar, { passive: true });
  alvo.addEventListener('touchcancel', aoCancelar, { passive: true });

  return () => {
    window.removeEventListener('keydown', aoTeclado);
    alvo.removeEventListener('touchstart', aoTocar);
    alvo.removeEventListener('touchmove', aoArrastar);
    alvo.removeEventListener('touchend', aoLargar);
    alvo.removeEventListener('touchcancel', aoCancelar);
  };
}
