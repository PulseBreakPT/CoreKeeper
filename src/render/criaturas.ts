/**
 * Desenho das criaturas. Tudo vectorial, centrado em (0,0) e medido em píxeis,
 * com contorno escuro, dois tons de corpo e especular — para casar com os tiles.
 */

import type { Inimigo } from '../entities/enemies';
import type { Player } from '../entities/player';
import type { Paleta } from './paleta';

type C = CanvasRenderingContext2D;

function sombra(c: C, raio: number, achatamento = 0.36): void {
  c.fillStyle = 'rgba(0,0,0,0.42)';
  c.beginPath();
  c.ellipse(0, raio * 0.88, raio * 0.95, raio * achatamento, 0, 0, Math.PI * 2);
  c.fill();
}

function traco(c: C, cor: string, largura: number): void {
  c.strokeStyle = cor;
  c.lineWidth = largura;
  c.lineJoin = 'round';
  c.stroke();
}

function elipse(c: C, x: number, y: number, rx: number, ry: number, p: Paleta, tom: keyof Paleta = 'base'): void {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = p[tom];
  c.fill();
  traco(c, p.contorno, Math.max(1, rx * 0.12));
}

function caixa(c: C, x: number, y: number, w: number, h: number, p: Paleta, tom: keyof Paleta = 'base', r = 0): void {
  c.beginPath();
  if (r > 0 && typeof c.roundRect === 'function') c.roundRect(x, y, w, h, r);
  else c.rect(x, y, w, h);
  c.fillStyle = p[tom];
  c.fill();
  traco(c, p.contorno, Math.max(1, w * 0.08));
}

function olhos(c: C, x: number, y: number, r: number, cor: string, separacao: number): void {
  c.fillStyle = cor;
  c.beginPath();
  c.arc(x - separacao, y, r, 0, Math.PI * 2);
  c.arc(x + separacao, y, r, 0, Math.PI * 2);
  c.fill();
}

function brilho(c: C, raio: number, cor: string, forca = 0.5): void {
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

// --- O Portador --------------------------------------------------------------

export function desenharJogador(c: C, p: Player, un: number, corArmadura: string | null, corElmo: string | null): void {
  // O Portador desenha-se um pouco maior que um tile: lê-se melhor no telemóvel.
  const u = un * 1.18;
  const passo = Math.sin(p.andar) * u * 0.07;
  sombra(c, u * 0.34);

  if (p.invulneravel > 0 && Math.floor(p.invulneravel * 16) % 2 === 0) c.globalAlpha = 0.5;

  const capa = '#2b2340';
  const fato = corArmadura ?? '#35507a';
  const pele = '#e0b088';

  // Capa por trás.
  c.beginPath();
  c.moveTo(-u * 0.3, -u * 0.18);
  c.lineTo(u * 0.3, -u * 0.18);
  c.lineTo(u * 0.22, u * 0.36);
  c.lineTo(-u * 0.22, u * 0.36);
  c.closePath();
  c.fillStyle = capa;
  c.fill();
  traco(c, '#141020', Math.max(1, u * 0.03));

  // Pernas.
  c.fillStyle = '#221c33';
  c.fillRect(-u * 0.19, u * 0.2 + passo, u * 0.15, u * 0.2);
  c.fillRect(u * 0.045, u * 0.2 - passo, u * 0.15, u * 0.2);
  c.fillStyle = '#3a3050';
  c.fillRect(-u * 0.19, u * 0.34 + passo, u * 0.15, u * 0.06);
  c.fillRect(u * 0.045, u * 0.34 - passo, u * 0.15, u * 0.06);

  // Tronco.
  c.beginPath();
  if (typeof c.roundRect === 'function') c.roundRect(-u * 0.25, -u * 0.14, u * 0.5, u * 0.38, u * 0.1);
  else c.rect(-u * 0.25, -u * 0.14, u * 0.5, u * 0.38);
  c.fillStyle = fato;
  c.fill();
  traco(c, '#12101c', Math.max(1, u * 0.035));
  // Peitoral com reflexo.
  c.globalAlpha = 0.22;
  c.fillStyle = '#ffffff';
  c.fillRect(-u * 0.22, -u * 0.12, u * 0.44, u * 0.1);
  c.globalAlpha = 1;

  // A marca do Portador, a brilhar no peito.
  const pulso = 0.6 + Math.sin(performance.now() / 420) * 0.4;
  c.save();
  c.translate(0, u * 0.04);
  brilho(c, u * 0.3, `rgba(242,195,51,${0.5 * pulso})`, 0.9);
  c.fillStyle = '#f2c333';
  c.beginPath();
  c.arc(0, 0, u * 0.055, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#fff6c2';
  c.beginPath();
  c.arc(0, 0, u * 0.025, 0, Math.PI * 2);
  c.fill();
  c.restore();

  // Cabeça e capuz.
  c.fillStyle = pele;
  c.beginPath();
  c.arc(0, -u * 0.28, u * 0.22, 0, Math.PI * 2);
  c.fill();
  traco(c, '#3a2418', Math.max(1, u * 0.03));

  c.fillStyle = corElmo ?? capa;
  c.beginPath();
  c.arc(0, -u * 0.3, u * 0.26, Math.PI * 1.02, Math.PI * 2.02);
  c.lineTo(u * 0.2, -u * 0.22);
  c.lineTo(-u * 0.2, -u * 0.22);
  c.closePath();
  c.fill();
  traco(c, '#12101c', Math.max(1, u * 0.03));

  if (p.dirY > -0.4) {
    const desvio = p.dirX * u * 0.05;
    olhos(c, desvio, -u * 0.25, u * 0.033, '#1a1226', u * 0.085);
    c.globalAlpha = 0.65;
    olhos(c, desvio, -u * 0.26, u * 0.014, '#8ff0ff', u * 0.085);
    c.globalAlpha = 1;
  }
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

export function desenharInimigo(c: C, e: Inimigo, u: number): void {
  const d = e.def;
  const p = d.paleta;
  const r = e.raio * u;

  if (e.opacidade < 0.99) c.globalAlpha = Math.max(0.1, e.opacidade);
  if (e.opacidade > 0.2) sombra(c, r);

  if (d.luz) brilho(c, r * 3, `${p.acento}77`, d.luz * 0.7);
  if (e.elite) brilho(c, r * 2.4, `${e.elite.cor}66`, 0.55);

  c.save();
  c.scale(e.escalaX, e.escalaY);

  switch (d.forma) {
    case 'larva': desenharLarva(c, r, p, e.anim); break;
    case 'limo': desenharLimo(c, r, p, e.anim); break;
    case 'verme': desenharVerme(c, r, p, e.anim); break;
    case 'esporo': desenharEsporo(c, r, p, e.anim); break;
    case 'besouro': desenharBesouro(c, r, p, e.anim); break;
    case 'aracnideo': desenharAracnideo(c, r, p, e.anim); break;
    case 'humanoide': desenharHumanoide(c, r, p, e.anim); break;
    case 'maquina': desenharMaquina(c, r, p, e.anim); break;
    case 'cao': desenharCao(c, r, p, e.anim); break;
    case 'peixe': desenharPeixe(c, r, p, e.anim); break;
    case 'enguia': desenharEnguia(c, r, p, e.anim); break;
    case 'concha': desenharConcha(c, r, p, e.anim); break;
    case 'serpente': desenharSerpente(c, r, p, e.anim); break;
    case 'flor': desenharFlor(c, r, p, e.anim); break;
    case 'espectro': desenharEspectro(c, r, p, e.anim); break;
    case 'olho': desenharOlho(c, r, p, e.anim); break;
    case 'cristal': desenharCristal(c, r, p, e.anim); break;
    case 'gigante': desenharGigante(c, r, p, e.anim); break;
    case 'portador': desenharPortadorZero(c, r, p, e.anim); break;
    case 'boca': desenharBoca(c, r, p, e.anim); break;
  }

  c.restore();

  if (e.piscar > 0) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = Math.min(0.85, e.piscar * 4);
    c.fillStyle = '#ff8a7a';
    c.beginPath();
    c.arc(0, 0, r * 1.05, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  if (!d.chefe && e.vida < e.vidaMax && e.opacidade > 0.5) {
    const w = r * 2;
    const y = -r - u * 0.26;
    c.fillStyle = 'rgba(0,0,0,0.72)';
    c.fillRect(-w / 2 - 1, y - 1, w + 2, u * 0.09 + 2);
    c.fillStyle = e.elite ? e.elite.cor : '#d8484c';
    c.fillRect(-w / 2, y, w * (e.vida / e.vidaMax), u * 0.09);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(-w / 2, y, w * (e.vida / e.vidaMax), u * 0.03);
  }
  c.globalAlpha = 1;
}

function desenharLarva(c: C, r: number, p: Paleta, t: number): void {
  for (let i = 3; i >= 0; i--) {
    const f = i / 3;
    const y = f * r * 0.95 + Math.sin(t * 6 - i) * r * 0.06;
    elipse(c, 0, y, r * (1 - f * 0.24), r * (0.72 - f * 0.16), p, i % 2 ? 'escuro' : 'base');
  }
  elipse(c, 0, -r * 0.38, r * 0.76, r * 0.66, p, 'base');
  c.globalAlpha = 0.35;
  elipse(c, -r * 0.2, -r * 0.55, r * 0.3, r * 0.2, p, 'claro');
  c.globalAlpha = 1;
  olhos(c, 0, -r * 0.45, r * 0.13, '#140d14', r * 0.28);
  olhos(c, -r * 0.03, -r * 0.48, r * 0.05, '#ffffff', r * 0.28);
  // Mandíbulas.
  c.fillStyle = p.contorno;
  c.fillRect(-r * 0.4, -r * 0.16, r * 0.22, r * 0.1);
  c.fillRect(r * 0.18, -r * 0.16, r * 0.22, r * 0.1);
}

function desenharLimo(c: C, r: number, p: Paleta, t: number): void {
  const b = Math.sin(t * 5) * r * 0.05;
  elipse(c, 0, b, r, r * 0.88, p, 'escuro');
  elipse(c, 0, b - r * 0.06, r * 0.86, r * 0.72, p, 'base');
  c.globalAlpha = 0.45;
  elipse(c, -r * 0.3, b - r * 0.34, r * 0.24, r * 0.16, p, 'claro');
  c.globalAlpha = 1;
  olhos(c, 0, b - r * 0.1, r * 0.15, '#141018', r * 0.3);
  olhos(c, -r * 0.04, b - r * 0.14, r * 0.05, '#ffffff', r * 0.3);
  // Detritos suspensos lá dentro.
  c.fillStyle = p.contorno;
  c.fillRect(r * 0.2, b + r * 0.25, r * 0.16, r * 0.12);
  c.fillRect(-r * 0.35, b + r * 0.3, r * 0.12, r * 0.1);
}

function desenharVerme(c: C, r: number, p: Paleta, t: number): void {
  for (let i = 5; i >= 1; i--) {
    const ang = t * 3 - i * 0.5;
    elipse(c, Math.sin(ang) * r * 0.2, i * r * 0.32, r * (0.85 - i * 0.1), r * 0.3, p, i % 2 ? 'escuro' : 'base');
  }
  elipse(c, 0, 0, r * 0.95, r * 0.8, p, 'base');
  // Boca circular com dentes.
  c.beginPath();
  c.arc(0, -r * 0.1, r * 0.5, 0, Math.PI * 2);
  c.fillStyle = '#24101a';
  c.fill();
  c.fillStyle = p.claro;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + t;
    c.beginPath();
    c.moveTo(Math.cos(a) * r * 0.5, -r * 0.1 + Math.sin(a) * r * 0.5);
    c.lineTo(Math.cos(a + 0.3) * r * 0.32, -r * 0.1 + Math.sin(a + 0.3) * r * 0.32);
    c.lineTo(Math.cos(a - 0.3) * r * 0.32, -r * 0.1 + Math.sin(a - 0.3) * r * 0.32);
    c.closePath();
    c.fill();
  }
}

function desenharEsporo(c: C, r: number, p: Paleta, t: number): void {
  const pulsar = 1 + Math.sin(t * 3) * 0.06;
  c.save();
  c.scale(pulsar, pulsar);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + t * 0.6;
    elipse(c, Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.18, r * 0.18, p, 'claro');
  }
  elipse(c, 0, 0, r, r * 0.95, p, 'escuro');
  elipse(c, 0, -r * 0.08, r * 0.78, r * 0.72, p, 'base');
  olhos(c, 0, -r * 0.1, r * 0.12, '#1a1020', r * 0.28);
  c.restore();
}

function desenharBesouro(c: C, r: number, p: Paleta, t: number): void {
  // Patas.
  c.strokeStyle = p.contorno;
  c.lineWidth = Math.max(1, r * 0.13);
  for (let i = -1; i <= 1; i += 2) {
    for (let j = 0; j < 3; j++) {
      const y = -r * 0.4 + j * r * 0.42;
      const bal = Math.sin(t * 10 + j * 1.4) * r * 0.12;
      c.beginPath();
      c.moveTo(i * r * 0.6, y);
      c.lineTo(i * r * 1.1, y + bal);
      c.stroke();
    }
  }
  elipse(c, 0, 0, r * 0.92, r * 0.78, p, 'escuro');
  elipse(c, 0, -r * 0.05, r * 0.78, r * 0.62, p, 'base');
  // Divisão da carapaça.
  c.strokeStyle = p.contorno;
  c.lineWidth = Math.max(1, r * 0.09);
  c.beginPath();
  c.moveTo(0, -r * 0.6);
  c.lineTo(0, r * 0.5);
  c.stroke();
  c.globalAlpha = 0.4;
  elipse(c, -r * 0.3, -r * 0.35, r * 0.24, r * 0.14, p, 'claro');
  c.globalAlpha = 1;
  olhos(c, 0, -r * 0.5, r * 0.11, p.acento, r * 0.3);
}

function desenharAracnideo(c: C, r: number, p: Paleta, t: number): void {
  c.strokeStyle = p.escuro;
  c.lineWidth = Math.max(1.5, r * 0.15);
  for (let i = -1; i <= 1; i += 2) {
    for (let j = 0; j < 4; j++) {
      const a = (-0.9 + j * 0.6) * i;
      const bal = Math.sin(t * 8 + j) * 0.12;
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(
        Math.cos(a) * r * 1.1, Math.sin(a + bal) * r * 0.8,
        Math.cos(a) * r * 1.6, Math.sin(a + bal) * r * 1.5 + r * 0.4,
      );
      c.stroke();
    }
  }
  elipse(c, 0, r * 0.15, r * 0.82, r * 0.7, p, 'escuro');
  elipse(c, 0, -r * 0.4, r * 0.5, r * 0.45, p, 'base');
  olhos(c, -r * 0.16, -r * 0.45, r * 0.08, p.acento, r * 0.12);
  olhos(c, r * 0.16, -r * 0.45, r * 0.08, p.acento, r * 0.12);
}

function desenharHumanoide(c: C, r: number, p: Paleta, t: number): void {
  const passo = Math.sin(t * 6) * r * 0.12;
  c.fillStyle = p.escuro;
  c.fillRect(-r * 0.42, r * 0.3 + passo, r * 0.32, r * 0.6);
  c.fillRect(r * 0.1, r * 0.3 - passo, r * 0.32, r * 0.6);
  caixa(c, -r * 0.6, -r * 0.3, r * 1.2, r * 0.95, p, 'base', r * 0.2);
  // Braços.
  c.fillStyle = p.escuro;
  c.fillRect(-r * 0.92, -r * 0.2 + passo * 0.5, r * 0.3, r * 0.8);
  c.fillRect(r * 0.62, -r * 0.2 - passo * 0.5, r * 0.3, r * 0.8);
  // Cabeça.
  elipse(c, 0, -r * 0.66, r * 0.42, r * 0.42, p, 'claro');
  olhos(c, 0, -r * 0.7, r * 0.09, '#14101a', r * 0.17);
  c.globalAlpha = 0.5;
  olhos(c, 0, -r * 0.71, r * 0.04, p.acento, r * 0.17);
  c.globalAlpha = 1;
}

function desenharMaquina(c: C, r: number, p: Paleta, t: number): void {
  // Chassis.
  caixa(c, -r * 0.85, -r * 0.7, r * 1.7, r * 1.5, p, 'escuro', r * 0.14);
  caixa(c, -r * 0.68, -r * 0.55, r * 1.36, r * 1.1, p, 'base', r * 0.1);
  // Ventilação.
  c.fillStyle = p.contorno;
  for (let i = 0; i < 3; i++) c.fillRect(-r * 0.5, -r * 0.35 + i * r * 0.28, r * 1, r * 0.1);
  // Olho/sensor a varrer.
  const varre = Math.sin(t * 2.2) * r * 0.32;
  c.fillStyle = p.contorno;
  c.fillRect(-r * 0.6, -r * 0.9, r * 1.2, r * 0.32);
  c.fillStyle = p.acento;
  c.fillRect(-r * 0.12 + varre, -r * 0.85, r * 0.24, r * 0.22);
  // Pernas/rastos.
  c.fillStyle = p.escuro;
  c.fillRect(-r * 0.95, r * 0.6, r * 0.5, r * 0.35);
  c.fillRect(r * 0.45, r * 0.6, r * 0.5, r * 0.35);
  c.globalAlpha = 0.28;
  c.fillStyle = '#ffffff';
  c.fillRect(-r * 0.6, -r * 0.5, r * 1.2, r * 0.14);
  c.globalAlpha = 1;
}

function desenharCao(c: C, r: number, p: Paleta, t: number): void {
  const passo = Math.sin(t * 12) * r * 0.2;
  c.strokeStyle = p.escuro;
  c.lineWidth = Math.max(1.5, r * 0.18);
  for (const [x, f] of [[-r * 0.5, 1], [r * 0.5, -1]] as [number, number][]) {
    c.beginPath();
    c.moveTo(x, r * 0.2);
    c.lineTo(x + passo * f, r * 0.85);
    c.stroke();
  }
  elipse(c, 0, r * 0.1, r * 0.95, r * 0.55, p, 'base');
  elipse(c, r * 0.75, -r * 0.3, r * 0.42, r * 0.36, p, 'claro');
  // Focinho e orelhas.
  c.fillStyle = p.escuro;
  c.fillRect(r * 0.95, -r * 0.3, r * 0.4, r * 0.22);
  c.beginPath();
  c.moveTo(r * 0.55, -r * 0.6);
  c.lineTo(r * 0.7, -r * 1.05);
  c.lineTo(r * 0.9, -r * 0.55);
  c.closePath();
  c.fill();
  olhos(c, r * 0.8, -r * 0.38, r * 0.08, p.acento, r * 0.001);
  // Cauda de cabo.
  c.strokeStyle = p.escuro;
  c.beginPath();
  c.moveTo(-r * 0.9, -r * 0.1);
  c.quadraticCurveTo(-r * 1.4, -r * 0.5, -r * 1.1, -r * 0.9 + passo * 0.3);
  c.stroke();
}

function desenharPeixe(c: C, r: number, p: Paleta, t: number): void {
  const ond = Math.sin(t * 9) * r * 0.25;
  c.beginPath();
  c.moveTo(-r, ond);
  c.lineTo(-r * 1.6, ond - r * 0.5);
  c.lineTo(-r * 1.6, ond + r * 0.5);
  c.closePath();
  c.fillStyle = p.escuro;
  c.fill();
  elipse(c, 0, 0, r, r * 0.6, p, 'base');
  c.globalAlpha = 0.4;
  elipse(c, -r * 0.1, -r * 0.2, r * 0.6, r * 0.16, p, 'claro');
  c.globalAlpha = 1;
  // Dentes.
  c.fillStyle = '#e8e2d2';
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    c.moveTo(r * 0.55 + i * r * 0.12, r * 0.05);
    c.lineTo(r * 0.62 + i * r * 0.12, r * 0.3);
    c.lineTo(r * 0.69 + i * r * 0.12, r * 0.05);
    c.closePath();
    c.fill();
  }
  olhos(c, r * 0.55, -r * 0.2, r * 0.1, '#0e1a22', r * 0.001);
  olhos(c, r * 0.58, -r * 0.23, r * 0.04, '#ffffff', r * 0.001);
}

function desenharEnguia(c: C, r: number, p: Paleta, t: number): void {
  c.strokeStyle = p.escuro;
  c.lineWidth = r * 0.7;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, 0);
  for (let i = 1; i <= 6; i++) {
    c.lineTo(-i * r * 0.42, Math.sin(t * 7 - i * 0.8) * r * 0.5);
  }
  c.stroke();
  c.strokeStyle = p.base;
  c.lineWidth = r * 0.45;
  c.stroke();
  elipse(c, 0, 0, r * 0.6, r * 0.5, p, 'claro');
  olhos(c, r * 0.12, -r * 0.12, r * 0.1, '#0b1620', r * 0.2);
  // Lanterna.
  c.fillStyle = p.acento;
  c.beginPath();
  c.arc(r * 0.5, -r * 0.6, r * 0.18, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = p.escuro;
  c.lineWidth = Math.max(1, r * 0.08);
  c.beginPath();
  c.moveTo(r * 0.2, -r * 0.3);
  c.lineTo(r * 0.5, -r * 0.6);
  c.stroke();
}

function desenharConcha(c: C, r: number, p: Paleta, t: number): void {
  // Corpo por baixo.
  elipse(c, 0, r * 0.35, r * 0.8, r * 0.5, p, 'claro');
  olhos(c, 0, r * 0.3, r * 0.09, '#140d18', r * 0.22);
  // Concha em espiral.
  c.save();
  c.rotate(Math.sin(t * 1.5) * 0.05);
  elipse(c, 0, -r * 0.1, r, r * 0.9, p, 'escuro');
  for (let i = 3; i >= 1; i--) {
    const f = i / 3;
    c.beginPath();
    c.arc(r * 0.1 * (3 - i), -r * 0.1, r * 0.85 * f, 0, Math.PI * 2);
    c.strokeStyle = p.contorno;
    c.lineWidth = Math.max(1, r * 0.1);
    c.stroke();
  }
  c.globalAlpha = 0.35;
  elipse(c, -r * 0.3, -r * 0.45, r * 0.3, r * 0.16, p, 'acento');
  c.globalAlpha = 1;
  c.restore();
}

function desenharSerpente(c: C, r: number, p: Paleta, t: number): void {
  for (let i = 7; i >= 1; i--) {
    const a = t * 4 - i * 0.55;
    const x = Math.sin(a) * r * 0.55 - i * r * 0.1;
    const y = i * r * 0.36;
    elipse(c, x, y, r * (0.8 - i * 0.07), r * (0.6 - i * 0.05), p, i % 2 ? 'escuro' : 'base');
  }
  elipse(c, 0, 0, r * 0.9, r * 0.75, p, 'base');
  // Cristais na cabeça.
  c.fillStyle = p.acento;
  for (const dx of [-0.45, 0, 0.45]) {
    c.beginPath();
    c.moveTo(dx * r, -r * 0.55);
    c.lineTo(dx * r - r * 0.12, -r * 0.2);
    c.lineTo(dx * r + r * 0.12, -r * 0.2);
    c.closePath();
    c.fill();
  }
  olhos(c, 0, -r * 0.1, r * 0.13, '#1a1030', r * 0.3);
  olhos(c, 0, -r * 0.12, r * 0.05, p.acento, r * 0.3);
}

function desenharFlor(c: C, r: number, p: Paleta, t: number): void {
  // Caule e folhas.
  c.fillStyle = p.escuro;
  c.fillRect(-r * 0.14, 0, r * 0.28, r * 0.95);
  const abre = 0.6 + Math.sin(t * 1.8) * 0.4;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + t * 0.3;
    c.save();
    c.rotate(a);
    c.beginPath();
    c.ellipse(0, -r * 0.7 * abre, r * 0.32, r * 0.72, 0, 0, Math.PI * 2);
    c.fillStyle = i % 2 ? p.base : p.escuro;
    c.fill();
    traco(c, p.contorno, Math.max(1, r * 0.07));
    c.restore();
  }
  elipse(c, 0, 0, r * 0.52, r * 0.52, p, 'contorno');
  elipse(c, 0, 0, r * 0.4, r * 0.4, p, 'acento');
  // Dentes à volta da boca.
  c.fillStyle = '#efe6d0';
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + t;
    c.beginPath();
    c.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
    c.lineTo(Math.cos(a + 0.22) * r * 0.32, Math.sin(a + 0.22) * r * 0.32);
    c.lineTo(Math.cos(a - 0.22) * r * 0.32, Math.sin(a - 0.22) * r * 0.32);
    c.closePath();
    c.fill();
  }
}

function desenharEspectro(c: C, r: number, p: Paleta, t: number): void {
  c.save();
  c.globalAlpha *= 0.85;
  // Corpo em véu, com a base desfeita.
  c.beginPath();
  c.moveTo(-r * 0.85, r * 0.9);
  c.quadraticCurveTo(-r, -r * 0.6, 0, -r);
  c.quadraticCurveTo(r, -r * 0.6, r * 0.85, r * 0.9);
  for (let i = 4; i >= 0; i--) {
    const x = -r * 0.85 + (i / 4) * r * 1.7;
    c.lineTo(x, r * 0.9 + Math.sin(t * 5 + i) * r * 0.22);
  }
  c.closePath();
  c.fillStyle = p.base;
  c.fill();
  traco(c, p.contorno, Math.max(1, r * 0.08));
  c.globalAlpha *= 0.6;
  c.fillStyle = p.claro;
  c.fillRect(-r * 0.5, -r * 0.55, r * 1, r * 0.2);
  c.restore();
  olhos(c, 0, -r * 0.4, r * 0.13, p.acento, r * 0.3);
  brilho(c, r * 1.8, `${p.acento}55`, 0.5);
}

function desenharOlho(c: C, r: number, p: Paleta, t: number): void {
  // Anéis suspensos.
  c.save();
  c.rotate(t * 0.6);
  c.strokeStyle = p.escuro;
  c.lineWidth = Math.max(1.5, r * 0.12);
  c.beginPath();
  c.ellipse(0, 0, r * 1.15, r * 0.4, 0, 0, Math.PI * 2);
  c.stroke();
  c.restore();
  c.save();
  c.rotate(-t * 0.4);
  c.strokeStyle = p.base;
  c.lineWidth = Math.max(1.5, r * 0.1);
  c.beginPath();
  c.ellipse(0, 0, r * 0.4, r * 1.15, 0, 0, Math.PI * 2);
  c.stroke();
  c.restore();

  elipse(c, 0, 0, r * 0.9, r * 0.9, p, 'escuro');
  elipse(c, 0, 0, r * 0.7, r * 0.7, p, 'claro');
  const olharX = Math.sin(t * 1.3) * r * 0.2;
  const olharY = Math.cos(t * 0.9) * r * 0.16;
  elipse(c, olharX, olharY, r * 0.34, r * 0.34, p, 'contorno');
  c.fillStyle = p.acento;
  c.beginPath();
  c.arc(olharX, olharY, r * 0.16, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(olharX - r * 0.08, olharY - r * 0.08, r * 0.06, 0, Math.PI * 2);
  c.fill();
  brilho(c, r * 2.4, `${p.acento}55`, 0.6);
}

function desenharCristal(c: C, r: number, p: Paleta, t: number): void {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + t * 0.4;
    const alt = r * (0.8 + (i % 2) * 0.4);
    c.save();
    c.rotate(a);
    c.beginPath();
    c.moveTo(0, -alt);
    c.lineTo(r * 0.28, 0);
    c.lineTo(0, r * 0.4);
    c.lineTo(-r * 0.28, 0);
    c.closePath();
    c.fillStyle = i % 2 ? p.base : p.claro;
    c.fill();
    traco(c, p.contorno, Math.max(1, r * 0.07));
    c.restore();
  }
  brilho(c, r * 2.2, `${p.acento}66`, 0.6);
}

function desenharGigante(c: C, r: number, p: Paleta, t: number): void {
  // Costelas por trás.
  c.strokeStyle = p.escuro;
  c.lineWidth = Math.max(2, r * 0.1);
  for (let i = -2; i <= 2; i++) {
    c.beginPath();
    c.arc(0, r * 0.2, r * (0.9 + Math.abs(i) * 0.18), Math.PI * 1.05, Math.PI * 1.95);
    c.stroke();
  }
  caixa(c, -r * 0.85, -r * 0.5, r * 1.7, r * 1.4, p, 'escuro', r * 0.2);
  caixa(c, -r * 0.7, -r * 0.35, r * 1.4, r * 1.1, p, 'base', r * 0.16);
  // Crânio.
  elipse(c, 0, -r * 0.85, r * 0.72, r * 0.62, p, 'claro');
  c.fillStyle = '#120e0c';
  c.beginPath();
  c.ellipse(-r * 0.26, -r * 0.9, r * 0.18, r * 0.22, 0, 0, Math.PI * 2);
  c.ellipse(r * 0.26, -r * 0.9, r * 0.18, r * 0.22, 0, 0, Math.PI * 2);
  c.fill();
  const luzOlho = 0.5 + Math.sin(t * 2.5) * 0.5;
  c.globalAlpha = luzOlho;
  olhos(c, 0, -r * 0.9, r * 0.09, p.acento, r * 0.26);
  c.globalAlpha = 1;
  // Dentes.
  c.fillStyle = '#efe6d0';
  for (let i = -3; i <= 3; i++) c.fillRect(i * r * 0.16 - r * 0.05, -r * 0.62, r * 0.1, r * 0.16);
  // Braços.
  caixa(c, -r * 1.25, -r * 0.3, r * 0.42, r * 1.1, p, 'escuro', r * 0.12);
  caixa(c, r * 0.83, -r * 0.3, r * 0.42, r * 1.1, p, 'escuro', r * 0.12);
  brilho(c, r * 2, `${p.acento}44`, 0.4);
}

function desenharPortadorZero(c: C, r: number, p: Paleta, t: number): void {
  // A silhueta é a do jogador, mas negra e maior.
  c.beginPath();
  c.moveTo(-r * 0.7, -r * 0.35);
  c.lineTo(r * 0.7, -r * 0.35);
  c.lineTo(r * 0.5, r * 0.95);
  c.lineTo(-r * 0.5, r * 0.95);
  c.closePath();
  c.fillStyle = p.escuro;
  c.fill();
  traco(c, p.contorno, Math.max(1.5, r * 0.06));
  caixa(c, -r * 0.55, -r * 0.3, r * 1.1, r * 0.9, p, 'base', r * 0.16);
  elipse(c, 0, -r * 0.62, r * 0.45, r * 0.45, p, 'escuro');
  // Capuz.
  c.beginPath();
  c.arc(0, -r * 0.66, r * 0.56, Math.PI * 1.02, Math.PI * 2.02);
  c.lineTo(r * 0.42, -r * 0.5);
  c.lineTo(-r * 0.42, -r * 0.5);
  c.closePath();
  c.fillStyle = p.contorno;
  c.fill();
  // Marca no peito, mas apagada — ele já não é um Portador activo.
  const pulso = 0.4 + Math.sin(t * 1.4) * 0.35;
  c.save();
  c.translate(0, r * 0.05);
  brilho(c, r * 0.9, `rgba(143,143,191,${pulso})`, 0.9);
  c.fillStyle = '#8f8fbf';
  c.beginPath();
  c.arc(0, 0, r * 0.12, 0, Math.PI * 2);
  c.fill();
  c.restore();
  olhos(c, 0, -r * 0.62, r * 0.08, '#d5a8ff', r * 0.17);
}

function desenharBoca(c: C, r: number, p: Paleta, t: number): void {
  // Buraco no chão com dentes à volta.
  c.beginPath();
  c.ellipse(0, 0, r, r * 0.7, 0, 0, Math.PI * 2);
  c.fillStyle = '#07060c';
  c.fill();
  traco(c, p.contorno, Math.max(1.5, r * 0.1));
  c.fillStyle = p.claro;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = Math.cos(a) * r * 0.92;
    const y = Math.sin(a) * r * 0.64;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x * 0.62 - Math.sin(a) * r * 0.1, y * 0.62 + Math.cos(a) * r * 0.1);
    c.lineTo(x * 0.62 + Math.sin(a) * r * 0.1, y * 0.62 - Math.cos(a) * r * 0.1);
    c.closePath();
    c.fill();
  }
  // Língua/garganta a pulsar.
  const pulso = 0.4 + Math.sin(t * 3) * 0.25;
  c.globalAlpha = pulso;
  c.fillStyle = p.acento;
  c.beginPath();
  c.ellipse(0, r * 0.1, r * 0.32, r * 0.2, 0, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 1;
}
