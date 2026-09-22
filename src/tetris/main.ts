import { Tetris, blocos, COLUNAS, LINHAS, OCULTAS, type EventoTetris, type Peca, type TipoPeca } from './logica';

const CORES: Record<TipoPeca, number> = { I: 188, O: 48, T: 282, S: 112, Z: 350, J: 220, L: 25 };
const CHAVE_RECORDE = 'nexus:tetris:recorde:v1';

function el<T extends HTMLElement>(id: string): T { const e = document.getElementById(id); if (!e) throw new Error(`#${id}`); return e as T; }
function vibrar(p: number | number[]): void { if ('vibrate' in navigator) navigator.vibrate(p); }

export function montarTetris(aoMenu: () => void, aoResultado: (xp: number, moedas: number) => void): { activar(): void; desactivar(): void } {
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
  const impactos: { y: number; vida: number; total: number; matiz: number }[] = [];
  try { jogo.recorde = Number(localStorage.getItem(CHAVE_RECORDE)) || 0; } catch { /* sessão */ }

  function matizTema(): number { return Number(getComputedStyle(document.documentElement).getPropertyValue('--tema')) || 188; }

  function bloco(c: CanvasRenderingContext2D, x: number, y: number, tamanho: number, tipo: TipoPeca, alpha = 1, fantasma = false): void {
    const h = CORES[tipo], m = Math.max(1.5, tamanho * .07), raio = tamanho * .13;
    c.save(); c.globalAlpha = alpha;
    const px = x * tamanho + m, py = y * tamanho + m, lado = tamanho - m * 2;
    c.beginPath(); c.roundRect(px, py, lado, lado, raio);
    if (fantasma) {
      c.fillStyle = `hsl(${h} 85% 60% / .07)`; c.fill(); c.setLineDash([tamanho * .16, tamanho * .1]);
      c.strokeStyle = `hsl(${h} 95% 72%)`; c.lineWidth = Math.max(1.5, tamanho * .065); c.stroke(); c.setLineDash([]);
    }
    else {
      const g = c.createLinearGradient(px, py, px + lado, py + lado);
      g.addColorStop(0, `hsl(${h} 100% 88%)`); g.addColorStop(.22, `hsl(${h} 92% 68%)`); g.addColorStop(.68, `hsl(${h} 82% 46%)`); g.addColorStop(1, `hsl(${h} 72% 24%)`);
      c.fillStyle = g; c.shadowColor = `hsl(${h} 100% 62% / .5)`; c.shadowBlur = tamanho * .42; c.fill();
      c.shadowBlur = 0; c.strokeStyle = `hsl(${h} 100% 94% / .72)`; c.lineWidth = 1; c.stroke();
      const interno = tamanho * .17;
      c.beginPath(); c.roundRect(px + interno, py + interno, lado - interno * 2, lado - interno * 2, raio * .55);
      const miolo = c.createLinearGradient(px + interno, py + interno, px + lado - interno, py + lado - interno);
      miolo.addColorStop(0, `hsl(${h} 96% 86% / .2)`); miolo.addColorStop(1, `hsl(${h} 55% 8% / .3)`);
      c.fillStyle = miolo; c.fill(); c.strokeStyle = `hsl(${h} 100% 94% / .24)`; c.lineWidth = .75; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.34)'; c.lineWidth = Math.max(.7, tamanho * .025); c.beginPath();
      c.moveTo(px + lado * .18, py + lado * .12); c.lineTo(px + lado * .72, py + lado * .12); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.62)'; c.beginPath(); c.arc(px + lado * .25, py + lado * .23, Math.max(.8, lado * .045), 0, Math.PI * 2); c.fill();
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
    const tamanho = canvas.width / COLUNAS, tema = matizTema(), agora = performance.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fundo = ctx.createLinearGradient(0, 0, 0, canvas.height);
    fundo.addColorStop(0, '#111419'); fundo.addColorStop(1, '#07080a'); ctx.fillStyle = fundo; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const aura = ctx.createRadialGradient(canvas.width * .5, canvas.height * .78, 0, canvas.width * .5, canvas.height * .78, canvas.width * .8);
    aura.addColorStop(0, `hsl(${tema} 90% 58% / .055)`); aura.addColorStop(1, `hsl(${tema} 90% 40% / 0)`); ctx.fillStyle = aura; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const feixe = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    feixe.addColorStop(0, 'rgba(255,255,255,.018)'); feixe.addColorStop(.28, 'rgba(255,255,255,0)'); feixe.addColorStop(.72, 'rgba(255,255,255,.012)'); feixe.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = feixe; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (jogo.estado !== 'fim') {
      const activos = blocos(jogo.peca).filter((b) => b.y >= OCULTAS);
      if (activos.length) {
        const minX = Math.min(...activos.map((b) => b.x)), maxX = Math.max(...activos.map((b) => b.x));
        const x0 = minX * tamanho, largura = (maxX - minX + 1) * tamanho;
        const corredor = ctx.createLinearGradient(x0, 0, x0 + largura, 0);
        corredor.addColorStop(0, 'rgba(255,255,255,0)');
        corredor.addColorStop(.5, `hsl(${CORES[jogo.peca.tipo]} 95% 68% / .035)`);
        corredor.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = corredor; ctx.fillRect(x0, 0, largura, canvas.height);
      }
    }
    ctx.strokeStyle = `hsl(${tema} 30% 45% / .075)`; ctx.lineWidth = 1;
    for (let x = 1; x < COLUNAS; x++) { ctx.beginPath(); ctx.moveTo(x * tamanho, 0); ctx.lineTo(x * tamanho, canvas.height); ctx.stroke(); }
    for (let y = 1; y < LINHAS - OCULTAS; y++) { ctx.beginPath(); ctx.moveTo(0, y * tamanho); ctx.lineTo(canvas.width, y * tamanho); ctx.stroke(); }
    ctx.fillStyle = `hsl(${tema} 92% 74% / .19)`;
    for (let y = 1; y < LINHAS - OCULTAS; y += 4) for (let x = 1; x < COLUNAS; x += 2) {
      ctx.beginPath(); ctx.arc(x * tamanho, y * tamanho, .65, 0, Math.PI * 2); ctx.fill();
    }
    // Zona superior de risco e scanline dão leitura imediata à altura da pilha.
    const perigo = ctx.createLinearGradient(0, 0, 0, tamanho * 4); perigo.addColorStop(0, 'rgba(255,72,91,.12)'); perigo.addColorStop(1, 'rgba(255,72,91,0)'); ctx.fillStyle = perigo; ctx.fillRect(0, 0, canvas.width, tamanho * 4);
    ctx.strokeStyle = 'rgba(255,105,119,.28)'; ctx.setLineDash([5, 7]); ctx.beginPath(); ctx.moveTo(0, tamanho * 3); ctx.lineTo(canvas.width, tamanho * 3); ctx.stroke(); ctx.setLineDash([]);
    const projecao = jogo.grelha.map((linha) => linha.map(Boolean));
    if (jogo.estado !== 'fim') for (const b of blocos(jogo.fantasma())) if (b.y >= 0 && b.y < LINHAS) projecao[b.y][b.x] = true;
    const linhasPrevistas = projecao.map((linha, y) => linha.every(Boolean) ? y - OCULTAS : -1).filter((y) => y >= 0);
    arena.classList.toggle('linha-pronta', linhasPrevistas.length > 0);
    for (const y of linhasPrevistas) {
      const pulso = .42 + Math.sin(agora * .012) * .16, py = y * tamanho;
      const clarao = ctx.createLinearGradient(0, py, canvas.width, py + tamanho);
      clarao.addColorStop(0, 'rgba(255,211,55,.08)'); clarao.addColorStop(.5, `rgba(255,238,145,${pulso})`); clarao.addColorStop(1, 'rgba(255,211,55,.08)');
      ctx.fillStyle = clarao; ctx.shadowColor = '#ffd43b'; ctx.shadowBlur = 18; ctx.fillRect(0, py + 1, canvas.width, tamanho - 2); ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff4b0'; ctx.fillRect(0, py, canvas.width, 1.5); ctx.fillRect(0, py + tamanho - 1.5, canvas.width, 1.5);
    }
    jogo.grelha.slice(OCULTAS).forEach((linha, y) => linha.forEach((tipo, x) => { if (tipo) bloco(ctx, x, y, tamanho, tipo); }));
    if (jogo.estado !== 'fim') {
      blocos(jogo.fantasma()).forEach((b) => { if (b.y >= OCULTAS) bloco(ctx, b.x, b.y - OCULTAS, tamanho, jogo.peca.tipo, .42, true); });
      blocos(jogo.peca).forEach((b) => { if (b.y >= OCULTAS) bloco(ctx, b.x, b.y - OCULTAS, tamanho, jogo.peca.tipo); });
    }
    for (const y of linhasPrevistas) {
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.strokeStyle = `rgba(255,235,128,${.65 + Math.sin(agora * .012) * .2})`; ctx.lineWidth = 2;
      ctx.shadowColor = '#ffd43b'; ctx.shadowBlur = 16; ctx.strokeRect(1, y * tamanho + 2, canvas.width - 2, tamanho - 4); ctx.restore();
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
    for (const impacto of impactos) {
      const p = 1 - impacto.vida / impacto.total, a = Math.max(0, 1 - p);
      ctx.globalAlpha = a; ctx.strokeStyle = `hsl(${impacto.matiz} 100% 76%)`; ctx.lineWidth = 2.2 * a;
      ctx.beginPath(); ctx.ellipse(canvas.width / 2, impacto.y, canvas.width * (.08 + p * .48), tamanho * (.16 + p * .38), 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    const scanY = (agora * .055) % (canvas.height + 70) - 35;
    const scan = ctx.createLinearGradient(0, scanY - 28, 0, scanY + 28); scan.addColorStop(0, 'rgba(255,255,255,0)'); scan.addColorStop(.5, `hsl(${tema} 100% 80% / .055)`); scan.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = scan; ctx.fillRect(0, scanY - 28, canvas.width, 56);
    const horizonte = (agora * .018) % canvas.height;
    ctx.strokeStyle = `hsl(${tema} 92% 76% / .08)`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, horizonte); ctx.lineTo(canvas.width, horizonte); ctx.stroke();
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
    for (let i = impactos.length - 1; i >= 0; i--) { impactos[i].vida -= dt; if (impactos[i].vida <= 0) impactos.splice(i, 1); }
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
      aoResultado(Math.round(jogo.pontos / 30) + jogo.linhas * 2, Math.round(jogo.pontos / 200) + 1);
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
    else if (tipo === 'hold') ok = jogo.reservar(); else if (tipo === 'drop') {
      const fantasma = jogo.fantasma(), fundo = Math.max(...blocos(fantasma).map((b) => b.y - OCULTAS + 1));
      impactos.push({ y: fundo * (canvas.width / COLUNAS), vida: 360, total: 360, matiz: CORES[jogo.peca.tipo] });
      resultado(jogo.quedaTotal()); ok = true;
    }
    if (ok) vibrar(tipo === 'drop' ? 18 : 5);
    desenhar(); hud();
  }

  document.querySelectorAll<HTMLButtonElement>('[data-tetris]').forEach((b) => {
    let atraso = 0, repeticao = 0;
    const parar = () => { clearTimeout(atraso); clearInterval(repeticao); };
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); accao(b.dataset.tetris!); if (['left','right','down'].includes(b.dataset.tetris!)) atraso = window.setTimeout(() => { repeticao = window.setInterval(() => accao(b.dataset.tetris!), 85); }, 220); });
    ['pointerup','pointercancel','pointerleave'].forEach((nome) => b.addEventListener(nome, parar));
  });

  let toque: { x: number; y: number; t: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => { toque = { x: e.clientX, y: e.clientY, t: performance.now() }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', (e) => {
    if (!toque) return; const dx = e.clientX - toque.x, dy = e.clientY - toque.y, dt = performance.now() - toque.t; toque = null;
    if (Math.abs(dx) < 14 && Math.abs(dy) < 14) accao('rotate');
    else if (Math.abs(dx) > Math.abs(dy)) { const n = Math.max(1, Math.round(Math.abs(dx) / 34)); for (let i=0;i<n;i++) accao(dx > 0 ? 'right' : 'left'); }
    else if (dy > 90 && dt < 480) accao('drop'); else if (dy > 0) { const n = Math.max(1, Math.round(dy / 32)); for (let i=0;i<n;i++) accao('down'); } else accao('hold');
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
