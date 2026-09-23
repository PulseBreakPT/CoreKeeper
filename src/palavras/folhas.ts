import { Icon, type Icone } from './menu';
import type { Modo } from './dados';

export interface RecordeVisual {
  modo: Modo;
  nome: string;
  nivel: number;
  dominio: number;
  combo: number;
  pontos: number;
}

export function renderizarRecordes(rows: RecordeVisual[], palavras: number, medalhas: number): string {
  return `<p class="folha-intro" data-testid="records-intro">Cada partida é uma nova oportunidade de te superares.</p>${rows.map(row => `<article class="linha-folha recorde-colorido ${row.modo}" data-testid="record-row-${row.modo}"><i class="recorde-medalhao" aria-hidden="true">${row.modo === 'contrario' ? Icon({nome:'swap'}) : row.modo === 'plural' ? 'P' : 'S'}</i><span class="recorde-dados"><b data-testid="record-label-${row.modo}">${row.nome}</b><small data-testid="record-detail-${row.modo}">LV. ${String(row.nivel).padStart(2,'0')} · COMBO ×${row.combo}</small><span class="dominio-label" data-testid="record-mastery-${row.modo}">DOMÍNIO ${row.dominio}%<i><em style="width:${row.dominio}%"></em></i></span></span><strong data-testid="record-points-${row.modo}">${row.pontos.toLocaleString('pt-PT')}<small>PONTOS</small></strong></article>`).join('')}
    <article class="linha-folha colecao-colorida" data-testid="collection-summary"><i class="recorde-medalhao" aria-hidden="true">${Icon({nome:'trophy'})}</i><span><b>COLEÇÃO</b><small data-testid="collection-medals">${medalhas} ${medalhas === 1 ? 'MEDALHA' : 'MEDALHAS'}</small></span><strong data-testid="collection-count">${palavras}<small>PALAVRAS</small></strong></article>`;
}

export function renderizarDefinicoes(options: { som: boolean; vibracao: boolean; movimento: boolean }): string {
  const items: { key: keyof typeof options; title: string; detail: string; icon: Icone }[] = [
    { key:'som', title:'SOM', detail:'Pequenos sons para cada conquista', icon:'som' },
    { key:'vibracao', title:'VIBRAÇÃO', detail:'Sente a resposta a cada toque', icon:'flame' },
    { key:'movimento', title:'ANIMAÇÕES', detail:'Brilhos e peças com vida', icon:'play' },
  ];
  return `<p class="folha-intro" data-testid="settings-intro">O teu jogo, ao teu ritmo.</p>${items.map(item => `<button class="opcao-folha opcao-colorida" data-opcao="${item.key}" data-testid="settings-${item.key}" role="switch" aria-checked="${options[item.key]}" aria-label="${item.title}"><i class="opcao-icone" aria-hidden="true">${Icon({nome:item.icon})}</i><span><b>${item.title}</b><small>${item.detail}</small></span><span class="switch-wrap"><i class="switch-trilho" aria-hidden="true"><i></i></i><strong data-testid="settings-${item.key}-state">${options[item.key]?'LIGADO':'DESLIGADO'}</strong></span></button>`).join('')}<p class="folha-nota" data-testid="settings-storage-note">As tuas preferências ficam guardadas neste dispositivo.</p>`;
}