import { DailyIllustration } from './diarios';
import { Icon } from './menu';
import type { Modo } from './dados';

export function WordDiscovery(word: string, meaning: string): HTMLElement {
  const card = document.createElement('article');
  card.className = 'word-discovery';
  card.dataset.testid = 'daily-word-discovery';
  card.innerHTML = `<div class="discovery-emblem" aria-hidden="true">${DailyIllustration('calendar','word-discovery')}<i></i></div><span class="discovery-tag" data-testid="discovery-tag">UMA DESCOBERTA POR DIA</span><h3 data-testid="discovery-word"></h3><div class="discovery-definition"><small data-testid="discovery-definition-label">SIGNIFICADO</small><p data-testid="discovery-meaning"></p></div><span class="discovery-next" data-testid="discovery-next">${Icon({nome:'calendar'})} Amanhã há uma nova palavra.</span>`;
  card.querySelector('h3')!.textContent = word;
  card.querySelector('p')!.textContent = meaning;
  return card;
}

export function ResultHeading(): string {
  return `<div class="result-header"><span class="result-art" aria-hidden="true">${DailyIllustration('trophy','result-trophy')}</span><span><p id="result-title" data-testid="results-title">FIM DE PARTIDA</p><small id="painel-etiqueta" data-testid="results-mode">PARTIDA TERMINADA</small></span></div>`;
}

export function ReviewCard(item: { word: string; answer: string; modo: Modo }, index: number): HTMLElement {
  const names = { plural:'PLURAL', singular:'SINGULAR', contrario:'CONTRÁRIO' };
  const card = document.createElement('article');
  card.className = 'review-card';
  card.dataset.testid = `review-card-${index}`;
  card.innerHTML = `<div class="review-card-heading"><i class="review-number" aria-hidden="true">${String(index+1).padStart(2,'0')}</i><small data-testid="review-mode-${index}">${names[item.modo]}</small><span class="review-learning" data-testid="review-learning-${index}">PARA A PRÓXIMA</span></div><div class="review-pair"><span class="review-source"><small data-testid="review-source-label-${index}">PALAVRA</small><b data-testid="review-source-${index}"></b></span>${Icon({nome:'arrow',classe:'review-arrow'})}<span class="review-answer"><small data-testid="review-answer-label-${index}">RESPOSTA</small><strong data-testid="review-answer-${index}"></strong></span></div>`;
  card.querySelector('b')!.textContent = item.word.toLocaleUpperCase('pt-PT');
  card.querySelector('strong')!.textContent = item.answer.toLocaleUpperCase('pt-PT');
  card.querySelector<HTMLElement>('.review-source')!.style.setProperty('--letters', String(Math.max(6, [...item.word].length)));
  card.querySelector<HTMLElement>('.review-answer')!.style.setProperty('--letters', String(Math.max(6, [...item.answer].length)));
  return card;
}

export function PanelMedallion(kind: 'record' | 'history'): string {
  return `<span class="panel-medallion ${kind}" aria-hidden="true"><i>${Icon({nome:kind==='record'?'alvo':'balao'})}</i><span></span></span>`;
}