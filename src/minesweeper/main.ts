type Estado = 'pronto' | 'jogar' | 'venceu' | 'perdeu';
type Celula = { mina: boolean; aberta: boolean; bandeira: boolean; vizinhas: number };

const COLUNAS = 9, LINHAS = 12, MINAS = 18;
const CHAVE_RECORDE = 'nexus:minas:recorde:v1';

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id}`);
  return e as T;
}

class CampoMinado {
  grelha: Celula[][] = [];
  estado: Estado = 'pronto';
  inicio = 0;
  tempoFinal = 0;
  recorde = 0;
  abertas = 0;
  explosao: { x: number; y: number } | null = null;
  recentes: { x: number; y: number }[] = [];

  constructor() {
    try { this.recorde = Number(localStorage.getItem(CHAVE_RECORDE)) || 0; } catch { /* sessão */ }
    this.reiniciar();
  }

  reiniciar(): void {
    this.grelha = Array.from({ length: LINHAS }, () => Array.from({ length: COLUNAS }, () => ({ mina: false, aberta: false, bandeira: false, vizinhas: 0 })));
    this.estado = 'pronto'; this.inicio = 0; this.tempoFinal = 0; this.abertas = 0; this.explosao = null; this.recentes = [];
  }

  private dentro(x: number, y: number): boolean { return x >= 0 && x < COLUNAS && y >= 0 && y < LINHAS; }
  private redor(x: number, y: number): { x: number; y: number }[] {
    const pontos: { x: number; y: number }[] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && this.dentro(x + dx, y + dy)) pontos.push({ x: x + dx, y: y + dy });
    return pontos;
  }

  private gerar(seguroX: number, seguroY: number): void {
    const proibidas = new Set([`${seguroX},${seguroY}`, ...this.redor(seguroX, seguroY).map((p) => `${p.x},${p.y}`)]);
    const candidatas: { x: number; y: number }[] = [];
    for (let y = 0; y < LINHAS; y++) for (let x = 0; x < COLUNAS; x++) if (!proibidas.has(`${x},${y}`)) candidatas.push({ x, y });
    for (let i = candidatas.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [candidatas[i], candidatas[j]] = [candidatas[j], candidatas[i]]; }
    candidatas.slice(0, MINAS).forEach((p) => { this.grelha[p.y][p.x].mina = true; });
    for (let y = 0; y < LINHAS; y++) for (let x = 0; x < COLUNAS; x++) this.grelha[y][x].vizinhas = this.redor(x, y).filter((p) => this.grelha[p.y][p.x].mina).length;
    this.estado = 'jogar'; this.inicio = performance.now();
  }

  abrir(x: number, y: number): 'nada' | 'abriu' | 'explodiu' | 'venceu' {
    if (!this.dentro(x, y) || this.estado === 'perdeu' || this.estado === 'venceu') return 'nada';
    if (this.estado === 'pronto') this.gerar(x, y);
    const alvo = this.grelha[y][x];
    if (alvo.bandeira) return 'nada';
    if (alvo.aberta) {
      if (!alvo.vizinhas) return 'nada';
      const vizinhas = this.redor(x, y), marcadas = vizinhas.filter((p) => this.grelha[p.y][p.x].bandeira).length;
      if (marcadas !== alvo.vizinhas) return 'nada';
      for (const p of vizinhas) if (!this.grelha[p.y][p.x].aberta && !this.grelha[p.y][p.x].bandeira) {
        const r = this.abrirCelula(p.x, p.y); if (r === 'explodiu') return r;
      }
    } else {
      const r = this.abrirCelula(x, y); if (r === 'explodiu') return r;
    }
    if (this.abertas === COLUNAS * LINHAS - MINAS) {
      this.estado = 'venceu'; this.tempoFinal = this.tempo();
      for (const linha of this.grelha) for (const c of linha) if (c.mina) c.bandeira = true;
      if (!this.recorde || this.tempoFinal < this.recorde) { this.recorde = this.tempoFinal; try { localStorage.setItem(CHAVE_RECORDE, String(this.recorde)); } catch { /* sessão */ } }
      return 'venceu';
    }
    return 'abriu';
  }

  private abrirCelula(x: number, y: number): 'abriu' | 'explodiu' {
    const inicio = this.grelha[y][x];
    if (inicio.mina) {
      inicio.aberta = true; this.explosao = { x, y }; this.estado = 'perdeu'; this.tempoFinal = this.tempo();
      for (const linha of this.grelha) for (const c of linha) if (c.mina) c.aberta = true;
      return 'explodiu';
    }
    const fila = [{ x, y }], vistas = new Set<string>(); this.recentes = [];
    while (fila.length) {
      const p = fila.shift()!, chave = `${p.x},${p.y}`; if (vistas.has(chave)) continue; vistas.add(chave);
      const c = this.grelha[p.y][p.x]; if (c.aberta || c.bandeira || c.mina) continue;
      c.aberta = true; this.abertas++; this.recentes.push(p);
      if (!c.vizinhas) for (const q of this.redor(p.x, p.y)) fila.push(q);
    }
    return 'abriu';
  }

  bandeira(x: number, y: number): boolean {
    if (!this.dentro(x, y) || this.grelha[y][x].aberta || this.estado === 'venceu' || this.estado === 'perdeu') return false;
    this.grelha[y][x].bandeira = !this.grelha[y][x].bandeira; return true;
  }
  bandeiras(): number { return this.grelha.flat().filter((c) => c.bandeira).length; }
  tempo(): number { return this.estado === 'pronto' ? 0 : this.estado === 'jogar' ? Math.floor((performance.now() - this.inicio) / 1000) : this.tempoFinal; }
}

export function montarMinas(aoMenu: () => void): { activar(): void; desactivar(): void } {
  const raiz = el<HTMLElement>('jogo-minas'), canvas = el<HTMLCanvasElement>('canvas-minas'), ctx = canvas.getContext('2d')!;
  const overlay = el<HTMLElement>('overlay-minas'), iniciar = el<HTMLButtonElement>('iniciar-minas'), mensagem = el<HTMLElement>('mensagem-minas');
  const bandeira = el<HTMLButtonElement>('modo-bandeira'), jogo = new CampoMinado();
  let activo = false, modoBandeira = false, impacto = 0, ultimo = performance.now();

  function hud(): void {
    el('tempo-minas').textContent = `${jogo.tempo()}s`; el('minas-restantes').textContent = String(Math.max(0, MINAS - jogo.bandeiras()));
    el('abertas-minas').textContent = `${jogo.abertas}/${COLUNAS * LINHAS - MINAS}`; el('recorde-minas').textContent = jogo.recorde ? `${jogo.recorde}s` : '—';
    bandeira.classList.toggle('activo', modoBandeira); bandeira.setAttribute('aria-pressed', String(modoBandeira));
  }

  function desenhar(): void {
    const w = canvas.width, h = canvas.height, gap = 5, cel = Math.min((w - 24 - gap * (COLUNAS - 1)) / COLUNAS, (h - 24 - gap * (LINHAS - 1)) / LINHAS);
    const ox = (w - (cel * COLUNAS + gap * (COLUNAS - 1))) / 2, oy = (h - (cel * LINHAS + gap * (LINHAS - 1))) / 2;
    const fundo = ctx.createLinearGradient(0, 0, w, h); fundo.addColorStop(0, '#15181e'); fundo.addColorStop(1, '#060709'); ctx.fillStyle = fundo; ctx.fillRect(0, 0, w, h);
    const cores = ['#9298a3','#71bfff','#75e3a0','#ffe071','#ff9b67','#f27676','#df78ff','#a29bff','#fff'];
    for (let y = 0; y < LINHAS; y++) for (let x = 0; x < COLUNAS; x++) {
      const c = jogo.grelha[y][x], px = ox + x * (cel + gap), py = oy + y * (cel + gap);
      const recente = jogo.recentes.some((p) => p.x === x && p.y === y), escala = recente ? .94 + Math.min(1, impacto * 7) * .06 : 1;
      ctx.save(); ctx.translate(px + cel / 2, py + cel / 2); ctx.scale(escala, escala);
      ctx.beginPath(); ctx.roundRect(-cel / 2, -cel / 2, cel, cel, cel * .16);
      if (c.aberta) ctx.fillStyle = c.mina ? '#241014' : '#0b0e12';
      else ctx.fillStyle = c.bandeira ? '#1c1a13' : '#171b21';
      ctx.fill(); ctx.strokeStyle = c.aberta ? 'rgba(255,255,255,.055)' : c.bandeira ? 'rgba(255,215,105,.52)' : 'rgba(255,255,255,.13)'; ctx.lineWidth = c.bandeira ? 1.7 : 1; ctx.stroke();
      if (c.mina && c.aberta) {
        const explodiu = jogo.explosao?.x === x && jogo.explosao.y === y; ctx.shadowColor = explodiu ? '#ff5c62' : '#d67b52'; ctx.shadowBlur = explodiu ? 24 : 9;
        ctx.fillStyle = explodiu ? '#ff6b70' : '#9a5545'; ctx.beginPath();
        for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? cel * .15 : cel * .31; const sx = Math.cos(a) * r, sy = Math.sin(a) * r; i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }
        ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#17080b'; ctx.beginPath(); ctx.arc(0, 0, cel * .1, 0, Math.PI * 2); ctx.fill();
      } else if (c.bandeira) {
        ctx.fillStyle = '#ffd86a'; ctx.shadowColor = '#ffc63f'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(-cel*.13,-cel*.22); ctx.lineTo(cel*.22,-cel*.12); ctx.lineTo(-cel*.13,0); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
        ctx.strokeStyle='#e8c35f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-cel*.13,-cel*.22);ctx.lineTo(-cel*.13,cel*.22);ctx.moveTo(-cel*.25,cel*.22);ctx.lineTo(cel*.12,cel*.22);ctx.stroke();
      } else if (c.aberta && c.vizinhas) {
        ctx.fillStyle = cores[c.vizinhas]; ctx.shadowColor = cores[c.vizinhas]; ctx.shadowBlur = 8; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 ${cel * .46}px "Space Grotesk",sans-serif`; ctx.fillText(String(c.vizinhas), 0, 1); ctx.shadowBlur = 0;
      } else if (!c.aberta) {
        ctx.fillStyle='rgba(255,255,255,.18)';ctx.beginPath();ctx.arc(-cel*.2,-cel*.2,Math.max(1,cel*.035),0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }
  }

  function terminar(): void {
    const venceu = jogo.estado === 'venceu'; overlay.querySelector('small')!.textContent = venceu ? 'CAMPO LIMPO' : 'NÚCLEO DETONADO';
    overlay.querySelector('h1')!.innerHTML = venceu ? `${jogo.tempo()}s.<br><em>Perfeito.</em>` : 'Detonado.<br><em>Tenta outra vez.</em>';
    overlay.querySelector('p')!.textContent = venceu ? `${MINAS} minas neutralizadas` : `${jogo.abertas} zonas seguras abertas`;
    iniciar.innerHTML = 'NOVA PARTIDA <span>↻</span>'; overlay.hidden = false;
  }
  function agir(x: number, y: number, marcar = modoBandeira): void {
    if (marcar) { if (jogo.bandeira(x, y)) { navigator.vibrate?.(8); mensagem.textContent = jogo.grelha[y][x].bandeira ? 'BANDEIRA COLOCADA' : 'BANDEIRA REMOVIDA'; } }
    else { const r = jogo.abrir(x, y); if (r !== 'nada') { impacto = 0; navigator.vibrate?.(r === 'explodiu' ? [35,25,65] : r === 'venceu' ? [12,20,12,20,40] : 5); mensagem.textContent = r === 'abriu' ? 'ZONA SEGURA' : r === 'venceu' ? 'CAMPO LIMPO' : 'NÚCLEO DETONADO'; if (r === 'venceu' || r === 'explodiu') terminar(); } }
    hud(); desenhar();
  }
  function coordenada(e: PointerEvent): { x: number; y: number } {
    const r = canvas.getBoundingClientRect(), gap = 5;
    const px = (e.clientX - r.left) * canvas.width / r.width, py = (e.clientY - r.top) * canvas.height / r.height;
    const cel = Math.min((canvas.width - 24 - gap * (COLUNAS - 1)) / COLUNAS, (canvas.height - 24 - gap * (LINHAS - 1)) / LINHAS);
    const ox = (canvas.width - (cel * COLUNAS + gap * (COLUNAS - 1))) / 2;
    const oy = (canvas.height - (cel * LINHAS + gap * (LINHAS - 1))) / 2;
    return {
      x: Math.max(0, Math.min(COLUNAS - 1, Math.floor((px - ox + gap / 2) / (cel + gap)))),
      y: Math.max(0, Math.min(LINHAS - 1, Math.floor((py - oy + gap / 2) / (cel + gap))))
    };
  }
  let toque: { x: number; y: number; longo: number; marcou: boolean } | null = null;
  canvas.addEventListener('pointerdown', (e) => { const p = coordenada(e); toque = { ...p, marcou: false, longo: window.setTimeout(() => { if (!toque) return; toque.marcou = true; agir(toque.x, toque.y, true); }, 430) }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', (e) => { if (!toque) return; clearTimeout(toque.longo); const p = coordenada(e), marcou = toque.marcou; toque = null; if (!marcou) agir(p.x, p.y); });
  canvas.addEventListener('pointercancel', () => { if (toque) clearTimeout(toque.longo); toque = null; });
  bandeira.addEventListener('click', () => { modoBandeira = !modoBandeira; mensagem.textContent = modoBandeira ? 'MODO BANDEIRA' : 'MODO EXPLORAR'; hud(); navigator.vibrate?.(7); });
  el('novo-minas').addEventListener('click', () => { jogo.reiniciar(); modoBandeira = false; overlay.hidden = true; mensagem.textContent = 'NOVO CAMPO'; hud(); });
  el('menu-minas').addEventListener('click', aoMenu);
  iniciar.addEventListener('click', () => { if (jogo.estado === 'venceu' || jogo.estado === 'perdeu') jogo.reiniciar(); overlay.hidden = true; mensagem.textContent = 'PRIMEIRO TOQUE SEGURO'; hud(); });
  function quadro(agora: number): void { const dt = Math.min(50, agora - ultimo); ultimo = agora; if (activo) { impacto = Math.min(1, impacto + dt / 1000); hud(); desenhar(); } requestAnimationFrame(quadro); }
  requestAnimationFrame(quadro); hud(); desenhar();
  return { activar() { activo = true; raiz.hidden = false; ultimo = performance.now(); }, desactivar() { activo = false; raiz.hidden = true; } };
}
