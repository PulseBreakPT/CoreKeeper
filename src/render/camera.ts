/** Câmara que segue o jogador, com zoom adaptado ao tamanho do ecrã e tremores. */

export class Camera {
  x = 0;
  y = 0;
  /** Píxeis por tile. */
  zoom = 48;
  larguraPx = 0;
  alturaPx = 0;
  private abanaoForca = 0;
  private abanaoT = 0;
  offX = 0;
  offY = 0;

  redimensionar(larguraPx: number, alturaPx: number): void {
    this.larguraPx = larguraPx;
    this.alturaPx = alturaPx;
    // Num telemóvel queremos ver ~13 tiles na menor dimensão.
    const menor = Math.min(larguraPx, alturaPx);
    this.zoom = Math.max(28, Math.round(menor / 13));
  }

  seguir(alvoX: number, alvoY: number, dt: number, imediato = false): void {
    if (imediato) {
      this.x = alvoX;
      this.y = alvoY;
      return;
    }
    const k = Math.min(1, dt * 7.5);
    this.x += (alvoX - this.x) * k;
    this.y += (alvoY - this.y) * k;
  }

  abanar(forca: number): void {
    this.abanaoForca = Math.max(this.abanaoForca, forca);
    this.abanaoT = 0.35;
  }

  atualizarAbanao(dt: number): void {
    if (this.abanaoT > 0) {
      this.abanaoT -= dt;
      const f = this.abanaoForca * (this.abanaoT / 0.35);
      this.offX = (Math.random() - 0.5) * f;
      this.offY = (Math.random() - 0.5) * f;
      if (this.abanaoT <= 0) this.abanaoForca = 0;
    } else {
      this.offX = 0;
      this.offY = 0;
    }
  }

  /** Converte tile -> píxel de ecrã (canto superior esquerdo do tile). */
  paraEcraX(wx: number): number {
    return (wx - this.x) * this.zoom + this.larguraPx / 2 + this.offX;
  }

  paraEcraY(wy: number): number {
    return (wy - this.y) * this.zoom + this.alturaPx / 2 + this.offY;
  }

  paraMundoX(px: number): number {
    return (px - this.larguraPx / 2 - this.offX) / this.zoom + this.x;
  }

  paraMundoY(py: number): number {
    return (py - this.alturaPx / 2 - this.offY) / this.zoom + this.y;
  }

  /** Rectângulo visível em tiles, com margem. */
  areaVisivel(margem = 1): { x0: number; y0: number; x1: number; y1: number } {
    const meiaL = this.larguraPx / 2 / this.zoom;
    const meiaA = this.alturaPx / 2 / this.zoom;
    return {
      x0: Math.floor(this.x - meiaL) - margem,
      y0: Math.floor(this.y - meiaA) - margem,
      x1: Math.ceil(this.x + meiaL) + margem,
      y1: Math.ceil(this.y + meiaA) + margem,
    };
  }
}
