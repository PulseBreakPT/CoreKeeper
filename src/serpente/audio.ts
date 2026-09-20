/** Som do jogo da serpente — sintetizado, sem ficheiros nem downloads. */

const CHAVE_SOM = 'serpente:som:v1';

/** Escala pentatónica em semitons, para a comida subir de tom sem desafinar. */
const ESCALA = [0, 2, 4, 7, 9];

function lerPreferencia(): boolean {
  try {
    return localStorage.getItem(CHAVE_SOM) !== 'off';
  } catch {
    return true;
  }
}

export class Som {
  ligado = lerPreferencia();

  private ctx: AudioContext | null = null;
  private mestre: GainNode | null = null;

  /** O contexto só pode nascer depois de um gesto do utilizador. */
  garantir(): void {
    if (!this.ligado) return;
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const janela = window as unknown as { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext ?? janela.webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
      this.mestre = this.ctx.createGain();
      this.mestre.gain.value = 0.25;
      this.mestre.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
      this.mestre = null;
    }
  }

  alternar(): boolean {
    this.ligado = !this.ligado;
    try {
      localStorage.setItem(CHAVE_SOM, this.ligado ? 'on' : 'off');
    } catch {
      /* sem armazenamento, fica só para esta sessão */
    }
    if (this.ligado) this.garantir();
    else if (this.ctx?.state === 'running') void this.ctx.suspend();
    return this.ligado;
  }

  private tom(
    freq: number,
    inicio: number,
    dur: number,
    volume: number,
    onda: OscillatorType = 'triangle',
    destino = freq,
  ): void {
    if (!this.ctx || !this.mestre) return;
    const t = this.ctx.currentTime + inicio;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = onda;
    osc.frequency.setValueAtTime(freq, t);
    if (destino !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(30, destino), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.mestre);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  private ruido(inicio: number, dur: number, volume: number, corte: number): void {
    if (!this.ctx || !this.mestre) return;
    const t = this.ctx.currentTime + inicio;
    const n = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const dados = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) dados[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const fonte = this.ctx.createBufferSource();
    fonte.buffer = buffer;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = corte;
    const g = this.ctx.createGain();
    g.gain.value = volume;
    fonte.connect(filtro);
    filtro.connect(g);
    g.connect(this.mestre);
    fonte.start(t);
  }

  /** Estalido curto que sobe de tom conforme a serpente cresce. */
  comer(comidas: number): void {
    if (!this.ligado) return;
    this.garantir();
    const grau = Math.max(0, comidas - 1);
    const semitons = ESCALA[grau % ESCALA.length] + 12 * Math.min(2, Math.floor(grau / ESCALA.length));
    const freq = 440 * Math.pow(2, semitons / 12);
    this.tom(freq, 0, 0.09, 0.3, 'triangle');
    this.tom(freq * 2, 0.01, 0.06, 0.12, 'sine');
  }

  /** Arpejo de marco, quando a pontuação passa uma dezena. */
  marco(): void {
    if (!this.ligado) return;
    this.garantir();
    [0, 4, 7, 12].forEach((s, i) => {
      this.tom(523.25 * Math.pow(2, s / 12), i * 0.055, 0.2, 0.22, 'sine');
    });
  }

  /** Tique seco dos últimos segundos do relógio. */
  tique(): void {
    if (!this.ligado) return;
    this.garantir();
    this.tom(1180, 0, 0.05, 0.2, 'square');
    this.tom(590, 0.005, 0.07, 0.1, 'triangle');
  }

  /** Baque e descida — fim de partida. */
  fim(): void {
    if (!this.ligado) return;
    this.garantir();
    this.ruido(0, 0.22, 0.28, 900);
    this.tom(330, 0.02, 0.5, 0.26, 'sawtooth', 70);
    this.tom(165, 0.02, 0.55, 0.16, 'triangle', 48);
  }

  /** Fanfarra curta para a arena cheia. */
  vitoria(): void {
    if (!this.ligado) return;
    this.garantir();
    [0, 4, 7, 12, 16, 19].forEach((s, i) => {
      this.tom(523.25 * Math.pow(2, s / 12), i * 0.08, 0.32, 0.22, 'triangle');
    });
  }
}
