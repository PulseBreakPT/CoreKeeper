type Demo = 'serpente' | 'tetris' | 'maze' | '2048' | 'minas';

type Ponto = { x: number; y: number };
const TAU = Math.PI * 2;
const CICLO = 6000;

function suave(t: number): number { const n = Math.max(0, Math.min(1, t)); return n * n * (3 - 2 * n); }
function intervalo(p: number, inicio: number, fim: number): number { return suave((p - inicio) / (fim - inicio)); }
function janela(p: number, entrada: number, cheio: number, saida: number, fim: number): number {
  return Math.min(intervalo(p, entrada, cheio), 1 - intervalo(p, saida, fim));
}
function caminho(pontos: Ponto[], t: number): Ponto {
  const n = pontos.length, v = ((t % 1) + 1) % 1 * n, i = Math.floor(v), f = suave(v - i), a = pontos[i], b = pontos[(i + 1) % n];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}
function fundo(c: CanvasRenderingContext2D, w: number, h: number): void {
  const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#15181d'); g.addColorStop(1, '#08090b');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
}
function grelha(c: CanvasRenderingContext2D, w: number, h: number, colunas: number, linhas: number, alpha = .075): void {
  c.strokeStyle = `rgba(218,190,114,${alpha})`; c.lineWidth = 1;
  for (let x = 1; x < colunas; x++) { c.beginPath(); c.moveTo(x * w / colunas, 0); c.lineTo(x * w / colunas, h); c.stroke(); }
  for (let y = 1; y < linhas; y++) { c.beginPath(); c.moveTo(0, y * h / linhas); c.lineTo(w, y * h / linhas); c.stroke(); }
}
function bloco(c: CanvasRenderingContext2D, x: number, y: number, lado: number, matiz: number, alpha = 1): void {
  const m = Math.max(1, lado * .07), l = lado - m * 2;
  c.save(); c.globalAlpha = alpha; c.shadowColor = `hsl(${matiz} 95% 60% / .5)`; c.shadowBlur = lado * .36;
  const g = c.createLinearGradient(x, y, x + lado, y + lado); g.addColorStop(0, `hsl(${matiz} 96% 82%)`); g.addColorStop(.48, `hsl(${matiz} 84% 55%)`); g.addColorStop(1, `hsl(${matiz} 72% 29%)`);
  c.fillStyle = g; c.beginPath(); c.roundRect(x + m, y + m, l, l, lado * .13); c.fill(); c.shadowBlur = 0;
  c.strokeStyle = 'rgba(255,255,255,.42)'; c.lineWidth = .8; c.stroke(); c.restore();
}
function desenharSerpente(c: CanvasRenderingContext2D, p: number, w: number, h: number): void {
  fundo(c, w, h); grelha(c, w, h, 14, 5);
  const rota: Ponto[] = [{x:34,y:22},{x:266,y:22},{x:266,y:74},{x:34,y:74}];
  const matiz = Number(getComputedStyle(document.documentElement).getPropertyValue('--cobra')) || 83;
  c.fillStyle = '#ffd84d'; c.shadowColor = '#ffc928'; c.shadowBlur = 13; c.beginPath(); c.arc(150, 48, 5.2, 0, TAU); c.fill(); c.shadowBlur = 0;
  for (let i = 8; i >= 0; i--) {
    const q = caminho(rota, p - i * .018), r = i === 0 ? 7.8 : 6.2 - i * .16;
    c.shadowColor = `hsl(${matiz} 100% 62% / .75)`; c.shadowBlur = i === 0 ? 15 : 8;
    c.fillStyle = `hsl(${matiz} ${i ? 78 : 92}% ${i ? 55 : 76}%)`; c.beginPath(); c.arc(q.x, q.y, r, 0, TAU); c.fill();
    if (i === 0) { c.shadowBlur = 0; c.fillStyle = '#10150c'; c.beginPath(); c.arc(q.x + 2.5, q.y - 2, 1.15, 0, TAU); c.fill(); }
  }
  c.shadowBlur = 0;
}
function desenharTetris(c: CanvasRenderingContext2D, p: number, w: number, h: number): void {
  fundo(c, w, h); grelha(c, w, h, 10, 6); const s = w / 10, y = h - s;
  const base = p < .68 ? 1 : p < .88 ? 1 - intervalo(p,.68,.88) : intervalo(p,.88,.98);
  const cores = [188,112,282,25,350,220];
  for (let x=0;x<10;x++) if (x<3 || x>6) bloco(c,x*s,y,s,cores[x%cores.length],base);
  const queda = intervalo(p,.04,.48), visivel = janela(p,.01,.06,.70,.82);
  for(let x=3;x<=6;x++) bloco(c,x*s,-s+(y+s)*queda,s,188,visivel);
  const flash = janela(p,.47,.52,.61,.69); if(flash>0){c.fillStyle=`rgba(255,235,145,${flash*.72})`;c.shadowColor='#ffe176';c.shadowBlur=20;c.fillRect(0,y,w,s);c.shadowBlur=0;}
  const explosao=janela(p,.55,.59,.74,.84); c.save(); c.globalCompositeOperation='lighter';
  for(let i=0;i<20;i++){const a=(i/20)*TAU,dist=explosao*52;c.globalAlpha=explosao*(1-explosao*.45);c.fillStyle=`hsl(${cores[i%cores.length]} 95% 70%)`;c.fillRect(w/2+Math.cos(a)*dist,y+s/2+Math.sin(a)*dist*.35,3,3);} c.restore();
}
function desenharMaze(c: CanvasRenderingContext2D, p: number, w: number, h: number): void {
  fundo(c,w,h); grelha(c,w,h,12,6,.055); const cw=w/12,ch=h/6;
  const paredes=[[0,0,12,1],[0,5,12,1],[0,1,1,4],[11,1,1,4],[3,1,1,3],[7,2,1,3],[4,3,3,1]];
  for(const [x,y,lx,ly] of paredes){c.fillStyle='#191d23';c.strokeStyle='rgba(221,185,82,.32)';c.lineWidth=1;c.beginPath();c.roundRect(x*cw+2,y*ch+2,lx*cw-4,ly*ch-4,4);c.fill();c.stroke();}
  c.fillStyle='#ffd84d';c.shadowColor='#ffc928';c.shadowBlur=5;for(let x=1.5;x<11;x+=1.25){c.beginPath();c.arc(x*cw,1.55*ch,1.6,0,TAU);c.fill();}c.shadowBlur=0;
  const rota=[{x:1.6*cw,y:1.6*ch},{x:10.3*cw,y:1.6*ch},{x:10.3*cw,y:4.35*ch},{x:1.6*cw,y:4.35*ch}];
  const jogador=caminho(rota,p), inimigo=caminho(rota,p+.43), matiz=Number(getComputedStyle(document.documentElement).getPropertyValue('--maze-personagem'))||42;
  c.shadowColor=`hsl(${matiz} 100% 60%)`;c.shadowBlur=14;c.fillStyle=`hsl(${matiz} 90% 65%)`;c.beginPath();c.arc(jogador.x,jogador.y,6.5,0,TAU);c.fill();c.shadowBlur=0;
  c.save();c.translate(inimigo.x,inimigo.y);c.rotate(Math.PI/4);c.shadowColor='#ef5f83';c.shadowBlur=10;c.fillStyle='#df5278';c.beginPath();c.roundRect(-5.5,-5.5,11,11,3);c.fill();c.restore();
}
function quadrado2048(c:CanvasRenderingContext2D,x:number,y:number,l:number,valor:number,alpha=1,escala=1):void{
  const tons:Record<number,number>={2:188,4:112,8:48,16:25}; const h=tons[valor]||42;c.save();c.globalAlpha=alpha;c.translate(x+l/2,y+l/2);c.scale(escala,escala);
  const g=c.createLinearGradient(-l/2,-l/2,l/2,l/2);g.addColorStop(0,`hsl(${h} 92% 82%)`);g.addColorStop(1,`hsl(${h} 72% 39%)`);c.shadowColor=`hsl(${h} 95% 62% / .45)`;c.shadowBlur=12;c.fillStyle=g;c.beginPath();c.roundRect(-l/2,-l/2,l,l,l*.16);c.fill();c.shadowBlur=0;c.fillStyle='#14120c';c.textAlign='center';c.textBaseline='middle';c.font=`700 ${l*.43}px "Space Grotesk",sans-serif`;c.fillText(String(valor),0,1);c.restore();
}
function desenhar2048(c:CanvasRenderingContext2D,p:number,w:number,h:number):void{
  fundo(c,w,h);const gap=7,l=40,ox=(w-(l*4+gap*3))/2,oy=(h-l)/2;
  for(let x=0;x<4;x++){c.fillStyle='rgba(255,255,255,.035)';c.strokeStyle='rgba(255,255,255,.07)';c.beginPath();c.roundRect(ox+x*(l+gap),oy,l,l,7);c.fill();c.stroke();}
  const retorno=intervalo(p,.88,.96), mover=intervalo(p,.07,.43)*(1-retorno), dois=1-intervalo(p,.40,.48), restaurar=intervalo(p,.96,.995), a2=Math.max(dois,restaurar);
  quadrado2048(c,ox+(l+gap)*mover,oy,l,2,a2);quadrado2048(c,ox+2*(l+gap)-(l+gap)*mover,oy,l,2,a2);
  const a4=janela(p,.41,.48,.79,.88),pulso=1+Math.sin(intervalo(p,.41,.62)*Math.PI)*.12;quadrado2048(c,ox+l+gap,oy,l,4,a4,pulso);
  const explosao=janela(p,.45,.49,.68,.78);c.save();c.globalCompositeOperation='lighter';for(let i=0;i<16;i++){const a=i/16*TAU,d=explosao*38;c.globalAlpha=explosao;c.fillStyle='#83ee85';c.beginPath();c.arc(ox+l*1.5+gap+Math.cos(a)*d,oy+l/2+Math.sin(a)*d,2.2,0,TAU);c.fill();}c.restore();
}
function desenharMinas(c:CanvasRenderingContext2D,p:number,w:number,h:number):void{
  fundo(c,w,h);const cols=8,rows=3,gap=5,l=Math.min((w-18-gap*(cols-1))/cols,(h-14-gap*(rows-1))/rows),ox=(w-(l*cols+gap*(cols-1)))/2,oy=(h-(l*rows+gap*(rows-1)))/2;
  const abertas=[{x:2,y:1,n:1},{x:3,y:1,n:1},{x:4,y:1,n:2},{x:2,y:2,n:0},{x:3,y:2,n:0},{x:4,y:2,n:1}], cores=['#9298a3','#71bfff','#75e3a0'];
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const idx=abertas.findIndex(q=>q.x===x&&q.y===y),limiar=.12+Math.max(0,idx)*.065,aberta=idx>=0?intervalo(p,limiar,limiar+.09)*(1-intervalo(p,.83,.97)):0;const px=ox+x*(l+gap),py=oy+y*(l+gap);c.fillStyle=aberta>.5?'#090c10':'#171b21';c.strokeStyle=aberta>.5?'rgba(255,255,255,.06)':'rgba(255,255,255,.13)';c.beginPath();c.roundRect(px,py,l,l,l*.16);c.fill();c.stroke();if(aberta>.05&&abertas[idx].n){c.globalAlpha=aberta;c.fillStyle=cores[abertas[idx].n];c.shadowColor=c.fillStyle;c.shadowBlur=7;c.textAlign='center';c.textBaseline='middle';c.font=`700 ${l*.5}px "Space Grotesk",sans-serif`;c.fillText(String(abertas[idx].n),px+l/2,py+l/2+1);c.shadowBlur=0;c.globalAlpha=1;}}
  const flag=janela(p,.48,.55,.82,.94),fx=ox+6*(l+gap),fy=oy; c.globalAlpha=flag;c.fillStyle='#ffd86a';c.shadowColor='#ffc63f';c.shadowBlur=10;c.beginPath();c.moveTo(fx+l*.34,fy+l*.25);c.lineTo(fx+l*.75,fy+l*.39);c.lineTo(fx+l*.34,fy+l*.52);c.closePath();c.fill();c.shadowBlur=0;c.strokeStyle='#e8c35f';c.lineWidth=2;c.beginPath();c.moveTo(fx+l*.34,fy+l*.25);c.lineTo(fx+l*.34,fy+l*.78);c.stroke();c.globalAlpha=1;
}

export function montarPreviews(): void {
  const itens=[...document.querySelectorAll<HTMLCanvasElement>('.jogo-preview')].map(canvas=>({canvas,ctx:canvas.getContext('2d')!,tipo:canvas.dataset.preview as Demo}));
  const reduzir=matchMedia('(prefers-reduced-motion: reduce)');
  const desenhadores:Record<Demo,(c:CanvasRenderingContext2D,p:number,w:number,h:number)=>void>={serpente:desenharSerpente,tetris:desenharTetris,maze:desenharMaze,'2048':desenhar2048,minas:desenharMinas};
  function quadro(agora:number):void{
    if(!document.hidden&&!document.getElementById('menu-principal')?.classList.contains('fechado')){
      const p = reduzir.matches ? .22 : (agora % CICLO) / CICLO;
      for(const {canvas,ctx,tipo} of itens){ctx.clearRect(0,0,canvas.width,canvas.height);desenhadores[tipo](ctx,p,canvas.width,canvas.height);}
    }
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);
}
