/** Efeitos sonoros sintetizados — sem ficheiros, tudo em osciladores. */

type Onda = OscillatorType;

export class Audio {
  private ctx: AudioContext | null = null;
  private ganhoMestre: GainNode | null = null;
  ligado = true;

  /** O contexto só pode nascer depois de um toque do utilizador. */
  garantir(): void {
    if (this.ctx || !this.ligado) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
      this.ganhoMestre = this.ctx.createGain();
      this.ganhoMestre.gain.value = 0.22;
      this.ganhoMestre.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  retomar(): void {
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  private tom(freq: number, dur: number, onda: Onda, volume: number, deslize = 0): void {
    if (!this.ligado) return;
    this.garantir();
    if (!this.ctx || !this.ganhoMestre) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = onda;
    osc.frequency.setValueAtTime(freq, t);
    if (deslize) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + deslize), t + dur);
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.ganhoMestre);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private ruido(dur: number, volume: number, filtro: number): void {
    if (!this.ligado) return;
    this.garantir();
    if (!this.ctx || !this.ganhoMestre) return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const dados = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) dados[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = filtro;
    const g = this.ctx.createGain();
    g.gain.value = volume;
    src.connect(lp);
    lp.connect(g);
    g.connect(this.ganhoMestre);
    src.start(t);
  }

  golpe(): void {
    this.ruido(0.09, 0.35, 1800);
  }

  picareta(): void {
    this.tom(220 + Math.random() * 40, 0.06, 'square', 0.12, -60);
    this.ruido(0.05, 0.18, 900);
  }

  partiu(): void {
    this.ruido(0.22, 0.4, 700);
    this.tom(140, 0.18, 'triangle', 0.14, -60);
  }

  apanhar(): void {
    this.tom(880, 0.07, 'triangle', 0.13, 220);
  }

  criar(): void {
    this.tom(523, 0.09, 'triangle', 0.14);
    setTimeout(() => this.tom(784, 0.12, 'triangle', 0.13), 80);
  }

  dano(): void {
    this.tom(180, 0.16, 'sawtooth', 0.16, -80);
  }

  morte(): void {
    this.tom(320, 0.5, 'sawtooth', 0.18, -240);
  }

  chefe(): void {
    this.tom(90, 0.9, 'sawtooth', 0.22, 40);
    setTimeout(() => this.tom(140, 0.7, 'square', 0.16, -60), 200);
  }

  colocar(): void {
    this.tom(320, 0.07, 'square', 0.1, 80);
  }
}

export const audio = new Audio();
