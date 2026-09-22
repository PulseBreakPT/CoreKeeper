type Direcao2048 = 'cima' | 'baixo' | 'esquerda' | 'direita';
type Grelha = number[][];
type Movimento = { mudou: boolean; pontos: number; fundidas: { x: number; y: number }[] };

const CHAVE_RECORDE = 'nexus:2048:recorde:v1';
const TAMANHO = 4;

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id}`);
  return e as T;
}

class Jogo2048 {
  grelha: Grelha = [];
  pontos = 0;
  recorde = 0;
  movimentos = 0;
  estado: 'pronto' | 'jogar' | 'ganhou' | 'fim' = 'pronto';
  novas: { x: number; y: number }[] = [];
  fundidas: { x: number; y: number }[] = [];
  private anterior: { grelha: Grelha; pontos: number; movimentos: number; estado: Jogo2048['estado'] } | null = null;

  constructor() {
    try { this.recorde = Number(localStorage.getItem(CHAVE_RECORDE)) || 0; } catch { /* sessão */ }
    this.reiniciar();
  }

  reiniciar(): void {
    this.grelha = Array.from({ length: TAMANHO }, () => Array<number>(TAMANHO).fill(0));
    this.pontos = 0; this.movimentos = 0; this.estado = 'pronto'; this.anterior = null; this.fundidas = [];
    this.novas = []; this.adicionar(); this.adicionar();
  }

  private adicionar(): void {
    const vazias: { x: number; y: number }[] = [];
    for (let y = 0; y < TAMANHO; y++) for (let x = 0; x < TAMANHO; x++) if (!this.grelha[y][x]) vazias.push({ x, y });
    if (!vazias.length) return;
    const p = vazias[Math.floor(Math.random() * vazias.length)];
    this.grelha[p.y][p.x] = Math.random() < .9 ? 2 : 4;
    this.novas = [p];
  }

  private linha(valores: number[]): { valores: number[]; pontos: number; indices: number[] } {
    const compacta = valores.filter(Boolean), saida: number[] = [], indices: number[] = [];
    let pontos = 0;
    for (let i = 0; i < compacta.length; i++) {
      if (compacta[i] === compacta[i + 1]) {
        const valor = compacta[i] * 2; saida.push(valor); pontos += valor; indices.push(saida.length - 1); i++;
      } else saida.push(compacta[i]);
    }
    while (saida.length < TAMANHO) saida.push(0);
    return { valores: saida, pontos, indices };
  }

  mover(direcao: Direcao2048): Movimento {
    if (this.estado === 'fim') return { mudou: false, pontos: 0, fundidas: [] };
    const antes = this.grelha.map((l) => [...l]);
    const pontosAntes = this.pontos, movimentosAntes = this.movimentos, estadoAntes = this.estado;
    let ganho = 0; const fundidas: { x: number; y: number }[] = [];
    for (let i = 0; i < TAMANHO; i++) {
      const horizontal = direcao === 'esquerda' || direcao === 'direita';
      const inversa = direcao === 'direita' || direcao === 'baixo';
      let valores = Array.from({ length: TAMANHO }, (_, j) => horizontal ? this.grelha[i][j] : this.grelha[j][i]);
      if (inversa) valores.reverse();
      const r = this.linha(valores); ganho += r.pontos;
      if (inversa) r.valores.reverse();
      for (let j = 0; j < TAMANHO; j++) {
        if (horizontal) this.grelha[i][j] = r.valores[j]; else this.grelha[j][i] = r.valores[j];
      }
      for (const indice of r.indices) {
        const j = inversa ? TAMANHO - 1 - indice : indice;
        fundidas.push(horizontal ? { x: j, y: i } : { x: i, y: j });
      }
    }
    const mudou = antes.some((linha, y) => linha.some((v, x) => v !== this.grelha[y][x]));
    if (!mudou) return { mudou: false, pontos: 0, fundidas: [] };
    this.anterior = { grelha: antes, pontos: pontosAntes, movimentos: movimentosAntes, estado: estadoAntes };
    this.pontos += ganho; this.movimentos++; this.fundidas = fundidas; this.adicionar();
    if (this.pontos > this.recorde) {
      this.recorde = this.pontos;
      try { localStorage.setItem(CHAVE_RECORDE, String(this.recorde)); } catch { /* sessão */ }
    }
    if (this.maior() >= 2048 && this.estado !== 'ganhou') this.estado = 'ganhou';
    else this.estado = this.temJogada() ? 'jogar' : 'fim';
    return { mudou: true, pontos: ganho, fundidas };
  }

  desfazer(): boolean {
    if (!this.anterior) return false;
    this.grelha = this.anterior.grelha.map((l) => [...l]); this.pontos = this.anterior.pontos;
    this.movimentos = this.anterior.movimentos; this.estado = this.anterior.estado; this.anterior = null;
    this.novas = []; this.fundidas = []; return true;
  }

  maior(): number { return Math.max(...this.grelha.flat()); }
  private temJogada(): boolean {
    if (this.grelha.flat().some((v) => !v)) return true;
    for (let y = 0; y < TAMANHO; y++) for (let x = 0; x < TAMANHO; x++) {
      if (x + 1 < TAMANHO && this.grelha[y][x] === this.grelha[y][x + 1]) return true;
      if (y + 1 < TAMANHO && this.grelha[y][x] === this.grelha[y + 1][x]) return true;
    }
    return false;
  }
}

export function montar2048(aoMenu: () => void): { activar(): void; desactivar(): void } {
  const raiz = el<HTMLElement>('jogo-2048'), canvas = el<HTMLCanvasElement>('canvas-2048'), ctx = canvas.getContext('2d')!;
  const overlay = el<HTMLElement>('overlay-2048'), iniciar = el<HTMLButtonElement>('iniciar-2048'), mensagem = el<HTMLElement>('mensagem-2048');
  const jogo = new Jogo2048(); let activo = false, tempo = 0, pulso = 0;
  const tons = [188, 112, 48, 25, 350, 330, 282, 220, 168, 42, 55];
  type Particula = { x: number; y: number; vx: number; vy: number; vida: number; total: number; raio: number; matiz: number };
  const particulas: Particula[] = [];

  function hud(): void {
    el('pontos-2048').textContent = jogo.pontos.toLocaleString(); el('recorde-2048').textContent = jogo.recorde.toLocaleString();
    el('maior-2048').textContent = String(jogo.maior()); el('movimentos-2048').textContent = String(jogo.movimentos);
  }

  function desenhar(): void {
    const w = canvas.width, margem = 24, gap = 13, cel = (w - margem * 2 - gap * 3) / 4;
    const fundo = ctx.createRadialGradient(w * .42, w * .36, 10, w * .5, w * .5, w * .72);
    fundo.addColorStop(0, '#171a20'); fundo.addColorStop(1, '#07080a'); ctx.fillStyle = fundo; ctx.fillRect(0, 0, w, w);
    ctx.strokeStyle = 'rgba(255,225,145,.035)'; ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(w / 2, w / 2, 60 + i * 42, 0, Math.PI * 2); ctx.stroke(); }
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const px = margem + x * (cel + gap), py = margem + y * (cel + gap), valor = jogo.grelha[y][x];
      ctx.beginPath(); ctx.roundRect(px, py, cel, cel, cel * .16);
      ctx.fillStyle = valor ? '#14171c' : 'rgba(255,255,255,.025)'; ctx.fill();
      ctx.strokeStyle = valor ? 'rgba(255,225,145,.22)' : 'rgba(255,255,255,.07)'; ctx.lineWidth = valor ? 2 : 1; ctx.stroke();
      if (!valor) continue;
      const nivel = Math.min(tons.length - 1, Math.log2(valor) - 1), h = tons[nivel];
      const nasceu = jogo.novas.some((p) => p.x === x && p.y === y), fundiu = jogo.fundidas.some((p) => p.x === x && p.y === y);
      const escala = nasceu ? .9 + Math.min(1, pulso * 5) * .1 : fundiu ? 1 + Math.sin(Math.min(1, pulso * 5) * Math.PI) * .08 : 1;
      ctx.save(); ctx.translate(px + cel / 2, py + cel / 2); ctx.scale(escala, escala);
      const g = ctx.createLinearGradient(-cel / 2, -cel / 2, cel / 2, cel / 2);
      g.addColorStop(0, `hsl(${h} 90% ${Math.max(54, 84 - nivel * 2)}%)`); g.addColorStop(.5, `hsl(${h} 78% ${Math.max(38, 66 - nivel * 3)}%)`); g.addColorStop(1, `hsl(${h} 66% ${Math.max(20, 39 - nivel * 2)}%)`);
      ctx.shadowColor = `hsl(${h} 95% 62% / .38)`; ctx.shadowBlur = fundiu ? 28 : 14; ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(-cel / 2, -cel / 2, cel, cel, cel * .16); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.lineWidth = 1.2; ctx.stroke();
      if (nasceu) {
        ctx.strokeStyle = 'rgba(120,235,255,.95)'; ctx.lineWidth = 3; ctx.shadowColor = '#62e7ff'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.roundRect(-cel / 2 + 3, -cel / 2 + 3, cel - 6, cel - 6, cel * .14); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#c7f8ff'; ctx.font = `700 ${Math.max(10, cel * .085)}px "Space Grotesk",sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('NOVO', cel * .39, -cel * .39);
      }
      ctx.fillStyle = nivel > 5 ? '#fff' : '#17140d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `700 ${valor >= 1024 ? cel * .28 : valor >= 128 ? cel * .34 : cel * .42}px "Space Grotesk", sans-serif`;
      ctx.fillText(String(valor), 0, 2); ctx.restore();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of particulas) {
      const a = Math.max(0, p.vida / p.total); ctx.globalAlpha = a; ctx.fillStyle = `hsl(${p.matiz} 98% 70%)`; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12 * a;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.raio * (.65 + a * .6), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function mover(d: Direcao2048): void {
    const r = jogo.mover(d); if (!r.mudou) { mensagem.textContent = 'SEM MOVIMENTO'; navigator.vibrate?.(4); return; }
    pulso = 0;
    if (r.fundidas.length) {
      const w = canvas.width, margem = 24, gap = 13, cel = (w - margem * 2 - gap * 3) / 4;
      for (const f of r.fundidas) {
        const valor = jogo.grelha[f.y][f.x], matiz = tons[Math.min(tons.length - 1, Math.log2(Math.max(2, valor)) - 1)];
        const cx = margem + f.x * (cel + gap) + cel / 2, cy = margem + f.y * (cel + gap) + cel / 2;
        for (let i = 0; i < 22; i++) {
          const a = Math.PI * 2 * i / 22 + Math.random() * .18, v = 80 + Math.random() * 190;
          particulas.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 420 + Math.random() * 330, total: 750, raio: 2.4 + Math.random() * 5, matiz });
        }
      }
    }
    mensagem.textContent = r.pontos ? `FUSÃO +${r.pontos}` : `${jogo.movimentos} MOVIMENTOS`; navigator.vibrate?.(r.pontos ? [7, 12, 18] : 5); hud();
    if (jogo.estado === 'ganhou' || jogo.estado === 'fim') {
      overlay.querySelector('small')!.textContent = jogo.estado === 'ganhou' ? 'NÚCLEO 2048' : 'SEM MOVIMENTOS';
      overlay.querySelector('h1')!.innerHTML = jogo.estado === 'ganhou' ? '2048.<br><em>Conquistado.</em>' : `${jogo.pontos.toLocaleString()}<br><em>pontos.</em>`;
      overlay.querySelector('p')!.textContent = `${jogo.movimentos} movimentos · máximo ${jogo.maior()}`;
      iniciar.innerHTML = 'NOVA PARTIDA <span>↻</span>'; overlay.hidden = false;
    }
  }

  document.querySelectorAll<HTMLButtonElement>('[data-2048]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); mover(b.dataset['2048'] as Direcao2048); }));
  let toque: { x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => { toque = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', (e) => { if (!toque) return; const dx = e.clientX - toque.x, dy = e.clientY - toque.y; toque = null; if (Math.hypot(dx, dy) < 18) return; mover(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'direita' : 'esquerda' : dy > 0 ? 'baixo' : 'cima'); });
  window.addEventListener('keydown', (e) => { if (!activo) return; const mapa: Record<string, Direcao2048> = { ArrowUp: 'cima', ArrowDown: 'baixo', ArrowLeft: 'esquerda', ArrowRight: 'direita' }; if (mapa[e.code]) { e.preventDefault(); mover(mapa[e.code]); } });
  el('desfazer-2048').addEventListener('click', () => { if (jogo.desfazer()) { mensagem.textContent = 'MOVIMENTO DESFEITO'; hud(); navigator.vibrate?.(7); } });
  el('reiniciar-2048').addEventListener('click', () => { jogo.reiniciar(); overlay.hidden = true; mensagem.textContent = 'NOVA MATRIZ'; hud(); });
  el('menu-2048').addEventListener('click', aoMenu);
  iniciar.addEventListener('click', () => { if (jogo.estado === 'ganhou' || jogo.estado === 'fim') jogo.reiniciar(); jogo.estado = 'jogar'; overlay.hidden = true; mensagem.textContent = 'DESLIZA PARA FUNDIR'; hud(); });
  function quadro(agora: number): void {
    const dt = Math.min(40, agora - tempo);
    if (activo) {
      pulso = Math.min(1, pulso + dt / 1000);
      for (let i = particulas.length - 1; i >= 0; i--) { const p = particulas[i]; p.vida -= dt; p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000; p.vx *= Math.pow(.975, dt / 16); p.vy *= Math.pow(.975, dt / 16); if (p.vida <= 0) particulas.splice(i, 1); }
      desenhar();
    }
    tempo = agora; requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro); hud(); desenhar();
  return { activar() { activo = true; raiz.hidden = false; tempo = performance.now(); }, desactivar() { activo = false; raiz.hidden = true; } };
}
