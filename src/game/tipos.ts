/** Tipos partilhados entre a simulação e o desenho. */

export interface Queda {
  x: number;
  y: number;
  item: string;
  quantidade: number;
  t: number;
  vx: number;
  vy: number;
  atraso: number;
}

export interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  vidaMax: number;
  cor: string;
  tam: number;
}

export interface Projetil {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dano: number;
  cor: string;
  vida: number;
  raio: number;
  /** Disparado pelo Portador (acerta em bichos) ou por um bicho (acerta no Portador). */
  doJogador: boolean;
  /** Quantos alvos ainda pode atravessar. */
  perfura: number;
  /** Quantos saltos para alvos próximos ainda tem. */
  salta: number;
  /** Ids já atingidos, para não repetir no mesmo projéctil. */
  atingidos?: Set<unknown>;
}

export interface TextoFlutuante {
  x: number;
  y: number;
  texto: string;
  vida: number;
  cor: string;
  /** Texto maior, para críticos. */
  grande?: boolean;
}
