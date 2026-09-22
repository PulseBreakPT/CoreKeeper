/**
 * Porta de diagnóstico dos jogos do arcade.
 *
 * Os testes de fumo precisam de pôr um jogo num estado concreto — terminado,
 * em pausa, sem vidas — sem lá chegar a jogar dez minutos. É a mesma porta que
 * a serpente já usava, agora partilhada pelos cinco.
 */

declare global {
  interface Window {
    nexus?: Record<string, unknown>;
  }
}

export function registarMotor(jogo: string, motor: unknown): void {
  window.nexus = { ...(window.nexus ?? {}), [jogo]: motor };
}
