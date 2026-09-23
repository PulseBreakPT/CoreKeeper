import { DailyIllustration } from './diarios';

export const META_DIARIA = 15;
export const EVENTO_META_DIARIA = 'nexus:meta-diaria';
const CHAVE = 'nexus-word:celebracao-diaria:v1';
interface Conquista { dia: string; pendente: boolean }
let memoria: Conquista | null = null;
let apenasMemoria = false;

function ler(): Conquista | null {
  if (apenasMemoria) return memoria;
  try {
    const valor = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    if (valor && typeof valor.dia === 'string' && typeof valor.pendente === 'boolean') memoria = valor;
  } catch { apenasMemoria = true; }
  return memoria;
}

function guardar(conquista: Conquista): void {
  memoria = conquista;
  try { localStorage.setItem(CHAVE, JSON.stringify(conquista)); } catch { apenasMemoria = true; }
}

/** Chamado apenas quando o progresso real passa de menos de 15 para 15 ou mais. */
export function registarConquistaDiaria(dia: string): void {
  if (ler()?.dia === dia) return;
  guardar({dia, pendente:true});
  document.dispatchEvent(new CustomEvent(EVENTO_META_DIARIA, {detail:{dia}}));
}

/** Não consome a celebração antes de o resultado ficar visível ao jogador. */
export function prepararResultadoDiario(dia: string): void {
  const conquista = ler();
  const pendente = conquista?.dia === dia && conquista.pendente;
  const painel = document.getElementById('painel')!;
  painel.classList.toggle('resultado-desafio', Boolean(pendente));
  painel.dataset.desafioDia = pendente ? dia : '';
  document.getElementById('resultado-desafio')!.hidden = !pendente;
}

export function consumirConquistaDiaria(dia: string): boolean {
  const conquista = ler();
  if (!dia || conquista?.dia !== dia || !conquista.pendente) return false;
  guardar({dia, pendente:false});
  return true;
}

export function montarConquistaDiaria(): HTMLElement {
  const card = document.createElement('section');
  card.id = 'resultado-desafio';
  card.className = 'desafio-conquista';
  card.dataset.testid = 'daily-challenge-celebration';
  card.hidden = true;
  card.setAttribute('aria-labelledby', 'conquista-titulo');
  card.innerHTML = `<span class="conquista-taca" aria-hidden="true">${DailyIllustration('trophy','conquista-diaria')}</span>
    <span class="conquista-copy"><small data-testid="daily-celebration-label">DESAFIO DO DIA</small><b id="conquista-titulo" data-testid="daily-celebration-title">Dia conquistado!</b><span data-testid="daily-celebration-description">15 respostas certas seguidas.</span></span>
    <span class="conquista-selo" data-testid="daily-celebration-completed" aria-label="15 de 15, concluído"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg><b>15/15</b></span>`;
  document.querySelector('.jg-resumo')!.before(card);
  return card;
}