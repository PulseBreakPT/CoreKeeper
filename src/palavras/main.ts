import './base.css';
import './menu-referencia.css';
import './jogo.css';
import './polimento.css';
import './paineis-refinados.css';
import './diarios.css';
import './consistencia.css';
import './refinamento.css';
import './icones-hud.css';
import { PERGUNTAS, PERGUNTAS_RARAS, type Modo, type Pergunta } from './dados';
import { montarMenu } from './menu';
import { montarJogo } from './jogo';
import { Icon } from './menu';
import { iniciarOndas } from './luz';
import { prepararInterface } from './interface';
import { renderizarRecordes, renderizarDefinicoes, prepararFolha } from './folhas';
import { atualizarDesafioDiario, adaptarPalavraDiaria } from './diarios';
import { WordDiscovery, ReviewCard } from './acabamentos';
import { iniciarEfeitosVisuais } from './efeitos';
import { META_DIARIA, registarConquistaDiaria, prepararResultadoDiario } from './conquista-diaria';
import { VidasHud } from './icones-hud';

type Estado='READY'|'ANSWERING'|'CHECKING'|'CORRECT'|'WRONG'|'GAME_OVER';
type TipoRonda='normal'|'boss'|'relampago'|'armadilha'|'rara'|'jackpot'|'cadeia';
interface Ronda{pergunta:Pergunta;modo:Modo;tipo:TipoRonda;duracao:number;fantasma:boolean;incompleta:boolean;surpresa:boolean;silenciosa:boolean;semBackspace:boolean;id:number}
interface Falha{word:string;answer:string;given:string;modo:Modo}
interface Historico{origem:string;word:string;certo:boolean}
interface Estatisticas{correctas:Record<Modo,number>;erros:Record<Modo,number>;partidas:Record<Modo,number>;melhorCombo:Record<Modo,number>;errosPalavras:Record<string,number>;coleccao:string[];melhorPercurso:Record<Modo,number[]>;medalhas:number;melhorGlobal:number;dia:string;sequenciaDias:number;desafioDia:number;ultimoModo:Modo;vibracao:boolean;movimento:boolean;som:boolean}

const BASE=10_000,ESPERA=760;
const textos:Record<Modo,{nome:string;instrucao:string}>={plural:{nome:'PLURAL',instrucao:'Escreve o plural'},singular:{nome:'SINGULAR',instrucao:'Escreve o singular'},contrario:{nome:'CONTRÁRIO',instrucao:'Escreve o contrário'}};
const VAZIO:Estatisticas={correctas:{plural:0,singular:0,contrario:0},erros:{plural:0,singular:0,contrario:0},partidas:{plural:0,singular:0,contrario:0},melhorCombo:{plural:0,singular:0,contrario:0},errosPalavras:{},coleccao:[],melhorPercurso:{plural:[],singular:[],contrario:[]},medalhas:0,melhorGlobal:0,dia:'',sequenciaDias:0,desafioDia:0,ultimoModo:'plural',vibracao:true,movimento:true,som:true};
function el<T extends HTMLElement>(id:string):T{const n=document.getElementById(id);if(!n)throw new Error(`Falta #${id}`);return n as T;}
function normalizar(v:string):string{return v.trim().normalize('NFC').toLocaleLowerCase('pt-PT');}
function baralhar<T>(itens:T[]):T[]{const a=[...itens];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function lerEstatisticas():Estatisticas{try{const v=JSON.parse(localStorage.getItem('nexus-word:estatisticas:v2')||localStorage.getItem('nexus-word:estatisticas:v1')||'{}');return{...VAZIO,...v,correctas:{...VAZIO.correctas,...v.correctas},erros:{...VAZIO.erros,...v.erros},partidas:{...VAZIO.partidas,...v.partidas},melhorCombo:{...VAZIO.melhorCombo,...v.melhorCombo},errosPalavras:{...VAZIO.errosPalavras,...v.errosPalavras},melhorPercurso:{...VAZIO.melhorPercurso,...v.melhorPercurso},coleccao:Array.isArray(v.coleccao)?v.coleccao:[]};}catch{return structuredClone(VAZIO);}}
let estatisticas=lerEstatisticas();
function guardarEstatisticas():void{try{localStorage.setItem('nexus-word:estatisticas:v2',JSON.stringify(estatisticas));}catch{}}
function vibrar(p:number|number[]):void{if(estatisticas.vibracao)navigator.vibrate?.(p);}

class Som{ctx:AudioContext|null=null;garantir(){if(!estatisticas.som)return;if(!this.ctx)this.ctx=new AudioContext();this.ctx.resume().catch(()=>{});}tocar(freq:number,d=.1,tipo:OscillatorType='sine',vol=.035){if(!estatisticas.som)return;this.garantir();if(!this.ctx)return;const c=this.ctx!,o=c.createOscillator(),g=c.createGain();o.type=tipo;o.frequency.setValueAtTime(freq,c.currentTime);g.gain.setValueAtTime(vol,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+d);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+d);}certo(perfeito=false){this.tocar(perfeito?880:660,.12);window.setTimeout(()=>this.tocar(perfeito?1174:880,.13),65);}erro(){this.tocar(145,.2,'sawtooth',.025);}evento(tipo:TipoRonda){const f={boss:110,jackpot:920,relampago:720,rara:520,armadilha:420,cadeia:620,normal:360}[tipo];this.tocar(f,.18,tipo==='boss'?'sawtooth':'sine',.03);}}
const som=new Som();
const raizMenu=document.getElementById('menu');if(!raizMenu)throw new Error('Falta #menu');montarMenu(raizMenu);iniciarOndas(raizMenu);
const raizJogo=document.getElementById('jogo');if(!raizJogo)throw new Error('Falta #jogo');montarJogo(raizJogo);iniciarOndas(raizJogo);
prepararInterface();
const menu=el<HTMLElement>('menu'),jogo=el<HTMLElement>('jogo'),input=el<HTMLInputElement>('resposta'),confirmar=el<HTMLButtonElement>('confirmar'),feedback=el<HTMLElement>('feedback'),painel=el<HTMLElement>('painel'),barra=el<HTMLElement>('barra-tempo');
let modo:Modo=estatisticas.ultimoModo,estado:Estado='READY',fila:Pergunta[]=[],ronda:Ronda|null=null,pontos=0,vidas=3,combo=0,melhorCombo=0,numero=0,certas=0,erradas=0,tempoRespostas=0;
let inicioPergunta=0,quadro=0,token=0,pausado=false,restantePausa=BASE,duracaoActual=BASE,segundaDisponivel=true,segundaActiva=false,comboFreeze=0,heat=0,onFire=0,finalRushAcertos=0,relampagoRestante=0,perfeitoRun=false,tentativasFalhadas=0;
let cadeia:Pergunta|null=null,modoCadeia:Modo|null=null,percurso:number[]=[],falhas:Falha[]=[],historico:Historico[]=[],timers=new Set<number>();

function agendar(fn:()=>void,ms:number):number{const id=window.setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;}
function limparAssincronos():void{token++;cancelAnimationFrame(quadro);quadro=0;for(const id of timers)clearTimeout(id);timers.clear();}
function recorde(m:Modo):number{try{return Number(localStorage.getItem(`palavra:recorde:${m}`))||0;}catch{return 0;}}
function guardarRecorde():boolean{const anterior=recorde(modo);if(pontos<=anterior)return false;try{localStorage.setItem(`palavra:recorde:${modo}`,String(pontos));}catch{}return true;}
function hoje():string{return new Date().toISOString().slice(0,10);}
function prepararDia():void{if(estatisticas.dia===hoje())return;const ontem=new Date(Date.now()-86400000).toISOString().slice(0,10);estatisticas.sequenciaDias=estatisticas.dia===ontem?estatisticas.sequenciaDias+1:1;estatisticas.dia=hoje();estatisticas.desafioDia=0;guardarEstatisticas();}
function atualizarProgressoDesafio():void{
  prepararDia();
  const anterior=estatisticas.desafioDia;
  estatisticas.desafioDia=Math.max(anterior,combo);
  atualizarDesafioDiario(estatisticas.desafioDia);
  if(anterior<META_DIARIA&&estatisticas.desafioDia>=META_DIARIA){
    guardarEstatisticas();
    registarConquistaDiaria(estatisticas.dia);
  }
}
function nivel(m:Modo):number{return 1+Math.floor(estatisticas.correctas[m]/20);}
function actualizarMenu():void{prepararDia();document.querySelectorAll<HTMLElement>('[data-recorde]').forEach(n=>{const m=n.dataset.recorde as Modo,c=estatisticas.melhorCombo[m];n.querySelector<HTMLElement>('[data-combo-value]')!.textContent=c?`×${c}`:'—';});el('melhor-sequencia').textContent=String(estatisticas.melhorGlobal);el('dias').textContent=String(estatisticas.sequenciaDias);el('dias-jogo').textContent=String(estatisticas.sequenciaDias);atualizarDesafioDiario(estatisticas.desafioDia);document.querySelectorAll<HTMLElement>('button[data-modo]').forEach(n=>{const m=n.dataset.modo as Modo;n.querySelector<HTMLElement>('.nw-level')!.textContent=`NV. ${String(nivel(m)).padStart(2,'0')}`;});}
function definirEstado(n:Estado):void{estado=n;document.documentElement.dataset.estado=n.toLowerCase();if(n==='READY'||n==='ANSWERING'&&!pausado){document.documentElement.dataset.paused='false';el('pausa-texto').textContent='PAUSAR';el('pausa-card').hidden=true;}el<HTMLButtonElement>('pausa').disabled=n!=='ANSWERING';el<HTMLButtonElement>('pular').disabled=n!=='ANSWERING'||pausado;}
function focar():void{requestAnimationFrame(()=>{input.focus({preventScroll:true});input.select();});}
function nomeEvento(r:Ronda):string{return{normal:'RONDA NORMAL',boss:'BOSS WORD',relampago:'RONDA RELÂMPAGO',armadilha:'PALAVRA ARMADILHA',rara:'PALAVRA RARA',jackpot:'JACKPOT WORD',cadeia:'RESPOSTA EM CADEIA'}[r.tipo];}
function multiplicadorPrecisao():number{return combo>=12?2:combo>=7?1.5:combo>=3?1.2:1;}
function hud():void{el('pontos').textContent=pontos.toLocaleString('pt-PT');el('vidas').innerHTML=VidasHud(vidas);el('vidas').setAttribute('aria-label',`${vidas} ${vidas===1?'vida':'vidas'}`);el('combo').textContent=`×${combo}`;el('numero-pergunta').textContent=String(numero).padStart(2,'0');el('nivel-jogo').textContent=`NV. ${String(nivel(modo)).padStart(2,'0')}`;const heatTexto=el('heat-texto');el('heat-barra').style.width=`${onFire?100:heat}%`;heatTexto.textContent=onFire?`A ARDER ×${onFire}`:`${heat}%`;heatTexto.closest<HTMLElement>('.jg-marcador')!.style.setProperty('--hud-calor',String(onFire?1:heat/100));document.documentElement.classList.toggle('on-fire',onFire>0);document.documentElement.classList.toggle('final-rush',vidas===1&&estado!=='GAME_OVER');actualizarFantasma();}
function actualizarFantasma():void{
  const anterior=estatisticas.melhorPercurso[modo]||[],alvo=anterior[Math.max(0,numero-1)];
  const temReferencia=typeof alvo==='number',delta=pontos-(alvo||0),n=el('fantasma-recorde');
  n.textContent=temReferencia?`RECORDE ${delta>=0?'+':''}${delta.toLocaleString('pt-PT')}`:anterior.length?'MAIS LONGE QUE ANTES':'PRIMEIRO PERCURSO';
  n.classList.toggle('a-frente',delta>=0&&temReferencia);
  el('record-comparison-card').classList.toggle('sem-referencia',!temReferencia);
  el('record-empty-caption').textContent=anterior.length?'Uma nova etapa na tua partida.':'A tua primeira marca começa aqui.';
  el('fantasma-barra').style.width=`${temReferencia?Math.max(4,Math.min(100,50+delta/20)):0}%`;
}
function mostrarHistorico():void{const h=el('historico');h.replaceChildren(...historico.slice(-2).map(v=>{const s=document.createElement('span');s.className=v.certo?'ok':'falha';s.innerHTML=`<b>${v.origem.toLocaleUpperCase('pt-PT')}</b><em>→</em><b>${v.word.toLocaleUpperCase('pt-PT')}</b>${Icon({nome:v.certo?'visto':'cruz'})}`;return s;}));}
function relogio(agora:number,id:number):void{if(id!==token||estado!=='ANSWERING'||pausado)return;const restante=Math.max(0,duracaoActual-(agora-inicioPergunta));barra.style.transform=`scaleX(${restante/duracaoActual})`;barra.classList.toggle('urgente',restante<=Math.min(3000,duracaoActual*.35));el('tempo-numero').textContent=`${String(Math.ceil(restante/1000)).padStart(2,'0')}s`;if(restante<=0){validar(true);return;}quadro=requestAnimationFrame(t=>relogio(t,id));}
function eArmadilha(m:Modo,p:Pergunta):boolean{return m!=='contrario'&&/(ão|ães|ões|ãos|[aeiou]l|il|ol|al|ul|m|z|r|s)$/i.test(normalizar(p.word));}
function encherFila(m:Modo):void{const fracas=PERGUNTAS[m].filter(p=>(estatisticas.errosPalavras[`${m}:${p.word}`]||0)>0).sort((a,b)=>(estatisticas.errosPalavras[`${m}:${b.word}`]||0)-(estatisticas.errosPalavras[`${m}:${a.word}`]||0)).slice(0,8);fila=baralhar([...PERGUNTAS[m],...fracas,...fracas.slice(0,3)]);}
function obter(m:Modo,raridade=false):Pergunta{if(raridade)return PERGUNTAS_RARAS[m][Math.floor(Math.random()*PERGUNTAS_RARAS[m].length)];if(!fila.length)encherFila(m);return fila.pop()!;}
function mascarar(v:string):string{const letras=[...v];const ids=letras.map((c,i)=>/\p{L}/u.test(c)?i:-1).filter(i=>i>=0);for(const i of baralhar(ids).slice(0,Math.min(2,Math.max(1,Math.floor(ids.length/4)))))letras[i]='_';return letras.join('');}
function criarRonda():Ronda{const indice=numero+1;let m=modo,p:Pergunta,tipo:TipoRonda='normal';if(cadeia&&modoCadeia){p=cadeia;m=modoCadeia;cadeia=null;modoCadeia=null;tipo='cadeia';}else if(indice%10===0){p=obter(m,true);tipo='boss';}else if(relampagoRestante>0){p=obter(m);tipo='relampago';relampagoRestante--;}else{const sorte=Math.random();if(indice>3&&sorte<.045){p=obter(m,true);tipo='jackpot';}else if(indice>3&&sorte<.105){relampagoRestante=2;p=obter(m);tipo='relampago';}else if(sorte<.18){p=obter(m,true);tipo='rara';}else{p=obter(m);if(eArmadilha(m,p))tipo='armadilha';}}
 let duracao=tipo==='relampago'?2000:tipo==='boss'?15000:tipo==='jackpot'?7000:BASE;if(combo>=8&&(tipo==='boss'||tipo==='rara'||tipo==='armadilha'))duracao+=3000;const especial=['normal','armadilha','rara'].includes(tipo),roll=Math.random();return{pergunta:p,modo:m,tipo,duracao,fantasma:especial&&roll<.055,incompleta:especial&&roll>=.055&&roll<.11,surpresa:especial&&roll>=.11&&roll<.18,silenciosa:especial&&roll>=.18&&roll<.23,semBackspace:especial&&roll>=.23&&roll<.275,id:token};}
function prepararVisualRonda(r:Ronda):void{const palavra=el('palavra'),instrucao=el('instrucao');jogo.dataset.modo=r.modo;palavra.textContent=(r.incompleta?mascarar(r.pergunta.word):r.pergunta.word).toLocaleUpperCase('pt-PT');instrucao.textContent=r.surpresa?'…':textos[r.modo].instrucao;el('modo-etiqueta').textContent=textos[r.modo].nome;el('evento-ronda').textContent=nomeEvento(r);document.documentElement.dataset.evento=r.tipo;document.documentElement.classList.toggle('ronda-silenciosa',r.silenciosa);document.documentElement.classList.toggle('sem-backspace',r.semBackspace);palavra.classList.remove('entrar','desapareceu');void palavra.offsetWidth;palavra.classList.add('entrar');som.evento(r.tipo);if(r.surpresa)agendar(()=>{if(ronda?.id===r.id)instrucao.textContent=textos[r.modo].instrucao;},500);if(r.fantasma)agendar(()=>{if(ronda?.id===r.id)palavra.classList.add('desapareceu');},1000);}
function novaPergunta():void{if(estado==='GAME_OVER')return;limparAssincronos();ronda=criarRonda();ronda.id=token;numero++;duracaoActual=ronda.duracao;restantePausa=duracaoActual;segundaActiva=false;input.value='';input.disabled=false;confirmar.disabled=false;el('resposta-wrap').className='jg-resposta';el('estado-input').textContent=ronda.semBackspace?'SEM BACKSPACE':'A TUA RESPOSTA';feedback.hidden=true;barra.classList.remove('urgente');barra.style.transform='scaleX(1)';prepararVisualRonda(ronda);pausado=false;definirEstado('ANSWERING');hud();inicioPergunta=performance.now();const id=token;quadro=requestAnimationFrame(t=>relogio(t,id));focar();}
function construirDiferenca(dado:string,certo:string):HTMLElement{const span=document.createElement('span'),a=[...normalizar(dado)],b=[...certo];let inicio=0;while(inicio<a.length&&inicio<b.length&&a[inicio]===b[inicio])inicio++;let fim=0;while(fim<a.length-inicio&&fim<b.length-inicio&&a[a.length-1-fim]===b[b.length-1-fim])fim++;span.append(document.createTextNode('RESPOSTA: '+b.slice(0,inicio).join('').toLocaleUpperCase('pt-PT')));const mark=document.createElement('mark');mark.textContent=b.slice(inicio,b.length-fim||b.length).join('').toLocaleUpperCase('pt-PT');span.append(mark,document.createTextNode(fim?b.slice(b.length-fim).join('').toLocaleUpperCase('pt-PT'):''));return span;}
function mostrarFeedback(certo:boolean,ganho=0,dado=''):void{feedback.className=`jg-feedback ${certo?'certo':'errado'}`;el('feedback-titulo').textContent=certo?'CERTO':'ERRADO';const texto=el('feedback-texto');if(certo)texto.textContent=`+${ganho} PONTOS`;else texto.replaceWith(Object.assign(construirDiferenca(dado,ronda!.pergunta.answer),{id:'feedback-texto'}));feedback.hidden=false;const caixa=el('resposta-wrap');caixa.className=`jg-resposta ${certo?'certa':'errada'}`;el('estado-input').textContent=certo?'RESPOSTA CERTA':'RESPOSTA ERRADA';}
function prepararCadeia():void{if(!ronda||Math.random()>.14)return;const p=ronda.pergunta;if(ronda.modo==='plural'){cadeia={word:p.answer,answer:p.word,acceptedAnswers:[p.word]};modoCadeia='singular';}else if(ronda.modo==='singular'){cadeia={word:p.answer,answer:p.word,acceptedAnswers:[p.word]};modoCadeia='plural';}else{cadeia={word:p.answer,answer:p.word,acceptedAnswers:[p.word]};modoCadeia='contrario';}}
function darSegundaOportunidade():void{segundaDisponivel=false;segundaActiva=true;definirEstado('WRONG');feedback.className='jg-feedback oportunidade';el('feedback-titulo').textContent='SEGUNDA OPORTUNIDADE';el('feedback-texto').textContent='CORRIGE SEM PERDER A VIDA';feedback.hidden=false;som.tocar(330,.18);vibrar([18,20,18]);const id=token;agendar(()=>{if(id!==token||!ronda)return;feedback.hidden=true;input.value='';input.disabled=false;confirmar.disabled=false;el('resposta-wrap').className='jg-resposta oportunidade';el('estado-input').textContent='ÚLTIMA TENTATIVA';duracaoActual=5000;barra.style.transform='scaleX(1)';definirEstado('ANSWERING');inicioPergunta=performance.now();quadro=requestAnimationFrame(t=>relogio(t,id));focar();},650);}
function aplicarMarco():void{if(![10,25,50,100].includes(numero))return;document.documentElement.classList.add('milestone');el('evento-ronda').textContent=`CHECKPOINT ${numero}`;vibrar([12,18,28]);agendar(()=>document.documentElement.classList.remove('milestone'),700);if(numero===25&&tentativasFalhadas===0){perfeitoRun=true;estatisticas.medalhas++;guardarEstatisticas();}}
function validar(tempoEsgotado=false):void{if(estado!=='ANSWERING'||!ronda||pausado)return;definirEstado('CHECKING');cancelAnimationFrame(quadro);quadro=0;confirmar.disabled=true;input.disabled=true;const decorrido=Math.min(duracaoActual,performance.now()-inicioPergunta),dado=input.value,resposta=normalizar(dado),aceite=!tempoEsgotado&&ronda.pergunta.acceptedAnswers.some(a=>normalizar(a)===resposta);tempoRespostas+=decorrido;
 if(!aceite&&!tempoEsgotado&&segundaDisponivel&&!segundaActiva){tentativasFalhadas++;darSegundaOportunidade();return;}
 if(aceite){combo++;certas++;melhorCombo=Math.max(melhorCombo,combo);const rapido=decorrido<Math.min(2200,duracaoActual*.35),base={normal:100,boss:300,relampago:150,armadilha:180,rara:230,jackpot:500,cadeia:140}[ronda.tipo],bonus=Math.max(0,Math.round((duracaoActual-decorrido)/duracaoActual*50)),precisao=multiplicadorPrecisao(),fogo=onFire?1.5:1,final=vidas===1?Math.min(2,1+finalRushAcertos*.12):1,ganho=Math.round((base+bonus)*precisao*fogo*final);pontos+=ganho;if(vidas===1)finalRushAcertos++;if(onFire>0)onFire--;else{heat=Math.min(100,heat+(rapido?28:decorrido<5000?18:10));if(heat>=100){heat=0;onFire=5;}}atualizarProgressoDesafio();const chave=`${ronda.modo}:${ronda.pergunta.word}`;estatisticas.errosPalavras[chave]=Math.max(0,(estatisticas.errosPalavras[chave]||0)-1);if(!estatisticas.coleccao.includes(chave))estatisticas.coleccao.push(chave);if(ronda.tipo==='boss')comboFreeze=1;prepararCadeia();definirEstado('CORRECT');mostrarFeedback(true,ganho);if(rapido){el('feedback-titulo').textContent=ronda.tipo==='jackpot'?'JACKPOT!':'PERFEITO';}historico.push({origem:ronda.pergunta.word,word:ronda.pergunta.answer,certo:true});som.certo(rapido);vibrar(ronda.tipo==='boss'?[18,18,35]:18);
 }else{tentativasFalhadas++;erradas++;const preserva=comboFreeze>0;if(preserva)comboFreeze--;else combo=0;heat=Math.max(0,heat-35);onFire=0;vidas--;finalRushAcertos=0;const chave=`${ronda.modo}:${ronda.pergunta.word}`;estatisticas.errosPalavras[chave]=(estatisticas.errosPalavras[chave]||0)+1;falhas.push({word:ronda.pergunta.word,answer:ronda.pergunta.answer,given:dado,modo:ronda.modo});historico.push({origem:ronda.pergunta.word,word:ronda.pergunta.answer,certo:false});definirEstado('WRONG');mostrarFeedback(false,0,dado);if(preserva)el('feedback-titulo').textContent='COMBO PROTEGIDO';som.erro();vibrar([35,25,45]);}
 percurso.push(pontos);mostrarHistorico();aplicarMarco();hud();const id=token;agendar(()=>{if(id!==token)return;input.value='';if(vidas<=0)terminar();else novaPergunta();},ESPERA);}
function terminar():void{
  limparAssincronos();definirEstado('GAME_OVER');input.blur();document.documentElement.classList.remove('ronda-silenciosa','on-fire','final-rush');
  const novo=guardarRecorde();estatisticas.correctas[modo]+=certas;estatisticas.erros[modo]+=erradas;estatisticas.partidas[modo]++;
  estatisticas.melhorCombo[modo]=Math.max(estatisticas.melhorCombo[modo],melhorCombo);estatisticas.melhorGlobal=Math.max(estatisticas.melhorGlobal,melhorCombo);estatisticas.ultimoModo=modo;
  if(novo)estatisticas.melhorPercurso[modo]=[...percurso];guardarEstatisticas();
  prepararResultadoDiario(hoje());
  painel.classList.toggle('resultado-recorde',novo);painel.hidden=false;
  el('painel-etiqueta').textContent=`${textos[modo].nome} · ${numero} RESPOSTAS`;el('painel-titulo').textContent=pontos.toLocaleString('pt-PT');el('painel-texto').textContent=novo?'NOVO RECORDE':'RECORDE '+recorde(modo).toLocaleString('pt-PT');
  el('resultado-frase').textContent=novo?'Superaste-te. Boa jogada!':certas?'Cada palavra conta. Continua!':'A próxima palavra é um novo começo.';
  el('resumo-certas').textContent=String(certas);el('resumo-erradas').textContent=String(erradas);el('resumo-combo').textContent=`×${melhorCombo}`;el('resumo-tempo').textContent=`${(tempoRespostas/Math.max(1,numero)/1000).toLocaleString('pt-PT',{minimumFractionDigits:1,maximumFractionDigits:1})}s`;
  el('medalha-perfeita').hidden=!perfeitoRun;el<HTMLButtonElement>('rever-erros').hidden=!falhas.length;actualizarMenu();vibrar([55,35,75]);
}
function contagem():void{limparAssincronos();definirEstado('READY');const caixa=el<HTMLElement>('contagem'),n=el('contagem-numero');caixa.hidden=false;el('contagem-modo').textContent=textos[modo].nome;let valor=3;const id=token;const passo=()=>{if(id!==token)return;n.textContent=String(valor);n.classList.remove('pulso');void n.offsetWidth;n.classList.add('pulso');vibrar(5);valor--;if(valor>=0)agendar(passo,620);else{caixa.hidden=true;novaPergunta();}};passo();}
function iniciar(m:Modo):void{som.garantir();limparAssincronos();modo=m;fila=[];ronda=null;pontos=0;vidas=3;combo=0;melhorCombo=0;numero=0;certas=0;erradas=0;tempoRespostas=0;pausado=false;segundaDisponivel=true;segundaActiva=false;comboFreeze=0;heat=0;onFire=0;finalRushAcertos=0;relampagoRestante=0;perfeitoRun=false;tentativasFalhadas=0;cadeia=null;modoCadeia=null;percurso=[];falhas=[];historico=[];input.value='';input.disabled=false;confirmar.disabled=false;feedback.hidden=true;painel.hidden=true;mostrarHistorico();menu.hidden=true;jogo.hidden=false;definirEstado('READY');hud();contagem();}
function irMenu():void{limparAssincronos();definirEstado('READY');input.blur();document.documentElement.classList.remove('ronda-silenciosa','on-fire','final-rush');jogo.hidden=true;menu.hidden=false;painel.hidden=true;el('revisao').hidden=true;actualizarMenu();}
function alternarPausa():void{if(estado!=='ANSWERING'||!ronda)return;pausado=!pausado;document.documentElement.dataset.paused=String(pausado);el('pausa-card').hidden=!pausado;el<HTMLButtonElement>('pular').disabled=pausado;if(pausado){restantePausa=Math.max(0,duracaoActual-(performance.now()-inicioPergunta));cancelAnimationFrame(quadro);input.disabled=true;confirmar.disabled=true;el('pausa-texto').textContent='RETOMAR';el('estado-input').textContent='EM PAUSA';input.blur();el('retomar-card').focus({preventScroll:true});}else{inicioPergunta=performance.now()-(duracaoActual-restantePausa);input.disabled=false;confirmar.disabled=false;el('pausa-texto').textContent='PAUSAR';el('estado-input').textContent=ronda.semBackspace?'SEM BACKSPACE':'A TUA RESPOSTA';const id=token;quadro=requestAnimationFrame(t=>relogio(t,id));focar();}}
document.querySelectorAll<HTMLButtonElement>('[data-modo]').forEach(b=>b.addEventListener('click',()=>iniciar(b.dataset.modo as Modo)));confirmar.addEventListener('click',()=>validar(false));input.addEventListener('keydown',e=>{if(ronda?.semBackspace&&(e.key==='Backspace'||e.key==='Delete'))e.preventDefault();if(e.key==='Enter'){e.preventDefault();validar(false);}});input.addEventListener('beforeinput',e=>{if(ronda?.semBackspace&&e.inputType.startsWith('delete'))e.preventDefault();});input.addEventListener('input',()=>{const alvo=ronda?.pergunta.answer.length||1,progresso=Math.min(1,[...input.value.trim()].length/alvo),caixa=el('resposta-wrap');caixa.classList.toggle('preenchida',Boolean(input.value.trim()));caixa.style.setProperty('--progresso',String(progresso));});el('voltar').addEventListener('click',irMenu);el('ir-menu').addEventListener('click',irMenu);el('jogar-novamente').addEventListener('click',()=>iniciar(modo));el('pausa').addEventListener('click',alternarPausa);
el('pular').addEventListener('click',()=>{if(estado==='ANSWERING')validar(true);});
el('retomar-card').addEventListener('click',alternarPausa);
const botaoSom=el<HTMLButtonElement>('som');
function mostrarSom():void{botaoSom.setAttribute('aria-pressed',String(estatisticas.som));el('som-texto').textContent=estatisticas.som?'SOM':'MUDO';}
botaoSom.addEventListener('click',()=>{estatisticas.som=!estatisticas.som;guardarEstatisticas();mostrarSom();if(estatisticas.som)som.garantir();});
mostrarSom();
const folha=el<HTMLElement>('folha'),conteudo=el<HTMLElement>('folha-conteudo');
function abrirFolha(tipo:'recordes'|'definicoes'):void{
  prepararFolha(tipo);
  el('folha-titulo').textContent=tipo==='recordes'?'Recordes':'Definições';
  if(tipo==='recordes'){
    conteudo.innerHTML=renderizarRecordes((Object.keys(textos) as Modo[]).map(m=>({modo:m,nome:textos[m].nome,nivel:nivel(m),dominio:Math.round(estatisticas.correctas[m]/Math.max(1,estatisticas.correctas[m]+estatisticas.erros[m])*100),combo:estatisticas.melhorCombo[m],pontos:recorde(m)})),estatisticas.coleccao.length,estatisticas.medalhas);
  }else{
    conteudo.innerHTML=renderizarDefinicoes(estatisticas);
    conteudo.querySelectorAll<HTMLButtonElement>('[data-opcao]').forEach(b=>b.onclick=()=>{
      const k=b.dataset.opcao as 'som'|'vibracao'|'movimento';
      estatisticas[k]=!estatisticas[k];guardarEstatisticas();
      document.documentElement.classList.toggle('reduzir-movimento',!estatisticas.movimento);
      if(k==='som'){mostrarSom();if(estatisticas.som)som.garantir();}
      abrirFolha('definicoes');
      conteudo.querySelector<HTMLButtonElement>(`[data-opcao="${k}"]`)?.focus({preventScroll:true});
    });
  }
  folha.hidden=false;
}
function fecharFolha():void{folha.hidden=true;}
el('abrir-recordes').addEventListener('click',()=>abrirFolha('recordes'));el('abrir-definicoes').addEventListener('click',()=>abrirFolha('definicoes'));el('abrir-desafio-dia').addEventListener('click',()=>iniciar(estatisticas.ultimoModo));el('ver-palavra-dia').addEventListener('click',()=>{prepararFolha('palavra');el('folha-titulo').textContent='Palavra do dia';conteudo.replaceChildren(WordDiscovery(el('palavra-dia').textContent||'',el('significado-dia').textContent||''));folha.hidden=false;});el('fechar-folha').addEventListener('click',fecharFolha);el('fechar-folha-x').addEventListener('click',fecharFolha);
el('rever-erros').addEventListener('click',()=>{el('lista-erros').replaceChildren(...falhas.map((f,i)=>ReviewCard(f,i)));el('revisao').hidden=false;});el('fechar-revisao').addEventListener('click',()=>el('revisao').hidden=true);
// Exemplos estáveis como na referência: a animação pertence às peças e botões,
// não à mudança inesperada de palavras enquanto se escolhe um modo.
window.visualViewport?.addEventListener('resize',()=>document.documentElement.style.setProperty('--altura-app',`${window.visualViewport!.height}px`));document.addEventListener('visibilitychange',()=>{if(document.hidden&&estado==='ANSWERING'&&!pausado)alternarPausa();});
const PALAVRAS_DIA=[['PERSPICAZ','que compreende depressa'],['SERENDIPIDADE','descoberta feliz por acaso'],['EFÉMERO','que dura pouco tempo'],['INTRÉPIDO','que não receia o perigo'],['SINGELO','simples e sem artifício'],['LACÓNICO','expressão em poucas palavras'],['UBÍQUO','presente em toda a parte']];const pd=PALAVRAS_DIA[Math.floor(Date.now()/86400000)%PALAVRAS_DIA.length];el('palavra-dia').textContent=pd[0];el('significado-dia').textContent=pd[1];adaptarPalavraDiaria();prepararDia();actualizarMenu();document.documentElement.classList.toggle('reduzir-movimento',!estatisticas.movimento);definirEstado('READY');

const pararEfeitos = iniciarEfeitosVisuais();
if (import.meta.hot) import.meta.hot.dispose(pararEfeitos);
