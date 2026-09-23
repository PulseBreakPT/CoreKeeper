import { Icon, type Icone } from './menu';
import type { Modo } from './dados';
import { DailyIllustration } from './diarios';
import pluralArt from '../assets/nexus/pilha.webp';
import singularArt from '../assets/nexus/singular.webp';
import contrarioArt from '../assets/nexus/troca.webp';

/** Cabeçalhos de apresentação; os dados e as regras continuam em main.ts. */
export function prepararFolha(tipo: 'recordes' | 'definicoes' | 'palavra'): void {
  document.getElementById('folha')!.dataset.panel = tipo;
  document.getElementById('folha-etiqueta')!.textContent = {recordes:'O TEU PERCURSO',definicoes:'À TUA MEDIDA',palavra:'DESCOBRIR É JOGAR'}[tipo];
  document.getElementById('folha-emblema')!.innerHTML = tipo === 'recordes'
    ? DailyIllustration('trophy','records-header')
    : Icon({nome:tipo === 'definicoes' ? 'settings' : 'livro'});
}

export interface RecordeVisual {
  modo: Modo;
  nome: string;
  nivel: number;
  dominio: number;
  combo: number;
  pontos: number;
}

export function renderizarRecordes(rows: RecordeVisual[], palavras: number, medalhas: number): string {
  const art = {plural:pluralArt,singular:singularArt,contrario:contrarioArt};
  return `<p class="folha-intro" data-testid="records-intro">Palavra a palavra, vais mais longe.</p>${rows.map(row => `<article class="linha-folha recorde-colorido ${row.modo}" data-testid="record-row-${row.modo}"><i class="recorde-medalhao recorde-arte" aria-hidden="true"><img src="${art[row.modo]}" alt="" /></i><span class="recorde-dados"><b data-testid="record-label-${row.modo}">${row.nome}</b><small data-testid="record-detail-${row.modo}">NÍVEL ${String(row.nivel).padStart(2,'0')} <em>·</em> COMBO ×${row.combo}</small><span class="dominio-label" data-testid="record-mastery-${row.modo}"><span>DOMÍNIO <b>${row.dominio}%</b></span><i><em style="width:${row.dominio}%"></em></i></span></span><strong data-testid="record-points-${row.modo}">${row.pontos.toLocaleString('pt-PT')}<small>PONTOS</small></strong></article>`).join('')}
    <article class="linha-folha colecao-colorida" data-testid="collection-summary"><i class="recorde-medalhao" aria-hidden="true">${Icon({nome:'livro'})}</i><span><b data-testid="collection-title">A TUA COLEÇÃO</b><small data-testid="collection-medals">${medalhas} ${medalhas === 1 ? 'medalha conquistada' : 'medalhas conquistadas'}</small></span><strong data-testid="collection-count">${palavras}<small>PALAVRAS</small></strong></article>`;
}

export function renderizarDefinicoes(options: { som: boolean; vibracao: boolean; movimento: boolean }): string {
  const items: { key: keyof typeof options; title: string; detail: string; icon: Icone }[] = [
    { key:'som', title:'SOM', detail:'Dá som a cada conquista.', icon:'som' },
    { key:'vibracao', title:'VIBRAÇÃO', detail:'Sente cada resposta.', icon:'vibracao' },
    { key:'movimento', title:'ANIMAÇÕES', detail:'Um pouco mais de magia.', icon:'brilhos' },
  ];
  return `<p class="folha-intro" data-testid="settings-intro">O teu jogo, ao teu ritmo.</p>${items.map(item => `<button class="opcao-folha opcao-colorida" data-opcao="${item.key}" data-testid="settings-${item.key}" role="switch" aria-checked="${options[item.key]}" aria-label="${item.title}"><i class="opcao-icone" aria-hidden="true">${Icon({nome:item.icon})}</i><span><b data-testid="settings-${item.key}-title">${item.title}</b><small data-testid="settings-${item.key}-description">${item.detail}</small></span><span class="switch-wrap"><i class="switch-trilho" aria-hidden="true"><i></i></i><strong data-testid="settings-${item.key}-state">${options[item.key]?'LIGADO':'DESLIGADO'}</strong></span></button>`).join('')}<p class="folha-nota" data-testid="settings-storage-note">${Icon({nome:'visto'})} Guardado automaticamente neste dispositivo.</p>`;
}