/**
 * O vocabulário de estados do Nexus.
 *
 * Cada jogo tem o seu motor e os seus nomes internos, mas todos respondem à
 * mesma pergunta antes de aceitar uma jogada. É isso que impede a classe de
 * bugs em que um jogo está pausado ou terminado e continua a processar
 * entradas — basta um sítio para decidir, em vez de um `if` por cada handler.
 */

export type EstadoNexus = 'LOADING' | 'READY' | 'PLAYING' | 'PAUSED' | 'WON' | 'LOST' | 'EXITING';

/** Os nomes internos de cada motor, traduzidos para o vocabulário comum. */
const TRADUCAO: Record<string, EstadoNexus> = {
  // Serpente
  pronto: 'READY',
  'a-jogar': 'PLAYING',
  morto: 'LOST',
  completo: 'WON',
  // Blocos, Labirinto, 2048 e Campo Minado
  jogar: 'PLAYING',
  pausa: 'PAUSED',
  nivel: 'PLAYING',
  fim: 'LOST',
  ganhou: 'WON',
  venceu: 'WON',
  perdeu: 'LOST',
};

export function estadoNexus(interno: string): EstadoNexus {
  return TRADUCAO[interno] ?? 'LOADING';
}

/**
 * Só há dois estados que aceitam uma jogada: à espera do primeiro toque e a
 * jogar. Pausado, ganho, perdido ou a sair não aceitam nada.
 */
export function aceitaJogada(interno: string): boolean {
  const estado = estadoNexus(interno);
  return estado === 'READY' || estado === 'PLAYING';
}

/** Terminou — ganho ou perdido. Só reiniciar ou sair passam daqui. */
export function terminou(interno: string): boolean {
  const estado = estadoNexus(interno);
  return estado === 'WON' || estado === 'LOST';
}
