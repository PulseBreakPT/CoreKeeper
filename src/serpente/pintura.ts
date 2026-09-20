/** Desenho da arena, da serpente e dos efeitos, em Canvas 2D. */

import { vetor, type Jogo, type Ponto } from './logica';

const COR_ARENA = '#0a0f1b';
const COR_ARENA_CLARA = '#0e1626';
const COR_GRELHA = 'rgba(146, 180, 255, 0.045)';
const COR_MOLDURA = 'rgba(124, 247, 196, 0.32)';
const COR_CORPO = '#0f7a5c';
const COR_CORPO_CLARO = '#2ed195';
const COR_CABECA = '#c9ffe8';
const COR_COMIDA = '#ffc46b';
const COR_COMIDA_BORDA = '#ff7a59';

interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  total: number;
  raio: number;
  cor: string;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Caminho de rectângulo arredondado, sem depender do `roundRect` do browser. */
function caminhoRedondo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  l: number,
  a: number,
  r: number,
): void {
  const raio = Math.min(r, l / 2, a / 2);
  ctx.beginPath();
  ctx.moveTo(x + raio, y);
  ctx.lineTo(x + l - raio, y);
  ctx.quadraticCurveTo(x + l, y, x + l, y + raio);
  ctx.lineTo(x + l, y + a - raio);
  ctx.quadraticCurveTo(x + l, y + a, x + l - raio, y + a);
  ctx.lineTo(x + raio, y + a);
  ctx.quadraticCurveTo(x, y + a, x, y + a - raio);
  ctx.lineTo(x, y + raio);
  ctx.quadraticCurveTo(x, y, x + raio, y);
  ctx.closePath();
}

export class Pintor {
  private readonly ctx: CanvasRenderingContext2D;
  private ladoCss = 0;
  /** Raio dos cantos da arena, partilhado com o CSS para as bordas baterem certo. */
  raio = 12;
  private particulas: Particula[] = [];
  private tremor = 0;
  private clarao = 0;
  /** Sobra de crescimento: faz a cabeça inchar por instantes depois de comer. */
  private incho = 0;
  private aneis: { x: number; y: number; vida: number; cor: string }[] = [];

  constructor(private readonly tela: HTMLCanvasElement) {
    const ctx = tela.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D indisponível');
    this.ctx = ctx;
  }

  /** Ajusta a tela a um quadrado de `ladoCss` píxeis CSS, com nitidez de retina. */
  redimensionar(ladoCss: number): void {
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    this.ladoCss = ladoCss;
    this.raio = Math.max(8, Math.round(ladoCss * 0.028));
    this.tela.style.width = `${ladoCss}px`;
    this.tela.style.height = `${ladoCss}px`;
    this.tela.width = Math.round(ladoCss * dpr);
    this.tela.height = Math.round(ladoCss * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Jacto curto de partículas na célula indicada. */
  explodir(p: Ponto, quantidade = 14): void {
    for (let i = 0; i < quantidade; i++) {
      const ang = (Math.PI * 2 * i) / quantidade + Math.random() * 0.4;
      const vel = 2.2 + Math.random() * 3.4;
      this.particulas.push({
        x: p.x + 0.5,
        y: p.y + 0.5,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel,
        vida: 0.42 + Math.random() * 0.22,
        total: 0.64,
        raio: 0.05 + Math.random() * 0.07,
        cor: i % 3 === 0 ? COR_COMIDA_BORDA : COR_COMIDA,
      });
    }
    this.aneis.push({ x: p.x + 0.5, y: p.y + 0.5, vida: 1, cor: COR_COMIDA });
    this.incho = 1;
  }

  /** Impacto de fim de partida. */
  impacto(p: Ponto): void {
    this.tremor = 1;
    this.clarao = 1;
    this.aneis.push({ x: p.x + 0.5, y: p.y + 0.5, vida: 1, cor: '#ff6b7a' });
    for (let i = 0; i < 18; i++) {
      const ang = Math.random() * Math.PI * 2;
      const vel = 1.5 + Math.random() * 4;
      this.particulas.push({
        x: p.x + 0.5,
        y: p.y + 0.5,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel,
        vida: 0.5 + Math.random() * 0.3,
        total: 0.8,
        raio: 0.04 + Math.random() * 0.06,
        cor: i % 2 === 0 ? '#ff6b7a' : '#ffd0a8',
      });
    }
  }

  /** Apaga tudo o que ficou de efeitos da partida anterior. */
  limpar(): void {
    this.particulas = [];
    this.aneis = [];
    this.tremor = 0;
    this.clarao = 0;
    this.incho = 0;
  }

  desenhar(jogo: Jogo, t: number, dt: number, tempo: number): void {
    const ctx = this.ctx;
    const L = this.ladoCss;
    if (L <= 0) return;
    const cel = L / jogo.lado;
    const s = dt / 1000;

    this.avancarEfeitos(s);

    ctx.save();
    if (this.tremor > 0.002) {
      const f = this.tremor * cel * 0.5;
      ctx.translate((Math.random() - 0.5) * f, (Math.random() - 0.5) * f);
    }

    this.fundo(L);
    this.arena(L, cel, jogo.lado);
    this.comida(jogo.comida, cel, tempo);
    this.serpente(jogo, t, cel, tempo);
    this.efeitos(cel);

    if (this.clarao > 0.002) {
      ctx.fillStyle = `rgba(255, 138, 150, ${this.clarao * 0.3})`;
      ctx.fillRect(0, 0, L, L);
    }
    ctx.restore();
  }

  private avancarEfeitos(s: number): void {
    this.tremor = Math.max(0, this.tremor - s * 3.4);
    this.clarao = Math.max(0, this.clarao - s * 4);
    this.incho = Math.max(0, this.incho - s * 5);
    for (const p of this.particulas) {
      p.x += p.vx * s;
      p.y += p.vy * s;
      p.vx *= 1 - Math.min(0.9, s * 3.2);
      p.vy = p.vy * (1 - Math.min(0.9, s * 3.2)) + s * 3.6;
      p.vida -= s;
    }
    this.particulas = this.particulas.filter((p) => p.vida > 0);
    for (const a of this.aneis) a.vida -= s * 2.6;
    this.aneis = this.aneis.filter((a) => a.vida > 0);
  }

  private fundo(L: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#070911';
    ctx.fillRect(0, 0, L, L);
  }

  private arena(L: number, cel: number, lado: number): void {
    const ctx = this.ctx;
    const r = this.raio;

    caminhoRedondo(ctx, 0, 0, L, L, r);
    const g = ctx.createLinearGradient(0, 0, L, L);
    g.addColorStop(0, COR_ARENA_CLARA);
    g.addColorStop(1, COR_ARENA);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.save();
    ctx.clip();

    // Xadrez muito ténue: dá noção de grelha sem competir com a serpente.
    ctx.fillStyle = 'rgba(146, 180, 255, 0.022)';
    for (let y = 0; y < lado; y++) {
      for (let x = (y % 2 === 0 ? 0 : 1); x < lado; x += 2) {
        ctx.fillRect(x * cel, y * cel, cel, cel);
      }
    }

    ctx.strokeStyle = COR_GRELHA;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < lado; i++) {
      const p = Math.round(i * cel) + 0.5;
      ctx.moveTo(p, 0);
      ctx.lineTo(p, L);
      ctx.moveTo(0, p);
      ctx.lineTo(L, p);
    }
    ctx.stroke();
    ctx.restore();

    caminhoRedondo(ctx, 1, 1, L - 2, L - 2, r);
    ctx.strokeStyle = COR_MOLDURA;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private comida(c: Ponto, cel: number, tempo: number): void {
    const ctx = this.ctx;
    const cx = (c.x + 0.5) * cel;
    const cy = (c.y + 0.5) * cel;
    const pulso = 0.5 + 0.5 * Math.sin(tempo / 260);
    const raio = cel * (0.3 + 0.035 * pulso);

    ctx.save();
    ctx.globalAlpha = 0.3 + 0.2 * pulso;
    ctx.strokeStyle = COR_COMIDA_BORDA;
    ctx.lineWidth = Math.max(1.2, cel * 0.07);
    ctx.beginPath();
    ctx.arc(cx, cy, cel * (0.38 + 0.07 * pulso), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = COR_COMIDA_BORDA;
    ctx.shadowBlur = cel * 0.7;
    const g = ctx.createRadialGradient(cx - raio * 0.3, cy - raio * 0.3, raio * 0.15, cx, cy, raio);
    g.addColorStop(0, '#fff2d6');
    g.addColorStop(0.55, COR_COMIDA);
    g.addColorStop(1, COR_COMIDA_BORDA);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, raio, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private serpente(jogo: Jogo, t: number, cel: number, tempo: number): void {
    const ctx = this.ctx;
    const corpo = jogo.corpo;
    const anterior = jogo.anterior;
    const pontos: { x: number; y: number }[] = corpo.map((p, i) => {
      const a = anterior[i] ?? p;
      return { x: (lerp(a.x, p.x, t) + 0.5) * cel, y: (lerp(a.y, p.y, t) + 0.5) * cel };
    });

    const cabeca = pontos[0];
    const cauda = pontos[pontos.length - 1];
    const g = ctx.createLinearGradient(cabeca.x, cabeca.y, cauda.x, cauda.y);
    g.addColorStop(0, COR_CORPO_CLARO);
    g.addColorStop(1, COR_CORPO);

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Halo: um traço largo e translúcido em vez de shadowBlur, que é caro no telemóvel.
    ctx.strokeStyle = 'rgba(46, 209, 149, 0.16)';
    ctx.lineWidth = cel * 1.04;
    this.traco(pontos);

    ctx.strokeStyle = g;
    ctx.lineWidth = cel * 0.74;
    this.traco(pontos);

    // Brilho superior, para o corpo não parecer chato.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
    ctx.lineWidth = cel * 0.26;
    ctx.save();
    ctx.translate(0, -cel * 0.12);
    this.traco(pontos);
    ctx.restore();
    ctx.restore();

    this.cabeca(cabeca, jogo, cel, tempo);
  }

  private traco(pontos: { x: number; y: number }[]): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(pontos[0].x, pontos[0].y);
    for (let i = 1; i < pontos.length; i++) ctx.lineTo(pontos[i].x, pontos[i].y);
    if (pontos.length === 1) ctx.lineTo(pontos[0].x + 0.01, pontos[0].y);
    ctx.stroke();
  }

  private cabeca(p: { x: number; y: number }, jogo: Jogo, cel: number, tempo: number): void {
    const ctx = this.ctx;
    const v = vetor(jogo.direcao);
    const escala = 1 + this.incho * 0.18;
    const l = cel * 0.96 * escala;

    ctx.save();
    ctx.translate(p.x, p.y);
    // Rebordo escuro primeiro: separa a cabeça do corpo mesmo a alta velocidade.
    caminhoRedondo(ctx, -l / 2, -l / 2, l, l, l * 0.34);
    ctx.fillStyle = 'rgba(3, 28, 21, 0.85)';
    ctx.fill();
    const m = l - Math.max(2, cel * 0.1);
    caminhoRedondo(ctx, -m / 2, -m / 2, m, m, m * 0.32);
    const brilho = ctx.createLinearGradient(0, -m / 2, 0, m / 2);
    brilho.addColorStop(0, '#ffffff');
    brilho.addColorStop(0.45, COR_CABECA);
    brilho.addColorStop(1, '#6ff0bd');
    ctx.fillStyle = brilho;
    ctx.fill();

    // Olhos virados para a frente, com pupila deslocada no sentido da marcha.
    const vivo = jogo.estado !== 'morto';
    const perp = { x: -v.y, y: v.x };
    const dOlho = cel * 0.2;
    const frente = cel * 0.16;
    const raioOlho = cel * 0.13;
    const piscar = vivo && Math.sin(tempo / 1400) > 0.985 ? 0.25 : 1;
    for (const s of [-1, 1]) {
      const ox = v.x * frente + perp.x * dOlho * s;
      const oy = v.y * frente + perp.y * dOlho * s;
      ctx.fillStyle = '#07231a';
      ctx.beginPath();
      ctx.ellipse(ox, oy, raioOlho, raioOlho * piscar, 0, 0, Math.PI * 2);
      ctx.fill();
      if (vivo && piscar > 0.5) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ox + v.x * raioOlho * 0.35, oy + v.y * raioOlho * 0.35, raioOlho * 0.36, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (!vivo) {
      // Cruz nos olhos: leitura imediata de que a partida acabou.
      ctx.strokeStyle = '#07231a';
      ctx.lineWidth = Math.max(1.4, cel * 0.07);
      for (const s of [-1, 1]) {
        const ox = v.x * frente + perp.x * dOlho * s;
        const oy = v.y * frente + perp.y * dOlho * s;
        ctx.beginPath();
        ctx.moveTo(ox - raioOlho, oy - raioOlho);
        ctx.lineTo(ox + raioOlho, oy + raioOlho);
        ctx.moveTo(ox + raioOlho, oy - raioOlho);
        ctx.lineTo(ox - raioOlho, oy + raioOlho);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private efeitos(cel: number): void {
    const ctx = this.ctx;
    for (const a of this.aneis) {
      const p = 1 - a.vida;
      ctx.save();
      ctx.globalAlpha = a.vida * 0.55;
      ctx.strokeStyle = a.cor;
      ctx.lineWidth = Math.max(1, cel * 0.12 * a.vida);
      ctx.beginPath();
      ctx.arc(a.x * cel, a.y * cel, cel * (0.3 + p * 1.4), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    for (const p of this.particulas) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.vida / p.total));
      ctx.fillStyle = p.cor;
      ctx.beginPath();
      ctx.arc(p.x * cel, p.y * cel, p.raio * cel, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
