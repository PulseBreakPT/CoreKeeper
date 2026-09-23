import type { Modo } from './dados';
import logoReferencia from '../assets/nexus/logo.webp';
import pilhaReferencia from '../assets/nexus/pilha.webp';
import singularReferencia from '../assets/nexus/singular.webp';
import trocaReferencia from '../assets/nexus/troca.webp';
import { Cenario } from './paisagem';
export { Cenario } from './paisagem';

/* Peças do launcher Nexus Word. Tudo é markup real: nada de texto dentro de imagens. */

export type Icone='flame'|'crown'|'play'|'swap'|'calendar'|'trophy'|'chart'|'settings'|'arrow'|'chevron'|'seta'|'seta-dupla'|'relogio'|'saltar'|'pausa'|'som'|'sem-som'|'sair'|'alvo'|'balao'|'visto'|'cruz';
const paths:Record<Icone,string>={
  flame:'<path d="M12.6 1.8c.9 3.7-1.1 5 1.6 7.9.9-1.8 2.7-2.8 2.7-5.6 3.7 3.7 4.7 7.6 2.8 12.2A8.1 8.1 0 0 1 4.3 12c.9-2.8 2.8-4.7 4.6-6.6 0 2.8 0 4.7 1.9 5.6 1.8-2.8.9-5.6-.2-8.3l2-.9Z"/><path d="M12 12.4c1.9 1.9 2.8 3.8.9 6.6-3.7 0-4.6-3.8-.9-6.6Z" class="detail"/>',
  crown:'<path d="M3.4 8.1c1 0 1.8-.8 1.8-1.8s-.8-1.8-1.8-1.8-1.8.8-1.8 1.8c0 .8.6 1.5 1.3 1.7l1 8.9c.1.8.8 1.4 1.6 1.4h9c.8 0 1.5-.6 1.6-1.4l1-8.9c.7-.2 1.3-.9 1.3-1.7 0-1-.8-1.8-1.8-1.8s-1.8.8-1.8 1.8c0 .5.2 1 .6 1.3l-2.5 2.1-2.3-3.8c.5-.3.8-.8.8-1.4 0-1-.8-1.8-1.8-1.8S9 3.6 9 4.6c0 .6.3 1.1.8 1.4l-2.3 3.8-2.5-2.1c.3-.3.5-.8.5-1.3Z"/><rect x="5.4" y="18.7" width="13.2" height="2.4" rx="1.2"/>',
  play:'<path d="M8.6 5.4a1 1 0 0 1 1.5-.9l8.3 6.6a1 1 0 0 1 0 1.8l-8.3 6.6a1 1 0 0 1-1.5-.9V5.4Z"/>',
  swap:'<path d="M3.6 8.6h12.1l-2.8-2.8a1.4 1.4 0 0 1 2-2l5.2 5.2-5.2 5.2a1.4 1.4 0 0 1-2-2l2.8-2.8H3.6a1.4 1.4 0 0 1 0-2.8Z" opacity="0"/><path d="M4 8.4h12.2l-2.9-2.9a1.5 1.5 0 1 1 2.1-2.1l5.5 5.5a1.5 1.5 0 0 1 0 2.1l-5.5 5.5a1.5 1.5 0 0 1-2.1-2.1l2.9-2.9H4a1.6 1.6 0 0 1 0-3.1Z" transform="translate(0 -1.6)"/><path d="M20 15.6H7.8l2.9 2.9a1.5 1.5 0 0 1-2.1 2.1L3.1 15a1.5 1.5 0 0 1 0-2.1l5.5-5.5a1.5 1.5 0 0 1 2.1 2.1l-2.9 2.9H20a1.6 1.6 0 0 1 0 3.1Z" transform="translate(0 1.6)"/>',
  calendar:'<rect x="2.6" y="4.4" width="18.8" height="17" rx="3.6"/><rect x="4.9" y="8.9" width="14.2" height="10.2" rx="2" class="cut"/><rect x="6.4" y="1.8" width="2.8" height="5" rx="1.4"/><rect x="14.8" y="1.8" width="2.8" height="5" rx="1.4"/><rect x="7" y="11.4" width="4" height="2.2" rx="1.1"/><rect x="13" y="11.4" width="4" height="2.2" rx="1.1"/><rect x="7" y="15.2" width="10" height="2.2" rx="1.1"/>',
  trophy:'<path d="M7.3 2.6h9.4c.8 0 1.4.6 1.4 1.4v4.4c0 3.9-2.1 6.6-4.5 7v2.5h2.2c.8 0 1.4.6 1.4 1.4s-.6 1.4-1.4 1.4H8.2a1.4 1.4 0 0 1 0-2.8h2.2v-2.5c-2.4-.4-4.5-3.1-4.5-7V4c0-.8.6-1.4 1.4-1.4Z"/><path d="M5.9 5.1H3.4c-.8 0-1.4.6-1.4 1.4v1.3c0 2.6 1.8 4.4 4.3 4.7l-.4-2.8c-1-.2-1.5-.9-1.5-1.9V7.9h1.5V5.1Zm12.2 0h2.5c.8 0 1.4.6 1.4 1.4v1.3c0 2.6-1.8 4.4-4.3 4.7l.4-2.8c1-.2 1.5-.9 1.5-1.9V7.9h-1.5V5.1Z"/>',
  chart:'<rect x="2.6" y="12.4" width="5" height="8.4" rx="2"/><rect x="9.5" y="3.2" width="5" height="17.6" rx="2"/><rect x="16.4" y="8.6" width="5" height="12.2" rx="2"/>',
  settings:'<path d="M10.1 1.9h3.8c.6 0 1.2.5 1.3 1.1l.3 1.8 1.4.6 1.5-1a1.4 1.4 0 0 1 1.8.2l2 2c.4.4.5 1.1.2 1.7l-1 1.5.6 1.4 1.7.3c.7.1 1.1.7 1.1 1.3v-.2 2.7c0 .7-.5 1.2-1.1 1.3l-1.7.3-.6 1.4 1 1.5c.3.6.2 1.3-.2 1.7l-2 2a1.4 1.4 0 0 1-1.8.2l-1.5-1-1.4.6-.3 1.7c-.1.7-.7 1.2-1.3 1.2h-3.8c-.6 0-1.2-.5-1.3-1.2l-.3-1.7-1.4-.6-1.5 1a1.4 1.4 0 0 1-1.8-.2l-2-2a1.4 1.4 0 0 1-.2-1.7l1-1.5-.6-1.4-1.7-.3A1.4 1.4 0 0 1 .8 15v-3.8c0-.6.5-1.2 1.1-1.3l1.7-.3.6-1.4-1-1.5a1.4 1.4 0 0 1 .2-1.7l2-2a1.4 1.4 0 0 1 1.8-.2l1.5 1 1.4-.6.3-1.8c.1-.6.7-1.1 1.3-1.1Z" transform="scale(.94) translate(.8 .6)"/><circle cx="12" cy="12" r="3.6" class="cut"/>',
  arrow:'<path d="M4.6 10.5h9.7l-2.4-2.4a1.5 1.5 0 0 1 2.1-2.1l5 5a1.5 1.5 0 0 1 0 2.1l-5 5a1.5 1.5 0 0 1-2.1-2.1l2.4-2.4H4.6a1.5 1.5 0 0 1 0-3Z"/>',
  chevron:'<path d="M8.4 3.4a1.9 1.9 0 0 1 2.7 0l6.9 7a1.9 1.9 0 0 1 0 2.6l-6.9 7a1.9 1.9 0 1 1-2.7-2.7l5.5-5.6-5.5-5.6a1.9 1.9 0 0 1 0-2.7Z"/>',
  relogio:'<rect x="9.4" y="0.9" width="5.2" height="2.6" rx="1.3"/><path d="M12 3.1a9.6 9.6 0 1 1 0 19.2 9.6 9.6 0 0 1 0-19.2Zm0 3.2a1.4 1.4 0 0 0-1.4 1.4v5.1c0 .5.2.9.6 1.2l3.3 2.4a1.4 1.4 0 0 0 1.7-2.3l-2.8-2v-4.4A1.4 1.4 0 0 0 12 6.3Z"/><path d="M19.3 2.2 21.6 4.5l-1.9 1.9-2.3-2.3 1.9-1.9Z"/>',
  saltar:'<path d="M3.4 5.6a1.4 1.4 0 0 1 2.2-1.1l7 5.3a1.4 1.4 0 0 1 0 2.2l-7 5.3a1.4 1.4 0 0 1-2.2-1.1V5.6Z"/><path d="M12.4 5.6a1.4 1.4 0 0 1 2.2-1.1l7 5.3a1.4 1.4 0 0 1 0 2.2l-7 5.3a1.4 1.4 0 0 1-2.2-1.1V5.6Z"/>',
  pausa:'<rect x="4.6" y="3.4" width="5.2" height="17.2" rx="2.4"/><rect x="14.2" y="3.4" width="5.2" height="17.2" rx="2.4"/>',
  som:'<path d="M11.8 3.2c.8-.6 2-.1 2 .9v15.8c0 1-1.2 1.5-2 .9l-4.6-3.7H3.6c-.8 0-1.4-.6-1.4-1.4V8.3c0-.8.6-1.4 1.4-1.4h3.6l4.6-3.7Z"/><path d="M16.6 8.1a1.3 1.3 0 0 1 1.8.3 6.1 6.1 0 0 1 0 7.2 1.3 1.3 0 1 1-2.1-1.6 3.5 3.5 0 0 0 0-4 1.3 1.3 0 0 1 .3-1.9Zm3.1-3.2a1.3 1.3 0 0 1 1.8.3 11 11 0 0 1 0 13.6 1.3 1.3 0 1 1-2.1-1.6 8.4 8.4 0 0 0 0-10.4 1.3 1.3 0 0 1 .3-1.9Z"/>',
  'sem-som':'<path d="M11.8 3.2c.8-.6 2-.1 2 .9v15.8c0 1-1.2 1.5-2 .9l-4.6-3.7H3.6c-.8 0-1.4-.6-1.4-1.4V8.3c0-.8.6-1.4 1.4-1.4h3.6l4.6-3.7Z"/><path d="M17.3 8.5a1.3 1.3 0 0 1 1.9 0l1.3 1.4 1.4-1.4a1.3 1.3 0 0 1 1.8 1.9L22.3 12l1.4 1.5a1.3 1.3 0 1 1-1.8 1.9l-1.4-1.4-1.3 1.4a1.3 1.3 0 0 1-1.9-1.9l1.4-1.5-1.4-1.6a1.3 1.3 0 0 1 0-1.9Z" transform="translate(-1.6 0)"/>',
  sair:'<path d="M4.2 3.4h7.2a1.4 1.4 0 0 1 0 2.8H5.6v11.6h5.8a1.4 1.4 0 0 1 0 2.8H4.2c-.8 0-1.4-.6-1.4-1.4V4.8c0-.8.6-1.4 1.4-1.4Z"/><path d="M15.6 7.1a1.4 1.4 0 0 1 2-.1l4.2 4a1.4 1.4 0 0 1 0 2l-4.2 4a1.4 1.4 0 1 1-1.9-2l1.7-1.6h-6a1.4 1.4 0 0 1 0-2.8h6l-1.7-1.6a1.4 1.4 0 0 1-.1-1.9Z"/>',
  alvo:'<path d="M12 2.2a9.8 9.8 0 1 1 0 19.6 9.8 9.8 0 0 1 0-19.6Zm0 2.9a6.9 6.9 0 1 0 0 13.8 6.9 6.9 0 0 0 0-13.8Z"/><path d="M12 7.6a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 0 1 0-8.8Zm0 2.7a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z"/>',
  balao:'<path d="M4.4 3.2h15.2c1.3 0 2.4 1.1 2.4 2.4v8.6c0 1.3-1.1 2.4-2.4 2.4h-7l-4.6 3.8c-.8.6-1.9 0-1.9-1v-2.8h-1.7A2.4 2.4 0 0 1 2 14.2V5.6c0-1.3 1.1-2.4 2.4-2.4Z"/><circle cx="7.6" cy="9.9" r="1.5" class="cut"/><circle cx="12" cy="9.9" r="1.5" class="cut"/><circle cx="16.4" cy="9.9" r="1.5" class="cut"/>',
  visto:'<path d="M12 1.8a10.2 10.2 0 1 1 0 20.4 10.2 10.2 0 0 1 0-20.4Z"/><path d="m7.4 12.3 3 3 6.2-6.4" class="risco"/>',
  cruz:'<path d="M12 1.8a10.2 10.2 0 1 1 0 20.4 10.2 10.2 0 0 1 0-20.4Z"/><path d="m8.6 8.6 6.8 6.8m0-6.8-6.8 6.8" class="risco"/>',
  seta:'<path d="M2.4 9.2h10.9l-3-3a1.7 1.7 0 0 1 2.4-2.4l5.9 5.9a1.7 1.7 0 0 1 0 2.4l-5.9 5.9a1.7 1.7 0 0 1-2.4-2.4l3-3H2.4a1.8 1.8 0 0 1 0-3.4Z"/>',
  'seta-dupla':'<path d="M8.6 3.4a1.7 1.7 0 0 1 0 2.4l-.8.8h8.4l-.8-.8a1.7 1.7 0 1 1 2.4-2.4l3.7 3.7a1.7 1.7 0 0 1 0 2.4l-3.7 3.7a1.7 1.7 0 0 1-2.4-2.4l.8-.8H7.8l.8.8a1.7 1.7 0 0 1-2.4 2.4L2.5 9.5a1.7 1.7 0 0 1 0-2.4l3.7-3.7a1.7 1.7 0 0 1 2.4 0Z" transform="translate(0 2.5)"/>',
};
export function Icon({nome,classe=''}:{nome:Icone;classe?:string}):string{return `<svg class="nw-icon ${classe}" viewBox="0 0 24 24" aria-hidden="true">${paths[nome]}</svg>`;}

/* Peça de letra 2.5D: bisel, brilho e sombra assente. */
type Cor='green'|'pink'|'blue'|'yellow';
export function LetterTile(letra:string,cor:Cor,classe=''):string{
  return `<span class="nw-tile ${cor} ${classe}" aria-hidden="true"><i class="brilho"></i><b>${letra}</b></span>`;
}
function Faiscas(quantas:number):string{return Array.from({length:quantas},(_,i)=>`<i class="nw-faisca f${i+1}"></i>`).join('');}

/* Cenário: céu, nuvens, sebes e flores construídos em SVG próprio. */

/* Modos. */
interface ModeDef{modo:Modo;numero:string;nome:string;origem:string;destino:string;descricao:string;cor:string}
const modos:ModeDef[]=[
  {modo:'plural',numero:'01',nome:'PLURAL',origem:'ÁRVORE',destino:'ÁRVORES',descricao:'Uma torna-se várias',cor:'gold'},
  {modo:'singular',numero:'02',nome:'SINGULAR',origem:'LIMÕES',destino:'LIMÃO',descricao:'Várias tornam-se uma',cor:'green'},
  {modo:'contrario',numero:'03',nome:'CONTRÁRIO',origem:'GANHAR',destino:'PERDER',descricao:'Encontra o oposto',cor:'pink'},
];
function Arte(d:ModeDef):string{
  const src=d.modo==='plural'?pilhaReferencia:d.modo==='singular'?singularReferencia:trocaReferencia;
  return `<span class="nw-arte arte-referencia ${d.modo==='plural'?'pilha':''}" aria-hidden="true">${d.modo==='plural'?Faiscas(5):''}<img src="${src}" alt="" draggable="false" /></span>`;
}
function Exemplo(d:ModeDef):string{
  return `<span class="nw-exemplo"><b data-exemplo-origem>${d.origem}</b>${Icon({nome:d.modo==='contrario'?'seta-dupla':'seta',classe:'nw-seta'})}<b data-exemplo-destino>${d.destino}</b></span>`;
}
export function ModeCard(d:ModeDef,principal=false):string{
  const cta=principal
    ? `<span class="nw-cta"><strong>JOGAR</strong><i>${Icon({nome:'play'})}</i></span>`
    : `<span class="nw-cta redonda"><i>${Icon({nome:'play'})}</i></span>`;
  return `<button type="button" class="nw-card modo ${d.cor} ${principal?'principal':'secundario'}" data-modo="${d.modo}" data-testid="mode-select-${d.modo}" aria-label="Jogar ${d.nome}">
    <span class="nw-card-topo"><span class="nw-chip numero">${d.numero}</span><span class="nw-chip nome">${d.nome}</span><span class="nw-chip nw-level">LV. 01</span></span>
    ${Arte(d)}
    <span class="nw-copy">${Exemplo(d)}<small>${d.descricao}</small></span>
    <span class="nw-recorde" data-recorde="${d.modo}">MELHOR COMBO —</span>
    ${cta}
  </button>`;
}

export function StatCard():string{
  return `<section class="nw-best" style="--i:2"><span class="coroa">${Icon({nome:'crown'})}</span><strong>MELHOR SEQUÊNCIA</strong><b id="melhor-sequencia">0</b></section>`;
}
export function DailyWordCard():string{
  return `<button class="nw-daily word" id="ver-palavra-dia" type="button"><span class="nw-daily-icone">${Icon({nome:'calendar'})}</span><span class="nw-daily-copy"><small>PALAVRA DO DIA</small><b id="palavra-dia">LACÓNICO</b><em id="significado-dia">expressão em poucas palavras</em></span><i class="nw-daily-seta">${Icon({nome:'arrow'})}</i></button>`;
}
export function DailyChallengeCard():string{
  return `<button class="nw-daily challenge" id="abrir-desafio-dia" type="button"><span class="nw-daily-icone">${Icon({nome:'trophy'})}</span><span class="nw-daily-copy"><small>DESAFIO DO DIA</small><b>15 respostas seguidas</b><span class="nw-progresso"><i><em id="desafio-barra"></em></i><strong id="desafio-valor">0 / 15</strong></span></span><i class="nw-daily-seta">${Icon({nome:'arrow'})}</i></button>`;
}
export function BottomNavigation():string{
  return `<nav class="nw-bottom" style="--i:5" aria-label="Navegação"><button id="abrir-recordes" data-testid="menu-records-button" type="button"><span class="nw-nav-icone">${Icon({nome:'chart'})}</span><b>RECORDES</b>${Icon({nome:'chevron',classe:'chevron'})}</button><i class="nw-divisoria"></i><button id="abrir-definicoes" data-testid="menu-settings-button" type="button"><span class="nw-nav-icone">${Icon({nome:'settings'})}</span><b>DEFINIÇÕES</b>${Icon({nome:'chevron',classe:'chevron'})}</button></nav>`;
}
function Logo():string{
  return `<h1 id="titulo-menu" class="nw-logo logo-referencia" data-testid="launcher-title"><img src="${logoReferencia}" alt="Nexus Word" draggable="false" /></h1>`;
}
function Folha():string{
  return `<section class="folha" id="folha" data-testid="menu-dialog" role="dialog" aria-modal="true" aria-labelledby="folha-titulo" hidden><button class="folha-fundo" id="fechar-folha" data-testid="dialog-backdrop" aria-label="Fechar" tabindex="-1"></button><div class="folha-painel"><i></i><header><span><small id="folha-etiqueta">NEXUS WORD</small><h2 id="folha-titulo">Recordes</h2></span><button id="fechar-folha-x" data-testid="dialog-close" type="button" aria-label="Fechar painel">×</button></header><div id="folha-conteudo"></div></div></section>`;
}

export function montarMenu(raiz:HTMLElement):void{
  raiz.dataset.testid='menu-screen';
  raiz.innerHTML=`${Cenario()}
  <header class="nw-top" style="--i:0">
    <span class="nw-marca"><i>N</i><b>NEXUS WORD</b></span>
    <span class="nw-streak">${Icon({nome:'flame'})}<b id="dias">1</b> DIA</span>
  </header>
  <section class="nw-hero" style="--i:1">
    <span class="nw-hero-tiles" aria-hidden="true">${Faiscas(4)}${LetterTile('P','green','p')}${LetterTile('R','pink','r')}${LetterTile('S','blue','s')}${LetterTile('A','yellow','a')}</span>
    ${Logo()}
    <p class="nw-tagline">PALAVRAS. RAPIDEZ.</p>
  </section>
  ${StatCard()}
  <section class="nw-modos" style="--i:3" aria-label="Modos de jogo">
    ${ModeCard(modos[0],true)}
    <div class="nw-modos-linha">${ModeCard(modos[1])}${ModeCard(modos[2])}</div>
  </section>
  <section class="nw-dailies" style="--i:4">${DailyWordCard()}${DailyChallengeCard()}</section>
  ${BottomNavigation()}
  <p class="nw-motto" style="--i:6">PENSA <i></i> CLICA <i></i> APRENDE</p>
  ${Folha()}`;
}
