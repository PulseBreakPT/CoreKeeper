/**
 * Medidor de desempenho. Separa três coisas que costumam ser confundidas:
 *   fps      — quantos quadros o ecrã mostra por segundo;
 *   msLogica — tempo gasto a simular o mundo;
 *   msDesenho— tempo gasto a desenhar.
 * Se fps está baixo mas ms está baixo também, o travão é o ecrã, não o jogo.
 */
export class Perf {
  fps = 60;
  msLogica = 0;
  msDesenho = 0;
  /** Pior quadro dos últimos dois segundos. */
  msPior = 0;

  private quadros = 0;
  private acumulado = 0;
  private logicaAcum = 0;
  private desenhoAcum = 0;
  private piorJanela = 0;
  private t0 = 0;

  comecarLogica(): void {
    this.t0 = performance.now();
  }

  fimLogica(): void {
    this.logicaAcum += performance.now() - this.t0;
  }

  comecarDesenho(): void {
    this.t0 = performance.now();
  }

  fimDesenho(): void {
    this.desenhoAcum += performance.now() - this.t0;
  }

  /** Chamado uma vez por quadro, com o intervalo desde o quadro anterior. */
  quadro(dtMs: number): void {
    this.quadros++;
    this.acumulado += dtMs;
    if (dtMs > this.piorJanela) this.piorJanela = dtMs;
    if (this.acumulado >= 500) {
      this.fps = Math.round((this.quadros * 1000) / this.acumulado);
      this.msLogica = +(this.logicaAcum / this.quadros).toFixed(2);
      this.msDesenho = +(this.desenhoAcum / this.quadros).toFixed(2);
      this.msPior = +this.piorJanela.toFixed(1);
      this.quadros = 0;
      this.acumulado = 0;
      this.logicaAcum = 0;
      this.desenhoAcum = 0;
      this.piorJanela = 0;
    }
  }
}

export const perf = new Perf();
