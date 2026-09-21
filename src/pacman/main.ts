import { COLUNAS_MAZE, Labirinto, LINHAS_MAZE, MAPA_BASE, type DirecaoMaze, type Entidade, type Fantasma } from './logica';

const CHAVE = 'nexus:maze:recorde:v1';
const MATIZES = [348, 318, 188, 28];
function el<T extends HTMLElement>(id:string):T { const e=document.getElementById(id); if(!e)throw new Error(`#${id}`); return e as T; }
function vibrar(p:number|number[]):void { if('vibrate'in navigator)navigator.vibrate(p); }

class AudioMaze {
  private ctx:AudioContext|null=null; private mestre:GainNode|null=null; private alterna=false;
  private garantir():boolean { if(localStorage.getItem('serpente:som:v1')==='off')return false;if(this.ctx){if(this.ctx.state==='suspended')void this.ctx.resume();return true;}try{this.ctx=new AudioContext();this.mestre=this.ctx.createGain();this.mestre.gain.value=.2;this.mestre.connect(this.ctx.destination);return true;}catch{return false;} }
  private tom(freq:number,dur=.08,volume=.16,onda:OscillatorType='sine',fim=freq):void{if(!this.garantir()||!this.ctx||!this.mestre)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=onda;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,fim),t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(this.mestre);o.start(t);o.stop(t+dur+.02);}
  comer():void{this.alterna=!this.alterna;this.tom(this.alterna?310:370,.045,.08,'triangle');}
  pulso():void{[330,495,660].forEach((f,i)=>setTimeout(()=>this.tom(f,.15,.17,'sine',f*1.2),i*45));}
  capturar(combo:number):void{this.tom(520*2**Math.min(2,combo/12),.22,.2,'triangle',920);}
  morrer():void{this.tom(260,.55,.24,'sawtooth',55);}
  nivel():void{[440,554,660,880].forEach((f,i)=>setTimeout(()=>this.tom(f,.2,.16,'triangle'),i*65));}
  acordar():void{this.garantir();}
}

export function montarMaze(aoMenu:()=>void):{activar():void;desactivar():void}{
  const raiz=el<HTMLElement>('maze-jogo'), canvas=el<HTMLCanvasElement>('maze-canvas'), ctx=canvas.getContext('2d')!;
  const overlay=el<HTMLElement>('maze-overlay'), iniciar=el<HTMLButtonElement>('maze-iniciar'), mensagem=el<HTMLElement>('maze-mensagem');
  const arena=el<HTMLElement>('maze-arena'), jogo=new Labirinto();
  const audio=new AudioMaze();
  let activo=false, ultimo=performance.now(), acumulado=0, mensagemAte=0, tempo=0;
  let recordeGuardado=0;
  type Particula={x:number;y:number;vx:number;vy:number;vida:number;matiz:number;tamanho:number}; const particulas:Particula[]=[];
  try{jogo.recorde=Number(localStorage.getItem(CHAVE))||0;recordeGuardado=jogo.recorde;}catch{/* sessão */}
  const cel=canvas.width/COLUNAS_MAZE;

  function pos(e:Entidade,p:number):{x:number;y:number}{ return {x:(e.anterior.x+(e.x-e.anterior.x)*p+.5)*cel,y:(e.anterior.y+(e.y-e.anterior.y)*p+.5)*cel}; }
  function tema():number{return Number(getComputedStyle(document.documentElement).getPropertyValue('--tema'))||188;}
  function explosao(x:number,y:number,matiz:number,n=14):void{for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=35+Math.random()*130;particulas.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,vida:350+Math.random()*350,matiz,tamanho:1.5+Math.random()*4});}}

  function sentinela(f:Fantasma,p:number):void{
    const q=pos(f,p), assustado=f.estado==='assustado', olhos=f.estado==='olhos', h=assustado?220:MATIZES[f.id];
    ctx.save();ctx.translate(q.x,q.y);ctx.rotate(Math.PI/4);ctx.shadowColor=`hsl(${h} 90% 62% / .7)`;ctx.shadowBlur=olhos?4:12;
    ctx.fillStyle=olhos?'rgba(180,220,255,.18)':`hsl(${h} ${assustado?55:78}% ${assustado?42:55}%)`;
    ctx.beginPath();ctx.roundRect(-cel*.32,-cel*.32,cel*.64,cel*.64,cel*.16);ctx.fill();
    if(!olhos){ctx.strokeStyle=`hsl(${h} 95% 82% / .75)`;ctx.lineWidth=1.4;ctx.stroke();}
    ctx.rotate(-Math.PI/4);ctx.shadowBlur=0;ctx.fillStyle=assustado?'#d7f1ff':'#07110d';
    const dx=f.direcao==='direita'?2:f.direcao==='esquerda'?-2:0,dy=f.direcao==='baixo'?2:f.direcao==='cima'?-2:0;
    ctx.beginPath();ctx.ellipse(dx-5,dy,2.7,4,0,0,Math.PI*2);ctx.ellipse(dx+5,dy,2.7,4,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  function desenhar(p:number):void{
    const h=tema();ctx.clearRect(0,0,canvas.width,canvas.height);
    const bg=ctx.createRadialGradient(canvas.width/2,canvas.height*.48,20,canvas.width/2,canvas.height*.48,canvas.height*.7);bg.addColorStop(0,`hsl(${h} 28% 8%)`);bg.addColorStop(1,`hsl(${h} 30% 2.5%)`);ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);
    for(let y=0;y<LINHAS_MAZE;y++)for(let x=0;x<COLUNAS_MAZE;x++){
      if(MAPA_BASE[y][x]==='#'){
        const px=x*cel,py=y*cel;ctx.fillStyle=`hsl(${h} 35% 8%)`;ctx.fillRect(px,py,cel,cel);
        ctx.strokeStyle=`hsla(${h},82%,62%,.24)`;ctx.lineWidth=1.2;ctx.strokeRect(px+2.5,py+2.5,cel-5,cel-5);
      }else{
        const tipo=jogo.mapa[y][x];
        if(tipo==='.') {ctx.fillStyle=`hsl(${h} 80% 76%)`;ctx.beginPath();ctx.arc((x+.5)*cel,(y+.5)*cel,2.2,0,Math.PI*2);ctx.fill();}
        else if(tipo==='o'){const pulso=5+Math.sin(tempo*.007)*1.8;ctx.shadowColor=`hsl(${h} 95% 70%)`;ctx.shadowBlur=14;ctx.fillStyle=`hsl(${h} 90% 80%)`;ctx.beginPath();ctx.arc((x+.5)*cel,(y+.5)*cel,pulso,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
      }
    }
    if(jogo.fruta){const x=(jogo.fruta.x+.5)*cel,y=(jogo.fruta.y+.5)*cel;ctx.save();ctx.translate(x,y);ctx.rotate(tempo*.002);ctx.fillStyle=`hsl(${(h+145)%360} 82% 62%)`;ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=14;ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?4:9;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.restore();}
    for(const f of jogo.fantasmas)sentinela(f,p);
    const j=pos(jogo.jogador,p), energia=jogo.energia>0;
    ctx.save();ctx.translate(j.x,j.y);ctx.shadowColor=`hsl(${h} 100% 68%)`;ctx.shadowBlur=18;const g=ctx.createRadialGradient(-4,-5,1,0,0,cel*.4);g.addColorStop(0,'white');g.addColorStop(.3,`hsl(${h} 95% 78%)`);g.addColorStop(1,`hsl(${h} 80% 43%)`);ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,cel*.31,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=`hsla(${(h+80)%360},90%,80%,${energia ? .95 : .42})`;ctx.lineWidth=energia?3:1.5;ctx.beginPath();ctx.arc(0,0,cel*(.39+Math.sin(tempo*.012)*.025),tempo*.004,tempo*.004+Math.PI*1.35);ctx.stroke();ctx.restore();
    ctx.save();ctx.globalCompositeOperation='lighter';for(const q of particulas){ctx.globalAlpha=Math.max(0,q.vida/700);ctx.fillStyle=`hsl(${q.matiz} 95% 70%)`;ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=7;ctx.beginPath();ctx.arc(q.x,q.y,q.tamanho,0,Math.PI*2);ctx.fill();}ctx.restore();
  }

  function actualizarParticulas(dt:number):void{for(let i=particulas.length-1;i>=0;i--){const q=particulas[i];q.vida-=dt;q.x+=q.vx*dt/1000;q.y+=q.vy*dt/1000;q.vx*=.97;q.vy*=.97;if(q.vida<=0)particulas.splice(i,1);}}
  function hud():void{el('maze-pontos').textContent=jogo.pontos.toLocaleString();el('maze-nivel').textContent=String(jogo.nivel);el('maze-vidas').textContent=Array(Math.max(0,jogo.vidas)).fill('◆').join(' ');el('maze-recorde').textContent=jogo.recorde.toLocaleString();}
  function anunciar(texto:string,dur=900):void{mensagem.textContent=texto;mensagem.classList.remove('impacto');void mensagem.offsetWidth;mensagem.classList.add('impacto');mensagemAte=performance.now()+dur;}
  function tratar():void{
    const ev=jogo.passo(), p=pos(jogo.jogador,1);
    if(ev.comeu){explosao(p.x,p.y,tema(),ev.energia?24:4);audio.comer();if(ev.energia){audio.pulso();anunciar('PULSO ATIVO',1100);vibrar([12,18,12]);}}
    if(ev.fantasma){explosao(p.x,p.y,MATIZES[(jogo.comboFantasmas-1)%4],35);audio.capturar(jogo.comboFantasmas);anunciar(`SENTINELA +${ev.fantasma}`,1000);vibrar([18,20,28]);}
    if(ev.fruta){explosao(p.x,p.y,(tema()+145)%360,30);anunciar('NÚCLEO RECOLHIDO');vibrar([10,15,25]);}
    if(ev.morreu){audio.morrer();anunciar(ev.terminou?'FIM DO CIRCUITO':'NÚCLEO INSTÁVEL',1300);arena.classList.remove('maze-impacto');void arena.offsetWidth;arena.classList.add('maze-impacto');vibrar([45,25,70]);}
    if(ev.nivel){audio.nivel();anunciar(`CIRCUITO ${jogo.nivel}`,1500);vibrar([15,20,15,20,35]);}
    if(jogo.pontos>jogo.recorde)jogo.recorde=jogo.pontos;
    if(jogo.recorde>recordeGuardado)try{localStorage.setItem(CHAVE,String(jogo.recorde));recordeGuardado=jogo.recorde;}catch{/* sessão */}
    if(ev.terminou){overlay.querySelector('small')!.textContent='CIRCUITO TERMINADO';overlay.querySelector('h1')!.innerHTML=`${jogo.pontos.toLocaleString()}<br><em>pontos.</em>`;overlay.querySelector('p')!.textContent=`Nível ${jogo.nivel} · recorde ${jogo.recorde.toLocaleString()}`;iniciar.innerHTML='JOGAR OUTRA VEZ <span>↻</span>';overlay.hidden=false;}
    hud();
  }

  function direcao(d:DirecaoMaze):void{audio.acordar();jogo.pedir(d);overlay.hidden=true;vibrar(4);}
  document.querySelectorAll<HTMLButtonElement>('[data-maze]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();direcao(b.dataset.maze as DirecaoMaze);}));
  let toque:{x:number;y:number}|null=null;canvas.addEventListener('pointerdown',e=>{toque={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointerup',e=>{if(!toque)return;const dx=e.clientX-toque.x,dy=e.clientY-toque.y;toque=null;if(Math.hypot(dx,dy)<12)return;direcao(Math.abs(dx)>Math.abs(dy)?dx>0?'direita':'esquerda':dy>0?'baixo':'cima');});
  window.addEventListener('keydown',e=>{if(!activo)return;const m:Record<string,DirecaoMaze>={ArrowUp:'cima',KeyW:'cima',ArrowDown:'baixo',KeyS:'baixo',ArrowLeft:'esquerda',KeyA:'esquerda',ArrowRight:'direita',KeyD:'direita'};if(m[e.code]){e.preventDefault();direcao(m[e.code]);}});
  iniciar.addEventListener('click',()=>{audio.acordar();if(jogo.estado==='fim')jogo.reiniciar();jogo.iniciar();overlay.hidden=true;acumulado=0;anunciar(`CIRCUITO ${jogo.nivel}`);hud();});
  el('maze-pausa').addEventListener('click',()=>{jogo.pausar();anunciar(jogo.estado==='pausa'?'EM PAUSA':`CIRCUITO ${jogo.nivel}`);});el('maze-menu').addEventListener('click',()=>{if(jogo.estado==='jogar')jogo.pausar();aoMenu();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&activo&&jogo.estado==='jogar')jogo.pausar();});
  function quadro(agora:number):void{const dt=Math.min(50,agora-ultimo);ultimo=agora;tempo=agora;if(activo){if(jogo.estado==='jogar'){acumulado+=dt;let guarda=4;while(acumulado>=jogo.intervalo()&&guarda-->0){acumulado-=jogo.intervalo();tratar();}}actualizarParticulas(dt);if(mensagemAte&&agora>mensagemAte){mensagem.textContent=jogo.estado==='pausa'?'EM PAUSA':`CIRCUITO ${jogo.nivel}`;mensagem.classList.remove('impacto');mensagemAte=0;}desenhar(Math.min(1,acumulado/jogo.intervalo()));}requestAnimationFrame(quadro);}
  requestAnimationFrame(quadro);hud();desenhar(1);
  return{activar(){activo=true;raiz.hidden=false;ultimo=performance.now();},desactivar(){activo=false;raiz.hidden=true;if(jogo.estado==='jogar')jogo.pausar();}};
}
