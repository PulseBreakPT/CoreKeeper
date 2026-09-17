/**
 * Fundo animado dos menus: Veyra a pulsar no escuro, poeira a cair e
 * anéis dos Architects a rodar devagar. É a primeira coisa que se vê.
 */

interface Estrela {
  x: number;
  y: number;
  r: number;
  brilho: number;
  fase: number;
}

interface Poeira {
  x: number;
  y: number;
  v: number;
  r: number;
}

export class FundoMenu {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private estrelas: Estrela[] = [];
  private poeiras: Poeira[] = [];
  private t = 0;
  private animando = false;
  private ultimo = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fundo-menu';
    this.ctx = this.canvas.getContext('2d')!;
    window.addEventListener('resize', () => this.redimensionar());
  }

  private redimensionar(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.estrelas = [];
    const n = Math.round((w * h) / 9000);
    for (let i = 0; i < n; i++) {
      this.estrelas.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.4 + Math.random() * 1.3,
        brilho: 0.2 + Math.random() * 0.7,
        fase: Math.random() * 6.3,
      });
    }
    this.poeiras = [];
    for (let i = 0; i < 60; i++) {
      this.poeiras.push({
        x: Math.random() * w,
        y: Math.random() * h,
        v: 4 + Math.random() * 16,
        r: 0.5 + Math.random() * 1.6,
      });
    }
  }

  iniciar(): void {
    if (this.animando) return;
    this.animando = true;
    this.redimensionar();
    this.ultimo = performance.now();
    requestAnimationFrame((t) => this.quadro(t));
  }

  parar(): void {
    this.animando = false;
  }

  private quadro(agora: number): void {
    if (!this.animando) return;
    const dt = Math.min(0.05, (agora - this.ultimo) / 1000);
    this.ultimo = agora;
    this.t += dt;
    this.desenhar(dt);
    requestAnimationFrame((t) => this.quadro(t));
  }

  private desenhar(dt: number): void {
    const c = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    // Deitado, Veyra fica atrás do painel e o halo transborda pelos lados;
    // de pé, sobe para não ficar escondida.
    const cy = w > h ? h * 0.5 : h * 0.17;

    c.fillStyle = '#040308';
    c.fillRect(0, 0, w, h);

    // Nebulosa de fundo.
    const neb = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.8);
    neb.addColorStop(0, 'rgba(60, 40, 90, 0.5)');
    neb.addColorStop(0.45, 'rgba(24, 16, 40, 0.35)');
    neb.addColorStop(1, 'rgba(4, 3, 8, 0)');
    c.fillStyle = neb;
    c.fillRect(0, 0, w, h);

    // Estrelas.
    for (const e of this.estrelas) {
      const tremor = 0.55 + Math.sin(this.t * 1.6 + e.fase) * 0.45;
      c.globalAlpha = e.brilho * tremor;
      c.fillStyle = '#dfe6ff';
      c.beginPath();
      c.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    // Veyra: núcleo dourado com halo a respirar.
    const pulso = 0.82 + Math.sin(this.t * 0.9) * 0.18;
    const raio = Math.min(w, h) * 0.17 * pulso;
    c.save();
    c.globalCompositeOperation = 'lighter';
    const halo = c.createRadialGradient(cx, cy, 0, cx, cy, raio * 3.2);
    halo.addColorStop(0, 'rgba(255, 244, 200, 0.85)');
    halo.addColorStop(0.18, 'rgba(242, 195, 51, 0.5)');
    halo.addColorStop(0.5, 'rgba(150, 90, 30, 0.16)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    c.fillStyle = halo;
    c.fillRect(cx - raio * 3.2, cy - raio * 3.2, raio * 6.4, raio * 6.4);

    c.fillStyle = 'rgba(255, 250, 225, 0.95)';
    c.beginPath();
    c.arc(cx, cy, raio * 0.42, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Anéis dos Architects, inclinados e a rodar em sentidos opostos.
    for (let i = 0; i < 3; i++) {
      const rr = raio * (1.5 + i * 0.55);
      c.save();
      c.translate(cx, cy);
      c.rotate(this.t * (0.12 + i * 0.05) * (i % 2 ? -1 : 1));
      c.strokeStyle = `rgba(200, 170, 255, ${0.16 - i * 0.035})`;
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(0, 0, rr, rr * 0.32, 0, 0, Math.PI * 2);
      c.stroke();
      // Glifos ao longo do anel.
      c.fillStyle = `rgba(242, 195, 51, ${0.5 - i * 0.12})`;
      for (let g = 0; g < 8; g++) {
        const a = (g / 8) * Math.PI * 2;
        c.fillRect(Math.cos(a) * rr - 1, Math.sin(a) * rr * 0.32 - 1, 2.5, 2.5);
      }
      c.restore();
    }

    // Poeira a cair, como numa caverna funda.
    c.fillStyle = 'rgba(210, 200, 255, 0.35)';
    for (const p of this.poeiras) {
      p.y += p.v * dt;
      p.x += Math.sin(this.t * 0.6 + p.y * 0.01) * 6 * dt;
      if (p.y > h) {
        p.y = -4;
        p.x = Math.random() * w;
      }
      c.beginPath();
      c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      c.fill();
    }

    // Vinheta.
    const vg = c.createRadialGradient(cx, cy, Math.min(w, h) * 0.25, cx, cy, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.78)');
    c.fillStyle = vg;
    c.fillRect(0, 0, w, h);
  }
}
