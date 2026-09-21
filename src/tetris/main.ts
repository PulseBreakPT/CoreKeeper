import { Tetris, blocos, COLUNAS, LINHAS, OCULTAS, type EventoTetris, type Peca, type TipoPeca } from './logica';

const CORES: Record<TipoPeca, number> = { I: 188, O: 48, T: 282, S: 112, Z: 350, J: 220, L: 25 };
const CHAVE_RECORDE = 'nexus:tetris:recorde:v1';

function el<T extends HTMLElement>(id: string): T { const e = document.getElementById(id); if (!e) throw new Error(`#${id}`); return e as T; }
function vibrar(p: number | number[]): void { if ('vibrate' in navigator) navigator.vibrate(p); }

export function montarTetris(aoMenu: () => void): { activar(): void; desactivar(): void } {
  const raiz = el<HTMLElement>('tetris-jogo');
  const canvas = el<HTMLCanvasElement>('tetris-canvas');
  const ctx = canvas.getContext('2d')!;
  const hold = el<HTMLCanvasElement>('tetris-hold');
  const next = el<HTMLCanvasElement>('tetris-next');
  const overlay = el<HTMLElement>('tetris-overlay');
  const iniciar = el<HTMLButtonElement>('tetris-iniciar');
  const estado = el<HTMLElement>('tetris-estado');
  const combo = el<HTMLElement>('tetris-combo');
  const arena = el<HTMLElement>('tetris-arena');
  const jogo = new Tetris();
  let activo = false, ultimo = performance.now(), mensagemAte = 0;
  type Fragmento = { x: number; y: number; vx: number; vy: number; giro: number; vg: number; vida: number; total: number; tamanho: number; matiz: number };
  const fragmentos: Fragmento[] = [];
  const ondas: { y: number; vida: number; total: number }[] = [];
  try { jogo.recorde = Number(localStorage.getItem(CHAVE_RECORDE)) || 0; } catch { /* sessão */ }

  function matizTema(): number { return Number(getComputedStyle(document.documentElement).getPropertyValue('--tema')) || 188; }

  function bloco(c: CanvasRenderingContext2D, x: number, y: number, tamanho: number, tipo: TipoPeca, alpha = 1, fantasma = false): void {
    const h = CORES[tipo], m = Math.max(1.5, tamanho * .07), raio = tamanho * .13;
    c.save(); c.globalAlpha = alpha;
    const px = x * tamanho + m, py = y * tamanho + m, lado = tamanho - m * 2;
    c.beginPath(); c.roundRect(px, py, lado, lado, raio);
    if (fantasma) { c.strokeStyle = `hsl(${h} 85% 70%)`; c.lineWidth = Math.max(1.5, tamanho * .065); c.stroke(); }
    else {
      const g = c.createLinearGradient(px, py, px + lado, py + lado);
      g.addColorStop(0, `hsl(${h} 92% 76%)`); g.addColorStop(.42, `hsl(${h} 78% 57%)`); g.addColorStop(1, `hsl(${h} 72% 36%)`);
      c.fillStyle = g; c.shadowColor = `hsl(${h} 90% 60% / .32)`; c.shadowBlur = tamanho * .28; c.fill();
      c.shadowBlur = 0; c.strokeStyle = `hsl(${h} 95% 88% / .55)`; c.lineWidth = 1; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.13)'; c.fillRect(px + lado * .16, py + lado * .13, lado * .55, Math.max(1, lado * .075));
    }
    c.restore();
  }

  function mini(cvs: HTMLCanvasElement, tipos: (TipoPeca | null)[]): void {
    const c = cvs.getContext('2d')!, w = cvs.width, altura = tipos.length ? cvs.height / tipos.length : cvs.height;
    c.clearRect(0, 0, w, cvs.height);
    tipos.forEach((tipo, i) => {
      if (!tipo) return;
      const p: Peca = { tipo, x: 0, y: 0, rotacao: 0 }, bs = Math.min(24, altura / 4.5);
      const forma = blocos(p), minX = Math.min(...forma.map(b => b.x)), maxX = Math.max(...forma.map(b => b.x)), minY = Math.min(...forma.map(b => b.y)), maxY = Math.max(...forma.map(b => b.y));
      const ox = (w - (maxX - minX + 1) * bs) / 2, oy = i * altura + (altura - (maxY - minY + 1) * bs) / 2;
      forma.forEach((b) => bloco(c, (ox / bs) + b.x - minX, (oy / bs) + b.y - minY, bs, tipo));
    });
  }

  function desenhar(): void {
    const tamanho = canvas.width / COLUNAS, tema = matizTema();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fundo = ctx.createLinearGradient(0, 0, 0, canvas.height);
    fundo.addColorStop(0, `hsl(${tema} 24% 7%)`); fundo.addColorStop(1, `hsl(${tema} 28% 3%)`); ctx.fillStyle = fundo; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = `hsl(${tema} 30% 45% / .085)`; ctx.lineWidth = 1;
    for (let x = 1; x < COLUNAS; x++) { ctx.beginPath(); ctx.moveTo(x * tamanho, 0); ctx.lineTo(x * tamanho, canvas.height); ctx.stroke(); }
    for (let y = 1; y < LINHAS - OCULTAS; y++) { ctx.beginPath(); ctx.moveTo(0, y * tamanho); ctx.lineTo(canvas.width, y * tamanho); ctx.stroke(); }
    jogo.grelha.slice(OCULTAS).forEach((linha, y) => linha.forEach((tipo, x) => { if (tipo) bloco(ctx, x, y, tamanho, tipo); }));
    if (jogo.estado !== 'fim') {
      blocos(jogo.fantasma()).forEach((b) => { if (b.y >= OCULTAS) bloco(ctx, b.x, b.y - OCULTAS, tamanho, jogo.peca.tipo, .42, true); });
      blocos(jogo.peca).forEach((b) => { if (b.y >= OCULTAS) bloco(ctx, b.x, b.y - OCULTAS, tamanho, jogo.peca.tipo); });
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const onda of ondas) {
      const p = 1 - onda.vida / onda.total;
      const g = ctx.createLinearGradient(0, onda.y - tamanho, canvas.width, onda.y + tamanho);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, `hsla(${tema}, 100%, 82%, ${Math.max(0, (1 - p) * .62)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, onda.y - tamanho * (1 + p * 2), canvas.width, tamanho * (2 + p * 4));
      ctx.strokeStyle = `hsla(${tema}, 100%, 78%, ${Math.max(0, (1 - p) * .75)})`; ctx.lineWidth = 2 + p * 4;
      ctx.beginPath(); ctx.moveTo(canvas.width * p * .5, onda.y); ctx.lineTo(canvas.width * (1 - p * .5), onda.y); ctx.stroke();
    }
    for (const f of fragmentos) {
      const a = Math.max(0, f.vida / f.total);
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.giro); ctx.globalAlpha = a;
      ctx.shadowColor = `hsl(${f.matiz} 100% 68%)`; ctx.shadowBlur = 10 * a; ctx.fillStyle = `hsl(${f.matiz} 92% ${58 + a * 22}%)`;
      ctx.fillRect(-f.tamanho / 2, -f.tamanho / 2, f.tamanho, f.tamanho); ctx.restore();
    }
    ctx.restore();
    mini(hold, [jogo.reserva]); mini(next, jogo.fila.slice(0, 4));
  }

  function desintegrar(limpas: EventoTetris['limpas']): void {
    if (!limpas.length) return;
    const tamanho = canvas.width / COLUNAS;
    for (const linha of limpas) {
      const y = (linha.y - OCULTAS + .5) * tamanho;
      if (y < 0) continue;
      ondas.push({ y, vida: 430, total: 430 });
      linha.tipos.forEach((tipo, x) => {
        for (let i = 0; i < 7; i++) {
          const afastamento = (x + .5 - COLUNAS / 2) / (COLUNAS / 2);
          fragmentos.push({ x: (x + .5) * tamanho + (Math.random() - .5) * tamanho * .6, y: y + (Math.random() - .5) * tamanho * .55,
            vx: afastamento * (75 + Math.random() * 130) + (Math.random() - .5) * 75, vy: -55 - Math.random() * 190,
            giro: Math.random() * Math.PI, vg: (Math.random() - .5) * .018, vida: 520 + Math.random() * 430, total: 950, tamanho: 2.5 + Math.random() * 6.5, matiz: CORES[tipo] });
        }
      });
    }
    arena.classList.remove('linha-explodiu'); void arena.offsetWidth; arena.classList.add('linha-explodiu');
  }

  function actualizarEfeitos(dt: number): void {
    for (let i = fragmentos.length - 1; i >= 0; i--) {
      const f = fragmentos[i]; f.vida -= dt; f.x += f.vx * dt / 1000; f.y += f.vy * dt / 1000; f.vy += 480 * dt / 1000; f.vx *= Math.pow(.985, dt / 16); f.giro += f.vg * dt;
      if (f.vida <= 0) fragmentos.splice(i, 1);
    }
    for (let i = ondas.length - 1; i >= 0; i--) { ondas[i].vida -= dt; if (ondas[i].vida <= 0) ondas.splice(i, 1); }
  }

  function hud(): void {
    el('tetris-pontos').textContent = jogo.pontos.toLocaleString(); el('tetris-linhas').textContent = String(jogo.linhas);
    el('tetris-nivel').textContent = String(jogo.nivel); el('tetris-recorde').textContent = jogo.recorde.toLocaleString();
    combo.querySelector('b')!.textContent = jogo.combo > 0 ? `×${jogo.combo + 1}` : '—';
    combo.classList.toggle('activo', jogo.combo > 0);
  }

  function resultado(evento: EventoTetris): void {
    const { nome, terminou, nivelSubiu } = evento;
    desintegrar(evento.limpas);
    if (jogo.pontos > jogo.recorde) { jogo.recorde = jogo.pontos; try { localStorage.setItem(CHAVE_RECORDE, String(jogo.recorde)); } catch { /* sessão */ } }
    if (nome) { estado.textContent = nome; estado.classList.add('impacto'); mensagemAte = performance.now() + 1050; vibrar(nome === 'TETRIS' ? [18,25,18,25,45] : 14); }
    if (nivelSubiu) vibrar([12,20,12]);
    if (terminou) {
      overlay.querySelector('small')!.textContent = 'PARTIDA TERMINADA'; overlay.querySelector('h1')!.innerHTML = `${jogo.pontos.toLocaleString()}<br><em>pontos.</em>`;
      overlay.querySelector('p')!.textContent = `${jogo.linhas} linhas · nível ${jogo.nivel}`; iniciar.innerHTML = 'JOGAR OUTRA VEZ <span>↻</span>'; overlay.hidden = false;
    }
    hud();
  }

  function accao(tipo: string): void {
    if (jogo.estado === 'pronto') jogo.iniciar();
    let ok = false;
    if (tipo === 'left') ok = jogo.mover(-1, 0); else if (tipo === 'right') ok = jogo.mover(1, 0);
    else if (tipo === 'down') ok = jogo.mover(0, 1, true); else if (tipo === 'rotate') ok = jogo.rodar();
    else if (tipo === 'hold') ok = jogo.reservar(); else if (tipo === 'drop') { resultado(jogo.quedaTotal()); ok = true; }
    if (ok) vibrar(tipo === 'drop' ? 18 : 5);
    desenhar(); hud();
  }

  document.querySelectorAll<HTMLButtonElement>('[data-tetris]').forEach((b) => {
    let atraso = 0, repeticao = 0;
    const parar = () => { clearTimeout(atraso); clearInterval(repeticao); };
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); accao(b.dataset.tetris!); if (['left','right','down'].includes(b.dataset.tetris!)) atraso = window.setTimeout(() => { repeticao = window.setInterval(() => accao(b.dataset.tetris!), 58); }, 180); });
    ['pointerup','pointercancel','pointerleave'].forEach((nome) => b.addEventListener(nome, parar));
  });

  let toque: { x: number; y: number; t: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => { toque = { x: e.clientX, y: e.clientY, t: performance.now() }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', (e) => {
    if (!toque) return; const dx = e.clientX - toque.x, dy = e.clientY - toque.y, dt = performance.now() - toque.t; toque = null;
    if (Math.abs(dx) < 14 && Math.abs(dy) < 14) accao('rotate');
    else if (Math.abs(dx) > Math.abs(dy)) { const n = Math.max(1, Math.round(Math.abs(dx) / 28)); for (let i=0;i<n;i++) accao(dx > 0 ? 'right' : 'left'); }
    else if (dy > 65 && dt < 420) accao('drop'); else if (dy > 0) { const n = Math.max(1, Math.round(dy / 25)); for (let i=0;i<n;i++) accao('down'); } else accao('hold');
  });

  window.addEventListener('keydown', (e) => {
    if (!activo || e.repeat && !['ArrowLeft','ArrowRight','ArrowDown'].includes(e.code)) return;
    const mapa: Record<string,string> = { ArrowLeft:'left', ArrowRight:'right', ArrowDown:'down', ArrowUp:'rotate', KeyX:'rotate', Space:'drop', KeyC:'hold', ShiftLeft:'hold' };
    if (mapa[e.code]) { e.preventDefault(); accao(mapa[e.code]); }
  });
  iniciar.addEventListener('click', () => { if (jogo.estado === 'fim') jogo.reiniciar(); jogo.iniciar(); overlay.hidden = true; estado.textContent = 'NÍVEL 1'; hud(); desenhar(); });
  el('tetris-pausa').addEventListener('click', () => { jogo.pausa(); estado.textContent = jogo.estado === 'pausa' ? 'EM PAUSA' : `NÍVEL ${jogo.nivel}`; });
  el('tetris-menu').addEventListener('click', () => { jogo.estado = 'pausa'; aoMenu(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && activo && jogo.estado === 'jogar') jogo.pausa(); });

  function quadro(agora: number): void {
    const dt = Math.min(50, agora - ultimo); ultimo = agora;
    if (activo) {
      const r = jogo.actualizar(dt); if (r) resultado(r);
      actualizarEfeitos(dt);
      if (mensagemAte && agora > mensagemAte) { estado.textContent = jogo.estado === 'pausa' ? 'EM PAUSA' : `NÍVEL ${jogo.nivel}`; estado.classList.remove('impacto'); mensagemAte = 0; }
      desenhar();
    }
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro); hud(); desenhar();
  return {
    activar() { activo = true; raiz.hidden = false; ultimo = performance.now(); },
    desactivar() { activo = false; raiz.hidden = true; if (jogo.estado === 'jogar') jogo.pausa(); },
  };
}
