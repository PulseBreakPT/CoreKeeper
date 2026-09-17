/**
 * Desenho de criaturas e do Portador no mundo.
 *
 * As silhuetas em si são pixel art memorizada (ver `bestiario.ts` e
 * `portador.ts`); aqui só se trata do que muda a cada quadro: sombra no chão,
 * brilho próprio, flash ao levar dano, aura de elite e barra de vida.
 */

import type { Inimigo } from '../entities/enemies';
import type { Player } from '../entities/player';
import { spriteCriatura, tamanhoSprite } from './bestiario';
import { spritePortador, type Vista } from './portador';

type C = CanvasRenderingContext2D;

function sombra(c: C, raio: number, achatamento = 0.36): void {
  c.fillStyle = 'rgba(0,0,0,0.42)';
  c.beginPath();
  c.ellipse(0, raio * 0.88, raio * 0.95, raio * achatamento, 0, 0, Math.PI * 2);
  c.fill();
}






// --- O Portador --------------------------------------------------------------

/**
 * O Portador. Três vistas — de frente, de costas e de perfil — escolhidas pela
 * direcção para onde olha, com balanço de passo, capa a arrastar e a marca do
 * peito a pulsar.
 */
export function desenharJogador(c: C, p: Player, un: number, corArmadura: string | null, corElmo: string | null): void {
  const u = un * 1.5;
  const perfil = Math.abs(p.dirX) > Math.abs(p.dirY);
  const vista: Vista = perfil ? 'perfil' : p.dirY < 0 ? 'costas' : 'frente';
  const lado = p.dirX < 0 ? -1 : 1;

  // Quadro de passo: a andar percorre o ciclo, parado fica na pose neutra com
  // uma respiração lenta.
  const quadro = p.andar > 0 ? Math.floor(p.andar * 1.4) & 3 : Math.floor(performance.now() / 700) % 2 === 0 ? 0 : 2;

  sombra(c, u * 0.24);

  if (p.invulneravel > 0 && Math.floor(p.invulneravel * 16) % 2 === 0) c.globalAlpha = 0.5;

  const img = spritePortador(vista, quadro, corArmadura, corElmo, 64);
  c.save();
  if (perfil) c.scale(lado, 1);
  c.imageSmoothingEnabled = false;
  c.drawImage(img, -u / 2, -u * 0.62, u, u);
  c.restore();
  c.globalAlpha = 1;
}

export function desenharGolpe(c: C, p: Player, u: number, progresso: number, icone: HTMLCanvasElement | null): void {
  const base = Math.atan2(p.dirY, p.dirX);
  const ang = base - 1 + progresso * 2;
  c.save();
  c.rotate(ang);
  // Rasto do golpe.
  const g = c.createLinearGradient(0, 0, u * 0.9, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.6, 'rgba(255,245,210,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, u * 0.85, -0.42, 0.42);
  c.lineTo(0, 0);
  c.closePath();
  c.fill();
  if (icone) {
    c.save();
    c.translate(u * 0.52, 0);
    c.rotate(Math.PI * 0.72);
    c.imageSmoothingEnabled = false;
    c.drawImage(icone, -u * 0.3, -u * 0.3, u * 0.6, u * 0.6);
    c.restore();
  }
  c.restore();
}

// --- Bestiário ---------------------------------------------------------------

/** Formas desenhadas de lado, que devem espelhar-se conforme a direcção. */
const DE_PERFIL = new Set(['cao', 'peixe', 'enguia']);

/**
 * Desenha uma criatura: sombra, brilho próprio, o sprite de pixel art e por
 * cima os avisos (flash ao levar dano, aura de elite, barra de vida).
 */
export function desenharInimigo(c: C, e: Inimigo, u: number): void {
  const d = e.def;
  const p = d.paleta;
  const r = e.raio * u;

  if (e.opacidade < 0.99) c.globalAlpha = Math.max(0.1, e.opacidade);
  if (e.opacidade > 0.2) sombra(c, r);

  if (d.luz) brilhoRedondo(c, r * 3, `${p.acento}77`, d.luz * 0.7);
  if (e.elite) brilhoRedondo(c, r * 2.4, `${e.elite.cor}66`, 0.55);

  const tam = tamanhoSprite(d.raio);
  const quadro = Math.floor(e.anim * 5) & 3;
  const img = spriteCriatura(d.forma, d.detalhe ?? '', p, quadro, tam);

  // O sprite ocupa um pouco mais do que o raio de colisão: a silhueta inclui
  // patas e antenas, que não contam para bater em paredes.
  const largura = r * 2.5 * e.escalaX;
  const altura = r * 2.5 * e.escalaY;

  c.save();
  if (DE_PERFIL.has(d.forma)) c.scale(e.virado, 1);
  c.imageSmoothingEnabled = false;
  c.drawImage(img, -largura / 2, -altura / 2 - r * 0.12, largura, altura);

  // Flash ao levar dano: o mesmo sprite somado por cima, a clarear.
  if (e.piscar > 0) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = Math.min(0.9, e.piscar * 4);
    c.drawImage(img, -largura / 2, -altura / 2 - r * 0.12, largura, altura);
    c.restore();
  }
  c.restore();

  // Barra de vida por cima dos bichos magoados (os chefes têm barra no HUD).
  if (!d.chefe && e.vida < e.vidaMax && e.opacidade > 0.5) {
    const w = r * 2;
    const y = -r - u * 0.3;
    c.fillStyle = 'rgba(0,0,0,0.75)';
    c.fillRect(-w / 2 - 1, y - 1, w + 2, u * 0.09 + 2);
    c.fillStyle = e.elite ? e.elite.cor : '#d8484c';
    c.fillRect(-w / 2, y, w * (e.vida / e.vidaMax), u * 0.09);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(-w / 2, y, w * (e.vida / e.vidaMax), u * 0.03);
  }
  c.globalAlpha = 1;
}

/** Halo aditivo à volta de uma criatura. */
function brilhoRedondo(c: C, raio: number, cor: string, forca: number): void {
  const g = c.createRadialGradient(0, 0, 0, 0, 0, raio);
  g.addColorStop(0, cor);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = forca;
  c.fillStyle = g;
  c.fillRect(-raio, -raio, raio * 2, raio * 2);
  c.restore();
}
