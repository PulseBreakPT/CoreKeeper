import type { Jogo, Modo } from './logica';

const CHAVE = 'serpente:carreira:v2';

export interface Estatisticas {
  partidas: number;
  pontos: number;
  comidas: number;
  especiais: number;
  melhorCombo: number;
  maiorComprimento: number;
  tempoMs: number;
  missoes: number;
  vitorias: number;
  modos: Partial<Record<Modo, number>>;
  conquistas: string[];
}

export interface Missao {
  tipo: 'comidas' | 'combo' | 'pontos' | 'especiais' | 'comprimento';
  alvo: number;
  texto: string;
}

export interface Conquista {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  feita: (d: Estatisticas) => boolean;
}

const VAZIO: Estatisticas = {
  partidas: 0,
  pontos: 0,
  comidas: 0,
  especiais: 0,
  melhorCombo: 0,
  maiorComprimento: 3,
  tempoMs: 0,
  missoes: 0,
  vitorias: 0,
  modos: {},
  conquistas: [],
};

export const CONQUISTAS: Conquista[] = [
  { id: 'despertar', nome: 'Despertar', descricao: 'Termina a primeira partida.', icone: '01', feita: (d) => d.partidas >= 1 },
  { id: 'dez', nome: 'Primeira dezena', descricao: 'Marca 10 pontos numa carreira.', icone: '10', feita: (d) => d.pontos >= 10 },
  { id: 'centuria', nome: 'Centúria', descricao: 'Recolhe 100 luzes.', icone: '100', feita: (d) => d.comidas >= 100 },
  { id: 'sintonia', nome: 'Sintonia', descricao: 'Alcança um combo ×3.', icone: '×3', feita: (d) => d.melhorCombo >= 3 },
  { id: 'imparavel', nome: 'Imparável', descricao: 'Alcança o combo máximo ×5.', icone: '×5', feita: (d) => d.melhorCombo >= 5 },
  { id: 'alquimista', nome: 'Alquimista', descricao: 'Recolhe 20 luzes especiais.', icone: '◇', feita: (d) => d.especiais >= 20 },
  { id: 'alongada', nome: 'Alongada', descricao: 'Chega aos 20 segmentos.', icone: '20', feita: (d) => d.maiorComprimento >= 20 },
  { id: 'objectivo', nome: 'Objectivo', descricao: 'Cumpre uma missão de partida.', icone: '✓', feita: (d) => d.missoes >= 1 },
  { id: 'veterano', nome: 'Veterano', descricao: 'Joga 25 partidas.', icone: '25', feita: (d) => d.partidas >= 25 },
  { id: 'conquista', nome: 'Conquista', descricao: 'Enche completamente uma arena.', icone: '★', feita: (d) => d.vitorias >= 1 },
];

function ler(): Estatisticas {
  try {
    const valor = JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Partial<Estatisticas>;
    return { ...VAZIO, ...valor, modos: valor.modos ?? {}, conquistas: valor.conquistas ?? [] };
  } catch {
    return { ...VAZIO, modos: {}, conquistas: [] };
  }
}

function gravar(dados: Estatisticas): void {
  try { localStorage.setItem(CHAVE, JSON.stringify(dados)); } catch { /* sessão sem armazenamento */ }
}

export class Carreira {
  dados = ler();

  nivel(): number {
    return 1 + Math.floor((this.dados.comidas + this.dados.missoes * 8) / 25);
  }

  registar(jogo: Jogo, duracaoMs: number, missaoCumprida: boolean): Conquista[] {
    const d = this.dados;
    d.partidas++;
    d.pontos += jogo.pontos;
    d.comidas += jogo.comidas;
    d.especiais += jogo.especiais;
    d.melhorCombo = Math.max(d.melhorCombo, jogo.melhorCombo);
    d.maiorComprimento = Math.max(d.maiorComprimento, jogo.corpo.length);
    d.tempoMs += Math.max(0, duracaoMs);
    d.missoes += missaoCumprida ? 1 : 0;
    d.vitorias += jogo.estado === 'completo' ? 1 : 0;
    d.modos[jogo.modo] = (d.modos[jogo.modo] ?? 0) + 1;
    const novas = CONQUISTAS.filter((c) => !d.conquistas.includes(c.id) && c.feita(d));
    d.conquistas.push(...novas.map((c) => c.id));
    gravar(d);
    return novas;
  }
}

const MISSOES: Missao[] = [
  { tipo: 'comidas', alvo: 8, texto: 'Recolhe 8 luzes' },
  { tipo: 'combo', alvo: 3, texto: 'Alcança combo ×3' },
  { tipo: 'pontos', alvo: 18, texto: 'Marca 18 pontos' },
  { tipo: 'especiais', alvo: 2, texto: 'Apanha 2 luzes especiais' },
  { tipo: 'comprimento', alvo: 14, texto: 'Chega aos 14 segmentos' },
];

export function criarMissao(indice: number, modo: Modo): Missao {
  const desvio = [...modo].reduce((n, c) => n + c.charCodeAt(0), 0);
  return MISSOES[(indice + desvio) % MISSOES.length];
}

export function valorMissao(missao: Missao, jogo: Jogo): number {
  if (missao.tipo === 'comidas') return jogo.comidas;
  if (missao.tipo === 'combo') return jogo.melhorCombo;
  if (missao.tipo === 'pontos') return jogo.pontos;
  if (missao.tipo === 'especiais') return jogo.especiais;
  return jogo.corpo.length;
}

export function nomeDesafioDiario(dia = Math.floor(Date.now() / 86_400_000)): string {
  return ['Portais instáveis', 'Arena em eclipse', 'Circuito de blocos', 'Ritmo ascendente'][Math.abs(dia * 17 + 11) % 4];
}

export async function partilharResultado(texto: string): Promise<'partilhado' | 'copiado' | 'indisponivel'> {
  const android = (window as Window & { SerpenteAndroid?: { shareScore(texto: string): void } }).SerpenteAndroid;
  if (android?.shareScore) {
    android.shareScore(texto);
    return 'partilhado';
  }
  if (navigator.share) {
    await navigator.share({ title: 'Serpente', text: texto });
    return 'partilhado';
  }
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(texto);
    return 'copiado';
  }
  return 'indisponivel';
}
