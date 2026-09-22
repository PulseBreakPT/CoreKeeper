/* Camada de luz do launcher.
   Os raios de sol e o pólen vivem num shader WebGL desenhado atrás da interface,
   por isso nunca tocam na legibilidade do texto. É decoração pura: se o WebGL
   faltar, falhar ou o utilizador reduzir o movimento, o menu fica exatamente
   como está sem a camada. */

const VERTICE=`attribute vec2 posicao;void main(){gl_Position=vec4(posicao,0.0,1.0);}`;

const FRAGMENTO=`precision mediump float;
uniform vec2 u_res;
uniform float u_t;
uniform float u_forca;

void main(){
  vec2 p=gl_FragCoord.xy/u_res;
  p.y=1.0-p.y;                              /* origem no topo, como o cenário SVG */
  float aspeto=u_res.x/max(u_res.y,1.0);

  /* O sol está onde o SVG o pinta: canto superior direito. */
  vec2 d=(p-vec2(0.84,0.02))*vec2(aspeto,1.0);
  float dist=length(d);
  float ang=atan(d.y,d.x);

  /* Raios: duas ondas com velocidades diferentes para não marcarem ritmo. */
  float raios=0.55+0.45*sin(ang*8.0+u_t*0.10);
  raios*=0.62+0.38*sin(ang*14.0-u_t*0.14+1.7);
  raios=pow(max(raios,0.0),2.8);

  float queda=exp(-dist*1.9);
  float halo=exp(-dist*5.2)*1.05;
  float topo=smoothstep(0.66,0.02,p.y);     /* só no céu, some antes dos cartões */

  /* Pólen a subir devagar. */
  float motas=0.0;
  for(int i=0;i<4;i++){
    float f=float(i);
    float x=fract(0.17+f*0.2683+sin(f*12.9898)*0.21);
    float y=fract(1.15-u_t*0.013-f*0.2971);
    float r=length((p-vec2(x,y))*vec2(aspeto,1.0));
    motas+=exp(-r*34.0)*(0.55+0.45*sin(u_t*0.9+f*2.1));
  }

  float luz=(raios*queda*0.62+halo)*topo+motas*0.45;
  vec3 cor=mix(vec3(1.0,0.97,0.84),vec3(1.0,0.85,0.48),clamp(raios,0.0,1.0)*0.8);
  gl_FragColor=vec4(cor*luz*u_forca,1.0);
}`;

const ESCALA=0.5,LARGURA_MAX=520,ALTURA_MAX=1040,INTERVALO=1000/30;

function compilar(gl:WebGLRenderingContext,tipo:number,fonte:string):WebGLShader|null{
  const s=gl.createShader(tipo);if(!s)return null;
  gl.shaderSource(s,fonte);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);return null;}
  return s;
}

function reduzido():boolean{
  return document.documentElement.classList.contains('reduzir-movimento')
    ||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
}

export function iniciarLuz(raiz:HTMLElement):void{
  if(reduzido())return;
  const tela=document.createElement('canvas');
  tela.className='nw-luz';
  tela.setAttribute('aria-hidden','true');
  const gl=tela.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'}) as WebGLRenderingContext|null;
  if(!gl)return;

  const vs=compilar(gl,gl.VERTEX_SHADER,VERTICE),fs=compilar(gl,gl.FRAGMENT_SHADER,FRAGMENTO),programa=gl.createProgram();
  if(!vs||!fs||!programa)return;
  gl.attachShader(programa,vs);gl.attachShader(programa,fs);gl.linkProgram(programa);
  if(!gl.getProgramParameter(programa,gl.LINK_STATUS))return;
  gl.useProgram(programa);

  const buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const atributo=gl.getAttribLocation(programa,'posicao');
  gl.enableVertexAttribArray(atributo);
  gl.vertexAttribPointer(atributo,2,gl.FLOAT,false,0,0);
  const uRes=gl.getUniformLocation(programa,'u_res'),uT=gl.getUniformLocation(programa,'u_t'),uForca=gl.getUniformLocation(programa,'u_forca');
  gl.clearColor(0,0,0,1);
  gl.uniform1f(uForca,1.0);

  const cenario=raiz.querySelector('.nw-cenario');
  if(cenario)cenario.after(tela);else raiz.prepend(tela);

  let quadro=0,ultimo=0,largura=0,altura=0;
  function medir():void{
    const l=Math.max(1,Math.min(LARGURA_MAX,Math.round(raiz.clientWidth*ESCALA)));
    const a=Math.max(1,Math.min(ALTURA_MAX,Math.round(raiz.clientHeight*ESCALA)));
    if(l===largura&&a===altura)return;
    largura=l;altura=a;tela.width=l;tela.height=a;
    gl!.viewport(0,0,l,a);gl!.uniform2f(uRes,l,a);
  }
  function desenhar(agora:number):void{
    quadro=requestAnimationFrame(desenhar);
    if(agora-ultimo<INTERVALO)return;
    ultimo=agora;
    if(raiz.hidden||reduzido()){tela.style.opacity='0';return;}
    tela.style.opacity='';
    medir();
    gl!.uniform1f(uT,agora/1000);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.drawArrays(gl!.TRIANGLES,0,3);
    if(!tela.dataset.luz)tela.dataset.luz='activa';
  }
  function retomar():void{if(!quadro&&!document.hidden)quadro=requestAnimationFrame(desenhar);}
  function parar():void{cancelAnimationFrame(quadro);quadro=0;}

  tela.addEventListener('webglcontextlost',e=>{e.preventDefault();parar();tela.remove();});
  document.addEventListener('visibilitychange',()=>document.hidden?parar():retomar());
  window.addEventListener('resize',()=>{largura=0;medir();});
  medir();
  retomar();
}

/* Onda de luz a partir do ponto tocado, para o toque ter peso. */
export function iniciarOndas(raiz:HTMLElement):void{
  raiz.addEventListener('pointerdown',evento=>{
    if(reduzido())return;
    const alvo=(evento.target as HTMLElement|null)?.closest<HTMLElement>('.nw-card,.nw-daily,.nw-bottom button');
    if(!alvo)return;
    const caixa=alvo.getBoundingClientRect();
    const onda=document.createElement('i');
    onda.className='nw-onda';
    onda.style.left=`${evento.clientX-caixa.left}px`;
    onda.style.top=`${evento.clientY-caixa.top}px`;
    onda.style.setProperty('--raio',`${Math.max(caixa.width,caixa.height)*1.2}px`);
    // Não basta o animationend: se o movimento for reduzido a meio da animação
    // ela nunca termina e a onda ficaria presa no DOM.
    const limpar=()=>{window.clearTimeout(rede);onda.remove();};
    const rede=window.setTimeout(limpar,900);
    onda.addEventListener('animationend',limpar);
    alvo.appendChild(onda);
  },{passive:true});
}
