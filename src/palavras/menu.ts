import type { Modo } from './dados';

/* Peças do launcher Nexus Word. Tudo é markup real: nada de texto dentro de imagens. */

type Icone='flame'|'crown'|'play'|'swap'|'calendar'|'trophy'|'chart'|'settings'|'arrow'|'chevron'|'seta'|'seta-dupla';
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
function Nuvem(x:number,y:number,e:number,o:number):string{
  return `<g transform="translate(${x} ${y}) scale(${e})" opacity="${o}"><ellipse cx="0" cy="4" rx="52" ry="14"/><circle cx="-22" cy="-2" r="17"/><circle cx="1" cy="-11" r="23"/><circle cx="26" cy="-1" r="15"/></g>`;
}
function Moita(x:number,y:number,e:number,cor:string):string{
  const bolas:[number,number,number][]=[[-42,10,19],[-21,-7,26],[3,-16,31],[27,-6,25],[48,10,18]];
  return `<g transform="translate(${x} ${y}) scale(${e})" fill="${cor}">${bolas.map(([cx,cy,r])=>`<circle cx="${cx}" cy="${cy}" r="${r}"/>`).join('')}<rect x="-60" y="4" width="120" height="40" rx="19"/></g>`;
}
function Flor(x:number,y:number,e:number,petala:string,miolo='#ffd23a'):string{
  const petalas=[[0,-8],[7.6,-2.5],[4.7,6.5],[-4.7,6.5],[-7.6,-2.5]];
  return `<g transform="translate(${x} ${y}) scale(${e})"><g fill="${petala}">${petalas.map(([cx,cy])=>`<circle cx="${cx}" cy="${cy}" r="5.2"/>`).join('')}</g><circle r="3.4" fill="${miolo}"/></g>`;
}
export function Cenario():string{
  const sebeFundo=[Moita(26,272,1,'url(#nw-verde-longe)'),Moita(128,262,.92,'url(#nw-verde-longe)'),Moita(238,266,1.04,'url(#nw-verde-longe)'),Moita(348,260,.96,'url(#nw-verde-longe)')].join('');
  const sebeFrente=[Moita(-12,302,1,'url(#nw-verde-perto)'),Moita(92,298,.86,'url(#nw-verde-perto)'),Moita(194,306,.94,'url(#nw-verde-perto)'),Moita(298,296,.9,'url(#nw-verde-perto)'),Moita(400,304,1.02,'url(#nw-verde-perto)')].join('');
  const lados=[Moita(-34,452,.6,'url(#nw-verde-lado)'),Moita(-38,566,.52,'url(#nw-verde-lado)'),Moita(-30,688,.62,'url(#nw-verde-lado)'),Moita(434,440,.58,'url(#nw-verde-lado)'),Moita(438,574,.54,'url(#nw-verde-lado)'),Moita(430,700,.64,'url(#nw-verde-lado)')].join('');
  const rodape=[Moita(26,844,.96,'url(#nw-verde-perto)'),Moita(154,856,.82,'url(#nw-verde-perto)'),Moita(286,846,.92,'url(#nw-verde-perto)'),Moita(396,852,1,'url(#nw-verde-perto)')].join('');
  const flores=[Flor(22,812,.95,'#ffffff'),Flor(54,832,.78,'#ffd7e6','#ff9ec4'),Flor(376,806,.92,'#ffffff'),Flor(348,830,.76,'#fff0b0','#ffa927'),Flor(206,834,.68,'#ffffff'),Flor(12,624,.62,'#ffffff'),Flor(390,530,.6,'#ffd7e6','#ff9ec4')].join('');
  return `<svg class="nw-cenario" viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="nw-ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4ec9f5"/><stop offset=".5" stop-color="#8ee1fb"/><stop offset="1" stop-color="#c6f1f7"/></linearGradient>
      <linearGradient id="nw-chao" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3f8d4"/><stop offset=".18" stop-color="#fdf6da"/><stop offset=".62" stop-color="#fff0c4"/><stop offset="1" stop-color="#ffdb95"/></linearGradient>
      <radialGradient id="nw-sol"><stop offset="0" stop-color="#fffbe4" stop-opacity=".85"/><stop offset="1" stop-color="#fffbe4" stop-opacity="0"/></radialGradient>
      <linearGradient id="nw-verde-longe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a6f0a4"/><stop offset="1" stop-color="#66d68c"/></linearGradient>
      <linearGradient id="nw-verde-perto" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fe07a"/><stop offset="1" stop-color="#1fab5c"/></linearGradient>
      <linearGradient id="nw-verde-lado" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#77e68d"/><stop offset="1" stop-color="#33bd6a"/></linearGradient>
    </defs>
    <rect width="400" height="340" fill="url(#nw-ceu)"/>
    <path d="M0 316h400v544H0Z" fill="url(#nw-chao)"/>
    <circle cx="332" cy="34" r="168" fill="url(#nw-sol)"/>
    <g class="nw-nuvens" fill="#ffffff">${Nuvem(58,96,1,.88)}${Nuvem(330,72,.78,.82)}${Nuvem(236,152,.54,.6)}${Nuvem(-4,178,.6,.55)}${Nuvem(152,42,.46,.5)}</g>
    ${sebeFundo}${sebeFrente}
    <path d="M0 344c58 12 104-10 168-2s148 22 232 4v14H0Z" fill="#ffffff" opacity=".42"/>
    ${lados}${rodape}${flores}
  </svg>`;
}

/* Modos. */
interface ModeDef{modo:Modo;numero:string;nome:string;origem:string;destino:string;descricao:string;cor:string}
const modos:ModeDef[]=[
  {modo:'plural',numero:'01',nome:'PLURAL',origem:'ÁRVORE',destino:'ÁRVORES',descricao:'Uma torna-se várias',cor:'gold'},
  {modo:'singular',numero:'02',nome:'SINGULAR',origem:'LIMÕES',destino:'LIMÃO',descricao:'Várias tornam-se uma',cor:'green'},
  {modo:'contrario',numero:'03',nome:'CONTRÁRIO',origem:'GANHAR',destino:'PERDER',descricao:'Encontra o oposto',cor:'pink'},
];
function Arte(d:ModeDef):string{
  if(d.modo==='plural')return `<span class="nw-arte pilha">${Faiscas(5)}${LetterTile('R','blue','t1')}${LetterTile('A','pink','t2')}${LetterTile('A','yellow','t3')}</span>`;
  if(d.modo==='singular')return `<span class="nw-arte">${LetterTile('S','green')}<i class="nw-lima"></i></span>`;
  return `<span class="nw-arte"><span class="nw-tile pink troca"><i class="brilho"></i>${Icon({nome:'swap'})}</span></span>`;
}
function Exemplo(d:ModeDef):string{
  return `<span class="nw-exemplo"><b data-exemplo-origem>${d.origem}</b>${Icon({nome:d.modo==='contrario'?'seta-dupla':'seta',classe:'nw-seta'})}<b data-exemplo-destino>${d.destino}</b></span>`;
}
export function ModeCard(d:ModeDef,principal=false):string{
  const cta=principal
    ? `<span class="nw-cta"><strong>JOGAR</strong><i>${Icon({nome:'play'})}</i></span>`
    : `<span class="nw-cta redonda"><i>${Icon({nome:'play'})}</i></span>`;
  return `<button type="button" class="nw-card modo ${d.cor} ${principal?'principal':'secundario'}" data-modo="${d.modo}" role="listitem" aria-label="Jogar ${d.nome}">
    <span class="nw-card-topo"><span class="nw-chip numero">${d.numero}</span><span class="nw-chip nome">${d.nome}</span><span class="nw-chip nw-level">LV. 01</span></span>
    ${Arte(d)}
    <span class="nw-copy">${Exemplo(d)}<small>${d.descricao}</small></span>
    <span class="nw-recorde" data-recorde="${d.modo}">MELHOR COMBO —</span>
    ${cta}
  </button>`;
}

export function StatCard():string{
  return `<section class="nw-best"><span class="coroa">${Icon({nome:'crown'})}</span><strong>MELHOR SEQUÊNCIA</strong><b id="melhor-sequencia">0</b></section>`;
}
export function DailyWordCard():string{
  return `<button class="nw-daily word" id="ver-palavra-dia" type="button"><span class="nw-daily-icone">${Icon({nome:'calendar'})}</span><span class="nw-daily-copy"><small>PALAVRA DO DIA</small><b id="palavra-dia">LACÓNICO</b><em id="significado-dia">expressão em poucas palavras</em></span><i class="nw-daily-seta">${Icon({nome:'arrow'})}</i></button>`;
}
export function DailyChallengeCard():string{
  return `<button class="nw-daily challenge" id="abrir-desafio-dia" type="button"><span class="nw-daily-icone">${Icon({nome:'trophy'})}</span><span class="nw-daily-copy"><small>DESAFIO DO DIA</small><b>15 respostas seguidas</b><span class="nw-progresso"><i><em id="desafio-barra"></em></i><strong id="desafio-valor">0 / 15</strong></span></span><i class="nw-daily-seta">${Icon({nome:'arrow'})}</i></button>`;
}
export function BottomNavigation():string{
  return `<nav class="nw-bottom" aria-label="Navegação"><button id="abrir-recordes" type="button"><span class="nw-nav-icone">${Icon({nome:'chart'})}</span><b>RECORDES</b>${Icon({nome:'chevron',classe:'chevron'})}</button><i class="nw-divisoria"></i><button id="abrir-definicoes" type="button"><span class="nw-nav-icone">${Icon({nome:'settings'})}</span><b>DEFINIÇÕES</b>${Icon({nome:'chevron',classe:'chevron'})}</button></nav>`;
}
function Logo():string{
  return `<h1 id="titulo-menu" class="nw-logo"><span class="linha nexus" data-t="NEXUS"><i>NEXUS</i></span><span class="linha word" data-t="WORD"><i>WORD</i></span></h1>`;
}
function Folha():string{
  return `<section class="folha" id="folha" hidden><button class="folha-fundo" id="fechar-folha" aria-label="Fechar"></button><div class="folha-painel"><i></i><header><span><small id="folha-etiqueta">NEXUS WORD</small><h2 id="folha-titulo">Recordes</h2></span><button id="fechar-folha-x" type="button">×</button></header><div id="folha-conteudo"></div></div></section>`;
}

export function montarMenu(raiz:HTMLElement):void{
  raiz.innerHTML=`${Cenario()}
  <header class="nw-top">
    <span class="nw-marca"><i>N</i><b>NEXUS WORD</b></span>
    <span class="nw-streak">${Icon({nome:'flame'})}<b id="dias">1</b> DIA</span>
  </header>
  <section class="nw-hero">
    <span class="nw-hero-tiles" aria-hidden="true">${Faiscas(4)}${LetterTile('P','green','p')}${LetterTile('R','pink','r')}${LetterTile('S','blue','s')}${LetterTile('A','yellow','a')}</span>
    ${Logo()}
    <p class="nw-tagline">PALAVRAS. RAPIDEZ.</p>
  </section>
  ${StatCard()}
  <section class="nw-modos" role="list" aria-label="Modos de jogo">
    ${ModeCard(modos[0],true)}
    <div class="nw-modos-linha">${ModeCard(modos[1])}${ModeCard(modos[2])}</div>
  </section>
  <section class="nw-dailies">${DailyWordCard()}${DailyChallengeCard()}</section>
  ${BottomNavigation()}
  <p class="nw-motto">PENSA <i></i> CLICA <i></i> APRENDE</p>
  ${Folha()}`;
}
