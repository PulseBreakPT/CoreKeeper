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
  function matizJogador():number{return Number(getComputedStyle(document.documentElement).getPropertyValue('--maze-personagem'))||42;}
  function explosao(x:number,y:number,matiz:number,n=14):void{for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=35+Math.random()*130;particulas.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,vida:350+Math.random()*350,matiz,tamanho:1.5+Math.random()*4});}}

  function sentinela(f:Fantasma,p:number):void{
    const q=pos(f,p), assustado=f.estado==='assustado', olhos=f.estado==='olhos', h=assustado?220:MATIZES[f.id];
    ctx.save();ctx.translate(q.x,q.y);ctx.rotate(Math.PI/4);ctx.shadowColor=`hsl(${h} 90% 62% / .7)`;ctx.shadowBlur=olhos?4:12;
    const corpo=ctx.createLinearGradient(-cel*.3,-cel*.3,cel*.3,cel*.3);corpo.addColorStop(0,olhos?'rgba(210,235,255,.2)':`hsl(${h} ${assustado?62:94}% ${assustado?68:72}%)`);corpo.addColorStop(.48,olhos?'rgba(140,190,230,.14)':`hsl(${h} ${assustado?58:82}% ${assustado?45:54}%)`);corpo.addColorStop(1,olhos?'rgba(90,140,190,.08)':`hsl(${h} 76% 32%)`);ctx.fillStyle=corpo;
    ctx.beginPath();ctx.roundRect(-cel*.32,-cel*.32,cel*.64,cel*.64,cel*.16);ctx.fill();
    if(!olhos){ctx.strokeStyle=`hsl(${h} 95% 82% / .75)`;ctx.lineWidth=1.4;ctx.stroke();}
    if(!olhos){ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(-cel*.17,-cel*.22);ctx.lineTo(cel*.13,-cel*.22);ctx.stroke();}
    ctx.rotate(-Math.PI/4);ctx.shadowBlur=0;ctx.fillStyle=assustado?'#d7f1ff':'#07110d';
    const dx=f.direcao==='direita'?2:f.direcao==='esquerda'?-2:0,dy=f.direcao==='baixo'?2:f.direcao==='cima'?-2:0;
    ctx.beginPath();ctx.ellipse(dx-5,dy,2.7,4,0,0,Math.PI*2);ctx.ellipse(dx+5,dy,2.7,4,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  function desenhar(p:number):void{
    const h=tema(),hp=matizJogador();
    ctx.clearRect(0,0,canvas.width,canvas.height);

    const bg=ctx.createRadialGradient(canvas.width*.5,canvas.height*.44,20,canvas.width*.5,canvas.height*.5,canvas.height*.76);
    bg.addColorStop(0,'#14171c');
    bg.addColorStop(.62,'#0b0d10');
    bg.addColorStop(1,'#060709');
    ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);

    // Circuito técnico subtil por baixo do labirinto.
    ctx.save();ctx.globalAlpha=.09;ctx.strokeStyle=`hsl(${h} 80% 64%)`;ctx.lineWidth=.7;
    for(let x=cel*.5;x<canvas.width;x+=cel){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}
    for(let y=cel*.5;y<canvas.height;y+=cel){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();}
    ctx.restore();

    for(let y=0;y<LINHAS_MAZE;y++)for(let x=0;x<COLUNAS_MAZE;x++){
      if(MAPA_BASE[y][x]==='#'){
        const px=x*cel,py=y*cel,m=2.2;
        const parede=ctx.createLinearGradient(px,py,px+cel,py+cel);
        parede.addColorStop(0,'#20242b');
        parede.addColorStop(.55,'#12151a');
        parede.addColorStop(1,'#0a0c0f');
        ctx.fillStyle=parede;ctx.beginPath();ctx.roundRect(px+m,py+m,cel-m*2,cel-m*2,cel*.18);ctx.fill();
        ctx.strokeStyle=`hsla(${h},92%,68%,.32)`;ctx.lineWidth=1.25;ctx.stroke();
        ctx.strokeStyle=`hsla(${h},100%,82%,.12)`;ctx.lineWidth=.75;ctx.beginPath();ctx.moveTo(px+cel*.24,py+cel*.22);ctx.lineTo(px+cel*.76,py+cel*.22);ctx.stroke();
      }else{
        const tipo=jogo.mapa[y][x],cx=(x+.5)*cel,cy=(y+.5)*cel;
        if(tipo==='.'){
          ctx.shadowColor='#ffc928';ctx.shadowBlur=5;ctx.fillStyle='#ffd84d';ctx.beginPath();ctx.arc(cx,cy,2.35,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        }else if(tipo==='o'){
          const pulso=5.2+Math.sin(tempo*.007)*1.5;
          ctx.shadowColor='#ffc928';ctx.shadowBlur=18;ctx.fillStyle='#fff1a6';ctx.beginPath();ctx.arc(cx,cy,pulso,0,Math.PI*2);ctx.fill();
          ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,196,20,.75)';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(cx,cy,pulso+3+Math.sin(tempo*.006),0,Math.PI*2);ctx.stroke();
        }
      }
    }

    if(jogo.fruta){
      const x=(jogo.fruta.x+.5)*cel,y=(jogo.fruta.y+.5)*cel;
      ctx.save();ctx.translate(x,y);ctx.rotate(tempo*.0016);ctx.shadowColor='#ffbe18';ctx.shadowBlur=18;
      const nucleo=ctx.createRadialGradient(-2,-3,1,0,0,10);nucleo.addColorStop(0,'#fffbd1');nucleo.addColorStop(.38,'#ffe35b');nucleo.addColorStop(1,'#d99400');ctx.fillStyle=nucleo;
      ctx.beginPath();for(let i=0;i<12;i++){const a=i*Math.PI/6-Math.PI/2,r=i%2?5:10;const px=Math.cos(a)*r,py=Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();ctx.restore();
    }

    for(const f of jogo.fantasmas)sentinela(f,p);
    const j=pos(jogo.jogador,p),energia=jogo.energia>0,v={cima:[0,-1],baixo:[0,1],esquerda:[-1,0],direita:[1,0]}[jogo.jogador.direcao] as number[];
    ctx.save();ctx.translate(j.x,j.y);
    for(let i=3;i>=1;i--){ctx.globalAlpha=.055*(4-i);ctx.fillStyle=`hsl(${hp} 90% 58%)`;ctx.beginPath();ctx.arc(-v[0]*i*4,-v[1]*i*4,cel*(.18-i*.02),0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;ctx.shadowColor=`hsl(${hp} 100% 58%)`;ctx.shadowBlur=20;
    const g=ctx.createRadialGradient(-5,-6,1,0,0,cel*.42);g.addColorStop(0,'white');g.addColorStop(.27,`hsl(${hp} 98% 82%)`);g.addColorStop(.7,`hsl(${hp} 88% 56%)`);g.addColorStop(1,`hsl(${hp} 82% 36%)`);
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,cel*.32,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle=`hsl(${hp} 48% 12%)`;ctx.beginPath();ctx.arc(v[0]*6-v[1]*4,v[1]*6+v[0]*4,2.1,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=`hsla(${(hp+70)%360},95%,82%,${energia ? .98 : .48})`;ctx.lineWidth=energia?3:1.5;ctx.beginPath();ctx.arc(0,0,cel*(.4+Math.sin(tempo*.012)*.024),tempo*.004,tempo*.004+Math.PI*1.35);ctx.stroke();ctx.restore();

    ctx.save();ctx.globalCompositeOperation='lighter';for(const q of particulas){ctx.globalAlpha=Math.max(0,q.vida/700);ctx.fillStyle=`hsl(${q.matiz} 95% 70%)`;ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=7;ctx.beginPath();ctx.arc(q.x,q.y,q.tamanho,0,Math.PI*2);ctx.fill();}ctx.restore();
  }

  function actualizarParticulas(dt:number):void{for(let i=particulas.length-1;i>=0;i--){const q=particulas[i];q.vida-=dt;q.x+=q.vx*dt/1000;q.y+=q.vy*dt/1000;q.vx*=.97;q.vy*=.97;if(q.vida<=0)particulas.splice(i,1);}}
  function hud():void{el('maze-pontos').textContent=jogo.pontos.toLocaleString();el('maze-nivel').textContent=String(jogo.nivel);el('maze-vidas').textContent=Array(Math.max(0,jogo.vidas)).fill('◆').join(' ');el('maze-recorde').textContent=jogo.recorde.toLocaleString();}
  function anunciar(texto:string,dur=900):void{mensagem.textContent=texto;mensagem.classList.remove('impacto');void mensagem.offsetWidth;mensagem.classList.add('impacto');mensagemAte=performance.now()+dur;}
  function tratar():void{
    const ev=jogo.passo(), p=pos(jogo.jogador,1);
    if(ev.comeu){explosao(p.x,p.y,48,ev.energia?24:4);audio.comer();if(ev.energia){audio.pulso();anunciar('PULSO ATIVO',1100);arena.classList.remove('maze-pulso');void arena.offsetWidth;arena.classList.add('maze-pulso');vibrar([12,18,12]);}}
    if(ev.fantasma){explosao(p.x,p.y,MATIZES[(jogo.comboFantasmas-1)%4],35);audio.capturar(jogo.comboFantasmas);anunciar(`SENTINELA +${ev.fantasma}`,1000);vibrar([18,20,28]);}
    if(ev.fruta){explosao(p.x,p.y,48,30);anunciar('NÚCLEO RECOLHIDO');vibrar([10,15,25]);}
    if(ev.morreu){audio.morrer();anunciar(ev.terminou?'FIM DO CIRCUITO':'NÚCLEO INSTÁVEL',1300);arena.classList.remove('maze-impacto');void arena.offsetWidth;arena.classList.add('maze-impacto');vibrar([45,25,70]);}
    if(ev.nivel){audio.nivel();anunciar(`CIRCUITO ${jogo.nivel}`,1500);vibrar([15,20,15,20,35]);}
    if(jogo.pontos>jogo.recorde)jogo.recorde=jogo.pontos;
    if(jogo.recorde>recordeGuardado)try{localStorage.setItem(CHAVE,String(jogo.recorde));recordeGuardado=jogo.recorde;}catch{/* sessão */}
    if(ev.terminou){overlay.querySelector('small')!.textContent='CIRCUITO TERMINADO';overlay.querySelector('h1')!.innerHTML=`${jogo.pontos.toLocaleString()}<br><em>pontos.</em>`;overlay.querySelector('p')!.textContent=`Nível ${jogo.nivel} · recorde ${jogo.recorde.toLocaleString()}`;iniciar.innerHTML='JOGAR OUTRA VEZ <span>↻</span>';overlay.hidden=false;}
    hud();
  }

  function direcao(d:DirecaoMaze):void{audio.acordar();const arrancou=jogo.estado==='pronto';jogo.pedir(d);if(arrancou)acumulado=jogo.intervalo();overlay.hidden=true;vibrar(4);}
  document.querySelectorAll<HTMLButtonElement>('[data-maze]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();direcao(b.dataset.maze as DirecaoMaze);}));
  let toque:{x:number;y:number}|null=null;
  const lerGesto=(e:PointerEvent,final=false):void=>{
    if(!toque)return;const dx=e.clientX-toque.x,dy=e.clientY-toque.y;
    if(Math.hypot(dx,dy)<10){if(final)toque=null;return;}
    direcao(Math.abs(dx)>Math.abs(dy)?dx>0?'direita':'esquerda':dy>0?'baixo':'cima');
    toque=final?null:{x:e.clientX,y:e.clientY};
  };
  canvas.addEventListener('pointerdown',e=>{toque={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>lerGesto(e));
  canvas.addEventListener('pointerup',e=>lerGesto(e,true));
  canvas.addEventListener('pointercancel',()=>{toque=null;});
  window.addEventListener('keydown',e=>{if(!activo)return;const m:Record<string,DirecaoMaze>={ArrowUp:'cima',KeyW:'cima',ArrowDown:'baixo',KeyS:'baixo',ArrowLeft:'esquerda',KeyA:'esquerda',ArrowRight:'direita',KeyD:'direita'};if(m[e.code]){e.preventDefault();direcao(m[e.code]);}});
  iniciar.addEventListener('click',()=>{audio.acordar();if(jogo.estado==='fim')jogo.reiniciar();jogo.iniciar();overlay.hidden=true;acumulado=jogo.intervalo();anunciar(`CIRCUITO ${jogo.nivel}`);hud();});
  el('maze-pausa').addEventListener('click',()=>{jogo.pausar();anunciar(jogo.estado==='pausa'?'EM PAUSA':`CIRCUITO ${jogo.nivel}`);});el('maze-menu').addEventListener('click',()=>{if(jogo.estado==='jogar')jogo.pausar();aoMenu();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&activo&&jogo.estado==='jogar')jogo.pausar();});
  function quadro(agora:number):void{const dt=Math.min(50,agora-ultimo);ultimo=agora;tempo=agora;if(activo){if(jogo.estado==='jogar'){acumulado+=dt;let guarda=4;while(acumulado>=jogo.intervalo()&&guarda-->0){acumulado-=jogo.intervalo();tratar();}}actualizarParticulas(dt);if(mensagemAte&&agora>mensagemAte){mensagem.textContent=jogo.estado==='pausa'?'EM PAUSA':`CIRCUITO ${jogo.nivel}`;mensagem.classList.remove('impacto');mensagemAte=0;}desenhar(Math.min(1,acumulado/jogo.intervalo()));}requestAnimationFrame(quadro);}
  requestAnimationFrame(quadro);hud();desenhar(1);
  return{activar(){activo=true;raiz.hidden=false;ultimo=performance.now();},desactivar(){activo=false;raiz.hidden=true;if(jogo.estado==='jogar')jogo.pausar();}};
}
