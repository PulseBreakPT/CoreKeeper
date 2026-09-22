import { Cenario, Icon, LetterTile } from './menu';

/* Ecrã de jogo na mesma linguagem do launcher: mesmo cenário, mesmos cartões,
   mesmas peças. Os ids são os que a lógica em main.ts já usa — só muda a casca. */

function Marcador(cor:string,etiqueta:string,corpo:string,icone=''):string{
  return `<span class="jg-marcador ${cor}">${icone?`<i class="jg-marcador-icone">${icone}</i>`:''}<span class="jg-marcador-corpo"><small>${etiqueta}</small>${corpo}</span></span>`;
}

function Hud():string{
  return `<div class="jg-hud" role="status">
    ${Marcador('azul','PONTOS','<strong id="pontos">0</strong>',Icon({nome:'crown'}))}
    ${Marcador('verde','COMBO','<strong id="combo">×0</strong>')}
    ${Marcador('rosa','VIDAS','<strong id="vidas" class="jg-vidas">♥ ♥ ♥</strong>')}
    ${Marcador('ciano','CALOR','<strong id="heat-texto">HEAT 0%</strong><span class="jg-heat"><i id="heat-barra"></i></span>',Icon({nome:'flame'}))}
  </div>`;
}

function Tempo():string{
  return `<div class="jg-tempo-linha">
    <i class="nw-faisca f1"></i>
    <div class="jg-tempo" aria-label="Tempo restante"><i id="barra-tempo"></i><span class="jg-tempo-corpo">${Icon({nome:'relogio'})}<b id="tempo-numero">10s</b></span></div>
    <i class="nw-faisca f2"></i>
  </div>
  <p class="jg-evento"><span id="evento-ronda">RONDA NORMAL</span></p>`;
}

function CartaoPergunta():string{
  return `<section class="nw-card gold jg-card">
    <span class="nw-card-topo">
      <span class="nw-chip numero" id="numero-pergunta">01</span>
      <span class="nw-chip nome" id="modo-etiqueta">PLURAL</span>
      <span class="nw-chip" id="nivel-jogo">LV. 01</span>
    </span>
    <span class="nw-arte pilha" aria-hidden="true"><i class="nw-faisca f1"></i><i class="nw-faisca f2"></i><i class="nw-faisca f3"></i><i class="nw-faisca f4"></i><i class="nw-faisca f5"></i>${LetterTile('R','blue','t1')}${LetterTile('A','pink','t2')}${LetterTile('A','yellow','t3')}</span>
    <div class="jg-bloco">
      <div class="jg-pergunta">
        <h1 id="palavra">ÁRVORE</h1>
        <p id="instrucao">Escreve o plural</p>
      </div>
      <div class="jg-resposta" id="resposta-wrap">
        <input id="resposta" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="done" maxlength="32" placeholder="escreve aqui…" aria-label="Resposta" />
        <span id="estado-input">A TUA RESPOSTA</span>
      </div>
    </div>
    <div class="jg-accoes">
      <button class="nw-cta jg-confirmar" id="confirmar" type="button"><strong>CONFIRMAR</strong><i>${Icon({nome:'play'})}</i></button>
      <button class="nw-cta cinza jg-pular" id="pular" type="button"><strong>PULAR</strong><i>${Icon({nome:'saltar'})}</i></button>
    </div>
  </section>`;
}

function Faixas():string{
  return `<div class="jg-faixa roxa">
    <span class="jg-faixa-icone">${Icon({nome:'alvo'})}</span>
    <span class="jg-faixa-corpo">
      <small>RITMO DO RECORDE</small>
      <b id="fantasma-recorde">PRIMEIRO PERCURSO</b>
      <span class="jg-barra"><i id="fantasma-barra"></i></span>
    </span>
  </div>
  <div class="jg-faixa azul">
    <span class="jg-faixa-icone">${Icon({nome:'balao'})}</span>
    <span class="jg-faixa-corpo">
      <small>ÚLTIMAS RESPOSTAS</small>
      <div class="jg-historico" id="historico" aria-label="Respostas anteriores"></div>
    </span>
  </div>`;
}

function Barra():string{
  return `<nav class="nw-bottom jg-bottom" aria-label="Controlos">
    <button id="pausa" type="button"><span class="nw-nav-icone">${Icon({nome:'pausa'})}</span><b id="pausa-texto">PAUSAR</b></button>
    <i class="nw-divisoria"></i>
    <button id="som" type="button" aria-pressed="true"><span class="nw-nav-icone">${Icon({nome:'som',classe:'icone-som'})}${Icon({nome:'sem-som',classe:'icone-mudo'})}</span><b id="som-texto">SOM</b></button>
    <i class="nw-divisoria"></i>
    <button id="voltar" type="button"><span class="nw-nav-icone">${Icon({nome:'sair'})}</span><b>SAIR</b></button>
  </nav>`;
}

function Sobreposicoes():string{
  return `<div class="jg-feedback" id="feedback" hidden><strong id="feedback-titulo">CERTO</strong><span id="feedback-texto">+145 PONTOS</span></div>
  <div class="jg-contagem" id="contagem" hidden><small id="contagem-modo">PLURAL</small><span>PREPARA-TE</span><b id="contagem-numero">3</b></div>`;
}

function Painel():string{
  return `<section class="jg-painel" id="painel" hidden>
    <div class="jg-painel-caixa">
      <small id="painel-etiqueta">PARTIDA TERMINADA</small>
      <h2 id="painel-titulo">1 250</h2>
      <p id="painel-texto">NOVO RECORDE</p>
      <div class="jg-medalha" id="medalha-perfeita" hidden>${Icon({nome:'trophy'})} PERFECT RUN</div>
      <div class="jg-resumo">
        <span><b id="resumo-certas">0</b><small>CERTAS</small></span>
        <span><b id="resumo-erradas">0</b><small>ERRADAS</small></span>
        <span><b id="resumo-combo">0</b><small>MELHOR COMBO</small></span>
        <span><b id="resumo-tempo">0,0s</b><small>TEMPO MÉDIO</small></span>
      </div>
      <button class="nw-cta jg-painel-cta" id="jogar-novamente" type="button"><strong>JOGAR OUTRA VEZ</strong><i>${Icon({nome:'play'})}</i></button>
      <div class="jg-painel-linha">
        <button class="jg-botao-claro" id="rever-erros" type="button">${Icon({nome:'balao'})}<b>REVER ERROS</b></button>
        <button class="jg-botao-claro" id="ir-menu" type="button">${Icon({nome:'sair'})}<b>OUTRO MODO</b></button>
      </div>
    </div>
  </section>
  <section class="jg-revisao" id="revisao" hidden>
    <div class="jg-revisao-caixa">
      <header><button id="fechar-revisao" type="button">${Icon({nome:'chevron',classe:'voltar'})}</button><span><small>DESEMPENHO</small><h2>Palavras a rever</h2></span></header>
      <div id="lista-erros"></div>
    </div>
  </section>`;
}

export function montarJogo(raiz:HTMLElement):void{
  raiz.innerHTML=`${Cenario()}
  <header class="nw-top" style="--i:0">
    <span class="nw-marca"><i>N</i><b>NEXUS WORD</b></span>
    <span class="nw-streak">${Icon({nome:'flame'})}<b id="dias-jogo">1</b> DIA</span>
  </header>
  ${Hud()}
  ${Tempo()}
  ${CartaoPergunta()}
  ${Faixas()}
  ${Barra()}
  <p class="nw-motto">PENSA <i></i> CLICA <i></i> APRENDE</p>
  ${Sobreposicoes()}
  ${Painel()}`;
}
