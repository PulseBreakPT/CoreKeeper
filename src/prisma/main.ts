import { aceitaJogada } from '../serpente/estados';
import { registarMotor } from '../serpente/diagnostico';
import {
  ALTURA, LARGURA, Quebra, RAIO, RAQUETE_ALTURA, RAQUETE_Y, VIDAS_INICIAIS,
} from './logica';

/** PRISMA — apresentação: a luz, os prismas e o que acontece quando se partem. */

const CHAVE_RECORDE = 'nexus:prisma:recorde:v1';
/** Matiz da casa: o dourado do Nexus é a identidade deste jogo. */
const MATIZ = 48;

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id}`);
  return e as T;
}
function vibrar(p: number | number[]): void { if ('vibrate' in navigator) navigator.vibrate(p); }

interface Particula { x: number; y: number; vx: number; vy: number; vida: number; total: number; raio: number; tom: number }

export function montarPrisma(aoMenu: () => void, aoResultado: (xp: number, moedas: number) => void): { activar(): void; desactivar(): void } {
  const raiz = el<HTMLElement>('jogo-prisma');
  const canvas = el<HTMLCanvasElement>('canvas-prisma');
  const ctx = canvas.getContext('2d')!;
  const overlay = el<HTMLElement>('overlay-prisma');
  const iniciar = el<HTMLButtonElement>('iniciar-prisma');
  const mensagem = el<HTMLElement>('mensagem-prisma');

  let recordeGuardado = 0;
  try { recordeGuardado = Number(localStorage.getItem(CHAVE_RECORDE)) || 0; } catch { /* sessão */ }
  const jogo = new Quebra({ recorde: recordeGuardado });
  registarMotor('prisma', jogo);

  let activo = false;
  let ultimo = performance.now();
  let mensagemAte = 0;
  /** 0 a 1, a esmorecer: dá o estremecimento do tabuleiro ao partir um prisma. */
  let impacto = 0;
  const particulas: Particula[] = [];
  const rasto: { x: number; y: number }[] = [];

  const escala = (): number => canvas.width / LARGURA;

  /** O nível já vive no cabeçalho; esta linha diz o que fazer a seguir. */
  function mensagemDeFundo(): string {
    if (jogo.estado === 'pausa') return 'EM PAUSA';
    if (jogo.estado === 'fim') return 'LUZ APAGADA';
    if (jogo.presa) return 'TOCA PARA LARGAR A LUZ';
    return jogo.sequencia >= 2 ? `SEQUÊNCIA ${jogo.sequencia}` : 'EM JOGO';
  }

  function guardarRecorde(): void {
    if (jogo.recorde <= recordeGuardado) return;
    recordeGuardado = jogo.recorde;
    try { localStorage.setItem(CHAVE_RECORDE, String(jogo.recorde)); } catch { /* sessão */ }
  }

  function hud(): void {
    el('pontos-prisma').textContent = jogo.pontos.toLocaleString('pt-PT');
    el('recorde-prisma').textContent = jogo.recorde.toLocaleString('pt-PT');
    el('nivel-prisma').textContent = String(jogo.nivel);
    el('vidas-prisma').textContent = Array.from(
      { length: VIDAS_INICIAIS },
      (_, i) => (i < jogo.vidas ? '◆' : '◇'),
    ).join(' ');
  }

  function anunciar(texto: string, duracao = 900): void {
    mensagem.textContent = texto;
    mensagem.classList.remove('impacto');
    void mensagem.offsetWidth;
    mensagem.classList.add('impacto');
    mensagemAte = performance.now() + duracao;
  }

  function estilhacar(x: number, y: number, tom: number, quantidade: number): void {
    for (let i = 0; i < quantidade; i++) {
      const angulo = Math.random() * Math.PI * 2;
      const forca = 14 + Math.random() * 42;
      particulas.push({
        x, y,
        vx: Math.cos(angulo) * forca,
        vy: Math.sin(angulo) * forca,
        vida: 340 + Math.random() * 320,
        total: 660,
        raio: .35 + Math.random() * .8,
        tom,
      });
    }
  }

  function terminar(): void {
    guardarRecorde();
    aoResultado(Math.round(jogo.pontos / 20) + jogo.nivel * 8, Math.round(jogo.pontos / 150) + 1);
    overlay.querySelector('small')!.textContent = 'LUZ APAGADA';
    overlay.querySelector('h1')!.innerHTML = `${jogo.pontos.toLocaleString('pt-PT')}<br><em>pontos.</em>`;
    overlay.querySelector('p')!.textContent = `Nível ${jogo.nivel} · melhor sequência ×${Math.max(1, jogo.melhorSequencia)}`;
    iniciar.innerHTML = 'JOGAR OUTRA VEZ <span>↻</span>';
    overlay.hidden = false;
  }

  function tratar(ev: ReturnType<Quebra['passo']>): void {
    for (const p of ev.partidos) {
      estilhacar(p.x, p.y, p.tom, 14);
      impacto = 1;
    }
    if (ev.partidos.length) {
      vibrar(ev.partidos.length > 1 ? [8, 10, 14] : 7);
      if (jogo.sequencia >= 4) anunciar(`SEQUÊNCIA ×${Math.min(4, 1 + Math.floor(jogo.sequencia / 4))}`, 700);
    }
    for (const t of ev.toques) estilhacar(t.x, t.y, t.tom, 3);
    if (ev.nivelCompleto) {
      anunciar(`NÍVEL ${jogo.nivel}`, 1400);
      vibrar([14, 18, 14, 18, 30]);
      guardarRecorde();
    }
    if (ev.perdeuVida && !ev.terminou) {
      anunciar('PERDESTE UMA LUZ', 1100);
      vibrar([40, 25, 60]);
      raiz.classList.remove('prisma-falha');
      void raiz.offsetWidth;
      raiz.classList.add('prisma-falha');
    }
    if (ev.terminou) { vibrar([50, 30, 70]); terminar(); }
    if (ev.partidos.length || ev.perdeuVida || ev.nivelCompleto) hud();
  }

  function desenhar(): void {
    const k = escala();
    const l = canvas.width, a = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, l, a);

    const fundo = ctx.createRadialGradient(l * .5, a * .3, 10, l * .5, a * .55, a * .8);
    fundo.addColorStop(0, `hsl(${MATIZ} 34% 10%)`);
    fundo.addColorStop(1, '#06070a');
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, l, a);

    // O tabuleiro estremece de leve quando um prisma se parte.
    if (impacto > 0) ctx.translate((Math.random() - .5) * impacto * 5, (Math.random() - .5) * impacto * 5);
    ctx.scale(k, k);

    // Grelha de fundo: dá profundidade sem competir com as peças.
    ctx.strokeStyle = `hsl(${MATIZ} 60% 60% / .05)`;
    ctx.lineWidth = .18;
    for (let x = 0; x <= LARGURA; x += LARGURA / 6) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ALTURA); ctx.stroke(); }
    for (let y = 0; y <= ALTURA; y += ALTURA / 10) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(LARGURA, y); ctx.stroke(); }

    // Prismas.
    for (const b of jogo.blocos) {
      const tom = (MATIZ + b.tom) % 360;
      const duro = b.resistencia > 1;
      const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.altura);
      g.addColorStop(0, `hsl(${tom} ${duro ? 30 : 88}% ${duro ? 82 : 74}%)`);
      g.addColorStop(1, `hsl(${tom} ${duro ? 22 : 72}% ${duro ? 48 : 42}%)`);
      ctx.fillStyle = g;
      ctx.shadowColor = `hsl(${tom} 92% 62% / .38)`;
      ctx.shadowBlur = 2.2;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.largura, b.altura, 1.1);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Aresta acesa no topo: é o que os faz parecer vidro e não autocolantes.
      ctx.strokeStyle = `hsl(${tom} 100% 88% / ${duro ? .9 : .6})`;
      ctx.lineWidth = .3;
      ctx.beginPath();
      ctx.moveTo(b.x + .8, b.y + .35);
      ctx.lineTo(b.x + b.largura - .8, b.y + .35);
      ctx.stroke();
    }

    // Rasto da bola.
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < rasto.length; i++) {
      const p = rasto[i], f = (i + 1) / rasto.length;
      ctx.globalAlpha = f * .22;
      ctx.fillStyle = `hsl(${MATIZ} 96% 72%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, RAIO * f * .85, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Estilhaços.
    for (const p of particulas) {
      const f = Math.max(0, p.vida / p.total);
      ctx.globalAlpha = f;
      ctx.fillStyle = `hsl(${(MATIZ + p.tom) % 360} 98% ${60 + f * 30}%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.raio * (.5 + f * .7), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // Raquete.
    const meia = jogo.raquete.largura / 2;
    const raquete = ctx.createLinearGradient(0, RAQUETE_Y, 0, RAQUETE_Y + RAQUETE_ALTURA);
    raquete.addColorStop(0, `hsl(${MATIZ} 100% 86%)`);
    raquete.addColorStop(1, `hsl(${MATIZ} 86% 52%)`);
    ctx.fillStyle = raquete;
    ctx.shadowColor = `hsl(${MATIZ} 96% 62% / .6)`;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.roundRect(jogo.raquete.x - meia, RAQUETE_Y, jogo.raquete.largura, RAQUETE_ALTURA, RAQUETE_ALTURA / 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Bola: núcleo branco com halo dourado.
    const bola = ctx.createRadialGradient(jogo.bola.x - .4, jogo.bola.y - .5, .2, jogo.bola.x, jogo.bola.y, RAIO * 1.6);
    bola.addColorStop(0, '#fff');
    bola.addColorStop(.45, `hsl(${MATIZ} 100% 82%)`);
    bola.addColorStop(1, `hsl(${MATIZ} 92% 46% / 0)`);
    ctx.fillStyle = bola;
    ctx.beginPath();
    ctx.arc(jogo.bola.x, jogo.bola.y, RAIO * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(jogo.bola.x, jogo.bola.y, RAIO * .72, 0, Math.PI * 2);
    ctx.fill();

    // Linha de mira enquanto a bola está presa: diz para onde vai sair.
    if (jogo.presa && jogo.estado !== 'fim') {
      ctx.strokeStyle = `hsl(${MATIZ} 90% 70% / .3)`;
      ctx.lineWidth = .3;
      ctx.setLineDash([1.4, 2.2]);
      ctx.beginPath();
      ctx.moveTo(jogo.bola.x, jogo.bola.y - RAIO);
      ctx.lineTo(jogo.bola.x, jogo.bola.y - 16);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /** Converte um toque no ecrã para a coluna lógica da arena. */
  function coluna(e: PointerEvent): number {
    const r = canvas.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * LARGURA;
  }

  let aArrastar = false;
  canvas.addEventListener('pointerdown', (e) => {
    if (!aceitaJogada(jogo.estado) || !overlay.hidden) return;
    e.preventDefault();
    aArrastar = true;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* o ponteiro já saiu */ }
    jogo.mover(coluna(e));
    jogo.lancar();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!aArrastar || !aceitaJogada(jogo.estado)) return;
    e.preventDefault();
    jogo.mover(coluna(e));
  });
  for (const nome of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
    canvas.addEventListener(nome, () => { aArrastar = false; });
  }

  window.addEventListener('keydown', (e) => {
    if (!activo || !aceitaJogada(jogo.estado) || !overlay.hidden) return;
    const passo = LARGURA / 14;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); jogo.mover(jogo.raquete.x - passo); }
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); jogo.mover(jogo.raquete.x + passo); }
    else if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); jogo.lancar(); }
  });

  iniciar.addEventListener('click', () => {
    if (jogo.estado === 'fim') jogo.reiniciar();
    jogo.iniciar();
    overlay.hidden = true;
    anunciar('TOCA PARA LARGAR A LUZ', 1400);
    hud();
  });
  el('pausa-prisma').addEventListener('click', () => {
    jogo.pausar();
    anunciar(mensagemDeFundo(), 1200);
  });
  el('novo-prisma').addEventListener('click', () => {
    jogo.reiniciar();
    overlay.hidden = true;
    particulas.length = 0;
    rasto.length = 0;
    anunciar('TABULEIRO NOVO');
    hud();
  });
  el('menu-prisma').addEventListener('click', () => {
    if (jogo.estado === 'jogar') jogo.pausar();
    aoMenu();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && activo && jogo.estado === 'jogar') jogo.pausar();
  });

  function quadro(agora: number): void {
    const dt = Math.min(50, agora - ultimo);
    ultimo = agora;
    if (activo) {
      if (jogo.estado === 'jogar') tratar(jogo.passo(dt / 1000));
      impacto = Math.max(0, impacto - dt / 260);
      for (let i = particulas.length - 1; i >= 0; i--) {
        const p = particulas[i];
        p.vida -= dt;
        p.x += p.vx * dt / 1000;
        p.y += p.vy * dt / 1000;
        p.vy += 54 * dt / 1000;
        if (p.vida <= 0) particulas.splice(i, 1);
      }
      if (!jogo.presa && jogo.estado === 'jogar') {
        rasto.push({ x: jogo.bola.x, y: jogo.bola.y });
        while (rasto.length > 9) rasto.shift();
      } else if (rasto.length) rasto.shift();
      if (mensagemAte && agora > mensagemAte) {
        mensagem.textContent = mensagemDeFundo();
        mensagem.classList.remove('impacto');
        mensagemAte = 0;
      }
      desenhar();
    }
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);
  hud();
  desenhar();

  return {
    activar() { activo = true; raiz.hidden = false; ultimo = performance.now(); hud(); },
    desactivar() { activo = false; raiz.hidden = true; if (jogo.estado === 'jogar') jogo.pausar(); },
  };
}
