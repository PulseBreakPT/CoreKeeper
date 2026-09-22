import './estilo.css';
import { PERGUNTAS, type Modo, type Pergunta } from './dados';

type Estado = 'READY'|'ANSWERING'|'CHECKING'|'CORRECT'|'WRONG'|'GAME_OVER';
const DURACAO=10_000, ESPERA=850;
const textos:Record<Modo,{nome:string;instrucao:string}>={
  plural:{nome:'PLURAL',instrucao:'Escreve o plural'},
  singular:{nome:'SINGULAR',instrucao:'Escreve o singular'},
  contrario:{nome:'CONTRÁRIO',instrucao:'Escreve o contrário'},
};
function el<T extends HTMLElement>(id:string):T{const n=document.getElementById(id);if(!n)throw new Error(`Falta #${id}`);return n as T;}
function normalizar(v:string):string{return v.trim().normalize('NFC').toLocaleLowerCase('pt-PT');}
function baralhar<T>(itens:T[]):T[]{const a=[...itens];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
interface Estatisticas{correctas:Record<Modo,number>;erros:Record<Modo,number>;partidas:Record<Modo,number>;melhorCombo:Record<Modo,number>;errosPalavras:Record<string,number>;coleccao:string[];melhorGlobal:number;dia:string;sequenciaDias:number;desafioDia:number;ultimoModo:Modo;vibracao:boolean;movimento:boolean}
const VAZIO:Estatisticas={correctas:{plural:0,singular:0,contrario:0},erros:{plural:0,singular:0,contrario:0},partidas:{plural:0,singular:0,contrario:0},melhorCombo:{plural:0,singular:0,contrario:0},errosPalavras:{},coleccao:[],melhorGlobal:0,dia:'',sequenciaDias:0,desafioDia:0,ultimoModo:'plural',vibracao:true,movimento:true};
function lerEstatisticas():Estatisticas{try{const v=JSON.parse(localStorage.getItem('nexus-word:estatisticas:v1')||'{}');return{...VAZIO,...v,correctas:{...VAZIO.correctas,...v.correctas},erros:{...VAZIO.erros,...v.erros},partidas:{...VAZIO.partidas,...v.partidas},melhorCombo:{...VAZIO.melhorCombo,...v.melhorCombo},errosPalavras:{...VAZIO.errosPalavras,...v.errosPalavras},coleccao:Array.isArray(v.coleccao)?v.coleccao:[]};}catch{return structuredClone(VAZIO);}}
let estatisticas=lerEstatisticas();
function guardarEstatisticas():void{try{localStorage.setItem('nexus-word:estatisticas:v1',JSON.stringify(estatisticas));}catch{}}
function vibrar(p:number|number[]):void{if(estatisticas.vibracao)navigator.vibrate?.(p);}

const menu=el<HTMLElement>('menu'),jogo=el<HTMLElement>('jogo'),input=el<HTMLInputElement>('resposta'),confirmar=el<HTMLButtonElement>('confirmar');
const feedback=el<HTMLElement>('feedback'),painel=el<HTMLElement>('painel'),barra=el<HTMLElement>('barra-tempo');
let modo:Modo=estatisticas.ultimoModo,estado:Estado='READY',fila:Pergunta[]=[],actual:Pergunta|null=null,pontos=0,vidas=3,combo=0,melhorCombo=0,numero=0,certas=0,erradas=0,tempoRespostas=0;
let inicioPergunta=0,quadro=0,proximoTimer=0,token=0,pausado=false,restantePausa=DURACAO;

function recorde(m:Modo):number{try{return Number(localStorage.getItem(`palavra:recorde:${m}`))||0;}catch{return 0;}}
function guardarRecorde():boolean{const anterior=recorde(modo);if(pontos<=anterior)return false;try{localStorage.setItem(`palavra:recorde:${modo}`,String(pontos));}catch{}return true;}
function hoje():string{return new Date().toISOString().slice(0,10);}
function prepararDia():void{if(estatisticas.dia===hoje())return;const ontem=new Date(Date.now()-86400000).toISOString().slice(0,10);estatisticas.sequenciaDias=estatisticas.dia===ontem?estatisticas.sequenciaDias+1:1;estatisticas.dia=hoje();estatisticas.desafioDia=0;guardarEstatisticas();}
function nivel(m:Modo):number{return 1+Math.floor(estatisticas.correctas[m]/20);}
function actualizarRecordes():void{
  prepararDia();document.querySelectorAll<HTMLElement>('[data-recorde]').forEach(n=>{const m=n.dataset.recorde as Modo,c=estatisticas.melhorCombo[m];n.textContent=c?`MELHOR COMBO ×${c}`:'MELHOR COMBO —';});
  el('melhor-sequencia').textContent=String(estatisticas.melhorGlobal);el('dias').textContent=String(estatisticas.sequenciaDias);
  el('desafio-valor').textContent=`${Math.min(15,estatisticas.desafioDia)} / 15`;el('desafio-barra').style.width=`${Math.min(100,estatisticas.desafioDia/15*100)}%`;
  document.querySelectorAll<HTMLElement>('[data-modo]').forEach(n=>n.style.setProperty('--nivel',`"LV. ${String(nivel(n.dataset.modo as Modo)).padStart(2,'0')}"`));
}
function hud():void{
  el('pontos').textContent=pontos.toLocaleString('pt-PT');
  el('vidas').textContent=Array.from({length:3},(_,i)=>i<vidas?'♥':'♡').join(' ');
  el('combo').textContent=`×${combo}`;
  el('numero-pergunta').textContent=String(numero).padStart(2,'0');
}
function limparAssincronos():void{token++;cancelAnimationFrame(quadro);window.clearTimeout(proximoTimer);quadro=0;proximoTimer=0;}
function focar():void{requestAnimationFrame(()=>{input.focus({preventScroll:true});input.select();});}
function definirEstado(novo:Estado):void{estado=novo;document.documentElement.dataset.estado=novo.toLowerCase();}

function relogio(agora:number,meuToken:number):void{
  if(meuToken!==token||estado!=='ANSWERING'||pausado)return;
  const restante=Math.max(0,DURACAO-(agora-inicioPergunta));
  barra.style.transform=`scaleX(${restante/DURACAO})`;
  barra.classList.toggle('urgente',restante<=3000);
  if(restante<=0){validar(true);return;}
  quadro=requestAnimationFrame(t=>relogio(t,meuToken));
}

function obterPergunta():Pergunta{
  if(!fila.length){const fracas=PERGUNTAS[modo].filter(p=>(estatisticas.errosPalavras[`${modo}:${p.word}`]||0)>0).sort((a,b)=>(estatisticas.errosPalavras[`${modo}:${b.word}`]||0)-(estatisticas.errosPalavras[`${modo}:${a.word}`]||0)).slice(0,8);fila=baralhar([...PERGUNTAS[modo],...fracas,...fracas.slice(0,3)]);}
  const seguinte=fila.pop()!;
  if(actual&&seguinte.word===actual.word&&fila.length) return fila.shift()!;
  return seguinte;
}
function novaPergunta():void{
  if(estado==='GAME_OVER')return;
  limparAssincronos();
  actual=obterPergunta();numero++;
  el('palavra').textContent=actual.word.toLocaleUpperCase('pt-PT');
  el('instrucao').textContent=textos[modo].instrucao;
  el('modo-etiqueta').textContent=textos[modo].nome;
  input.value='';input.disabled=false;confirmar.disabled=false;
  el('resposta-wrap').className='resposta-wrap';el('estado-input').textContent='A TUA RESPOSTA';
  feedback.hidden=true;barra.classList.remove('urgente');barra.style.transform='scaleX(1)';
  pausado=false;restantePausa=DURACAO;definirEstado('ANSWERING');hud();
  inicioPergunta=performance.now();const meuToken=token;quadro=requestAnimationFrame(t=>relogio(t,meuToken));focar();
}
function mostrarFeedback(certo:boolean,ganho=0):void{
  feedback.className=`feedback ${certo?'certo':'errado'}`;
  el('feedback-titulo').textContent=certo?'CERTO':'ERRADO';
  el('feedback-texto').textContent=certo?`+${ganho} PONTOS`:`RESPOSTA: ${actual!.answer.toLocaleUpperCase('pt-PT')}`;
  feedback.hidden=false;
  const caixa=el('resposta-wrap');caixa.className=`resposta-wrap ${certo?'certa':'errada'}`;
  el('estado-input').textContent=certo?'RESPOSTA CERTA':'RESPOSTA ERRADA';
}
function validar(tempoEsgotado=false):void{
  if(estado!=='ANSWERING'||!actual)return;
  definirEstado('CHECKING');cancelAnimationFrame(quadro);quadro=0;confirmar.disabled=true;input.disabled=true;
  const decorrido=Math.min(DURACAO,performance.now()-inicioPergunta);
  const resposta=normalizar(input.value);
  const aceite=!tempoEsgotado&&actual.acceptedAnswers.some(a=>normalizar(a)===resposta);tempoRespostas+=decorrido;
  if(aceite){
    const bonus=Math.max(0,Math.round((DURACAO-decorrido)/DURACAO*50)),ganho=100+bonus;
    pontos+=ganho;combo++;certas++;melhorCombo=Math.max(melhorCombo,combo);estatisticas.desafioDia=Math.max(estatisticas.desafioDia,combo);const chave=`${modo}:${actual.word}`;estatisticas.errosPalavras[chave]=Math.max(0,(estatisticas.errosPalavras[chave]||0)-1);if(!estatisticas.coleccao.includes(chave))estatisticas.coleccao.push(chave);definirEstado('CORRECT');mostrarFeedback(true,ganho);if(decorrido<2200){el('feedback-titulo').textContent='PERFEITO';}vibrar(18);
  }else{
    vidas--;combo=0;erradas++;estatisticas.errosPalavras[`${modo}:${actual.word}`]=(estatisticas.errosPalavras[`${modo}:${actual.word}`]||0)+1;definirEstado('WRONG');mostrarFeedback(false);vibrar([35,25,45]);
  }
  hud();const meuToken=token;
  proximoTimer=window.setTimeout(()=>{if(meuToken!==token)return;input.value='';if(vidas<=0)terminar();else novaPergunta();},ESPERA);
}
function terminar():void{
  limparAssincronos();definirEstado('GAME_OVER');input.blur();
  const novo=guardarRecorde();estatisticas.correctas[modo]+=certas;estatisticas.erros[modo]+=erradas;estatisticas.partidas[modo]++;estatisticas.melhorCombo[modo]=Math.max(estatisticas.melhorCombo[modo],melhorCombo);estatisticas.melhorGlobal=Math.max(estatisticas.melhorGlobal,melhorCombo);estatisticas.ultimoModo=modo;guardarEstatisticas();painel.hidden=false;
  el('painel-etiqueta').textContent=`${textos[modo].nome} · ${numero} RESPOSTAS`;
  el('painel-titulo').textContent=pontos.toLocaleString('pt-PT');
  el('painel-texto').textContent=novo?'NOVO RECORDE':'RECORDE '+recorde(modo).toLocaleString('pt-PT');
  el('resumo-certas').textContent=String(certas);el('resumo-erradas').textContent=String(erradas);el('resumo-combo').textContent=`×${melhorCombo}`;el('resumo-tempo').textContent=`${(tempoRespostas/Math.max(1,numero)/1000).toLocaleString('pt-PT',{minimumFractionDigits:1,maximumFractionDigits:1})}s`;
  actualizarRecordes();vibrar([55,35,75]);
}
function contagem():void{limparAssincronos();definirEstado('READY');const caixa=el<HTMLElement>('contagem'),n=el('contagem-numero');caixa.hidden=false;el('contagem-modo').textContent=textos[modo].nome;let valor=3;const meuToken=token;const passo=()=>{if(meuToken!==token)return;n.textContent=String(valor);n.classList.remove('pulso');void n.offsetWidth;n.classList.add('pulso');vibrar(5);valor--;if(valor>=0)proximoTimer=window.setTimeout(passo,620);else{caixa.hidden=true;novaPergunta();}};passo();}
function iniciar(m:Modo):void{
  limparAssincronos();modo=m;fila=[];actual=null;pontos=0;vidas=3;combo=0;melhorCombo=0;numero=0;certas=0;erradas=0;tempoRespostas=0;pausado=false;
  input.value='';input.disabled=false;confirmar.disabled=false;feedback.hidden=true;painel.hidden=true;
  menu.hidden=true;jogo.hidden=false;definirEstado('READY');hud();contagem();
}
function irMenu():void{limparAssincronos();definirEstado('READY');input.blur();jogo.hidden=true;menu.hidden=false;painel.hidden=true;actualizarRecordes();}
function alternarPausa():void{
  if(estado!=='ANSWERING')return;
  pausado=!pausado;
  if(pausado){restantePausa=Math.max(0,DURACAO-(performance.now()-inicioPergunta));cancelAnimationFrame(quadro);input.disabled=true;confirmar.disabled=true;el('pausa').textContent='▶';el('estado-input').textContent='EM PAUSA';input.blur();}
  else{inicioPergunta=performance.now()-(DURACAO-restantePausa);input.disabled=false;confirmar.disabled=false;el('pausa').textContent='Ⅱ';el('estado-input').textContent='A TUA RESPOSTA';const meuToken=token;quadro=requestAnimationFrame(t=>relogio(t,meuToken));focar();}
}

function seleccionarModo(m:Modo,iniciarSeActivo=true):void{const botoes=[...document.querySelectorAll<HTMLButtonElement>('[data-modo]')],alvo=botoes.find(b=>b.dataset.modo===m)!;if(alvo.classList.contains('seleccionado')&&iniciarSeActivo){iniciar(m);return;}botoes.forEach(b=>b.classList.toggle('seleccionado',b===alvo));alvo.parentElement!.prepend(alvo);alvo.blur();menu.scrollTop=0;window.scrollTo(0,0);requestAnimationFrame(()=>{menu.scrollTop=0;window.scrollTo(0,0);});modo=m;estatisticas.ultimoModo=m;guardarEstatisticas();vibrar(8);}
document.querySelectorAll<HTMLButtonElement>('[data-modo]').forEach(b=>b.addEventListener('click',()=>seleccionarModo(b.dataset.modo as Modo)));
confirmar.addEventListener('click',()=>validar(false));
input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();validar(false);}});
input.addEventListener('input',()=>el('resposta-wrap').classList.toggle('preenchida',Boolean(input.value.trim())));
el('voltar').addEventListener('click',irMenu);el('ir-menu').addEventListener('click',irMenu);el('jogar-novamente').addEventListener('click',()=>iniciar(modo));el('pausa').addEventListener('click',alternarPausa);
window.visualViewport?.addEventListener('resize',()=>document.documentElement.style.setProperty('--altura-app',`${window.visualViewport!.height}px`));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&estado==='ANSWERING'&&!pausado)alternarPausa();});
const folha=el<HTMLElement>('folha'),conteudo=el<HTMLElement>('folha-conteudo');
function abrirFolha(tipo:'recordes'|'definicoes'):void{el('folha-titulo').textContent=tipo==='recordes'?'Recordes':'Definições';if(tipo==='recordes'){conteudo.innerHTML=(Object.keys(textos) as Modo[]).map(m=>{const total=estatisticas.correctas[m]+estatisticas.erros[m],dom=Math.round(estatisticas.correctas[m]/Math.max(1,total)*100);return`<article class="linha-folha"><span><b>${textos[m].nome}</b><small>LV. ${String(nivel(m)).padStart(2,'0')} · DOMÍNIO ${dom}% · COMBO ×${estatisticas.melhorCombo[m]}</small></span><strong>${recorde(m).toLocaleString('pt-PT')}</strong></article>`;}).join('')+`<article class="linha-folha"><span><b>COLEÇÃO</b><small>PALAVRAS DESCOBERTAS</small></span><strong>${estatisticas.coleccao.length}/180</strong></article>`;}else{conteudo.innerHTML=`<button class="opcao-folha" data-opcao="vibracao"><span><b>VIBRAÇÃO</b><small>Resposta tátil durante o jogo</small></span><strong>${estatisticas.vibracao?'LIGADA':'DESLIGADA'}</strong></button><button class="opcao-folha" data-opcao="movimento"><span><b>ANIMAÇÕES</b><small>Transições e palavras vivas</small></span><strong>${estatisticas.movimento?'LIGADAS':'REDUZIDAS'}</strong></button>`;conteudo.querySelectorAll<HTMLButtonElement>('[data-opcao]').forEach(b=>b.onclick=()=>{const k=b.dataset.opcao as 'vibracao'|'movimento';estatisticas[k]=!estatisticas[k];guardarEstatisticas();document.documentElement.classList.toggle('reduzir-movimento',!estatisticas.movimento);abrirFolha('definicoes');});}folha.hidden=false;}
function fecharFolha():void{folha.hidden=true;}
el('abrir-recordes').addEventListener('click',()=>abrirFolha('recordes'));el('abrir-definicoes').addEventListener('click',()=>abrirFolha('definicoes'));el('jogar-agora').addEventListener('click',()=>iniciar(estatisticas.ultimoModo));el('fechar-folha').addEventListener('click',fecharFolha);el('fechar-folha-x').addEventListener('click',fecharFolha);
let indiceExemplo=0;function animarExemplos():void{if(menu.hidden||!estatisticas.movimento)return;document.querySelectorAll<HTMLButtonElement>('[data-modo]').forEach((b,i)=>{const m=b.dataset.modo as Modo,p=PERGUNTAS[m][(indiceExemplo+i*7)%PERGUNTAS[m].length],dest=b.querySelector<HTMLElement>('[data-exemplo-destino]')!;b.querySelector<HTMLElement>('[data-exemplo-origem]')!.textContent=p.word.toLocaleUpperCase('pt-PT');dest.textContent='?';window.setTimeout(()=>{if(!menu.hidden){dest.textContent=p.answer.toLocaleUpperCase('pt-PT');dest.classList.add('revelada');window.setTimeout(()=>dest.classList.remove('revelada'),700);}},1100);});indiceExemplo++;}
const PALAVRAS_DIA=[['PERSPICAZ','que compreende depressa'],['SERENDIPIDADE','descoberta feliz por acaso'],['EFÉMERO','que dura pouco tempo'],['INTRÉPIDO','que não receia o perigo'],['SINGELO','simples e sem artifício'],['LACÓNICO','expresso em poucas palavras'],['UBÍQUO','presente em toda a parte']];const pd=PALAVRAS_DIA[Math.floor(Date.now()/86400000)%PALAVRAS_DIA.length];el('palavra-dia').textContent=pd[0];el('significado-dia').textContent=pd[1];
prepararDia();seleccionarModo(estatisticas.ultimoModo,false);actualizarRecordes();document.documentElement.classList.toggle('reduzir-movimento',!estatisticas.movimento);definirEstado('READY');animarExemplos();window.setInterval(animarExemplos,3200);
