import { CORES_FX, ESTRELA_FX, MotorEfeitos } from './efeitos-motor';

export function prepararEfeitosPartida(fx: MotorEfeitos): void {
  const html = document.documentElement, jogo = document.getElementById('jogo')!;
  const input = document.getElementById('resposta') as HTMLInputElement;
  const combo = document.getElementById('combo')!.closest<HTMLElement>('.jg-marcador')!;
  const calor = document.getElementById('heat-texto')!.closest<HTMLElement>('.jg-marcador')!;
  const contagem = document.getElementById('contagem-numero')!;
  const painel = document.getElementById('painel')!;
  const {signal} = fx.abortar;

  // 05 — Ondas de arranque, sincronizadas com o 3–2–1.
  const ondas = fx.decorar(document.getElementById('contagem')!, 'nw-fx-arranque', 'ondas-de-arranque');
  ondas.innerHTML = '<i></i><i></i><i></i>';
  fx.observar(contagem, () => {
    if (document.getElementById('contagem')!.hidden) return;
    const rect = contagem.getBoundingClientRect(), origem = ondas.parentElement!.getBoundingClientRect();
    ondas.style.left = `${rect.left-origem.left+rect.width/2}px`; ondas.style.top = `${rect.top-origem.top+rect.height/2}px`;
    [...ondas.children].forEach((node,i) => fx.animar(node as HTMLElement, [
      {transform:'translate(-50%,-50%) scale(.68)',opacity:0},
      {opacity:.7,offset:.18},{transform:'translate(-50%,-50%) scale(1.65)',opacity:0},
    ], 550, false, i*55));
  }, {childList:true});

  // 06 — Poeira de escrita: faíscas pequenas fora do campo, sem dar pistas.
  let ultimaTecla = 0;
  input.addEventListener('input', () => {
    if (!input.value || input.disabled || html.dataset.paused === 'true' || performance.now()-ultimaTecla < 110) return;
    ultimaTecla = performance.now();
    const r = input.getBoundingClientRect();
    for (const lado of [-1,1]) fx.particula(lado < 0 ? r.left-3 : r.right+3, r.top+8, [
      {transform:'translate(-50%,-50%) scale(.2)',opacity:0},
      {opacity:.85,offset:.2},{transform:`translate(${lado*8-3}px,-18px) scale(.1)`,opacity:0},
    ], {cor:'#fff3b5',tamanho:7,duracao:420,efeito:'poeira-de-escrita'});
  }, {signal});

  // 08 — Coroa orbital apenas nos marcos de combo; não a cada resposta.
  const orbita = fx.decorar(combo, 'nw-fx-orbita', 'orbita-de-combo');
  orbita.innerHTML = Array.from({length:4},(_,i) => `<i style="--n:${i}">${ESTRELA_FX}</i>`).join('');

  // 09 — Pequenas labaredas no topo do medidor, só enquanto há calor ativo.
  const fogo = fx.decorar(calor, 'nw-fx-fogo', 'labaredas-de-calor');
  fogo.innerHTML = Array.from({length:5},(_,i) => `<i style="--n:${i}"></i>`).join('');

  let ultimaRonda = '', ultimoEstado = '', fogoAnterior = false;
  fx.observar(html, () => {
    if (jogo.hidden) { ultimaRonda=''; ultimoEstado=''; return; }
    const estado = html.dataset.estado || '';
    if (estado === 'ready' && estado !== ultimoEstado) ultimaRonda = '';
    ultimoEstado = estado;
    if (html.dataset.paused === 'true') return;
    const ronda = document.getElementById('numero-pergunta')!.textContent || '';
    const emFogo = html.classList.contains('on-fire');
    if (emFogo !== fogoAnterior) { jogo.classList.toggle('nw-fx-em-fogo', emFogo); fogoAnterior=emFogo; }
    if (estado !== 'correct' || ultimaRonda === ronda || !fx.pode()) return;
    ultimaRonda = ronda;
    if (html.classList.contains('ronda-silenciosa')) return;
    // 07 — Estrelas de recompensa sobem pela margem até à pontuação.
    const carta = jogo.querySelector('.jg-card')!.getBoundingClientRect();
    const destino = document.getElementById('pontos')!.getBoundingClientRect();
    const x = carta.left-3, y = carta.top+carta.height*.38;
    for (let i=0;i<6;i++) fx.particula(x,y,[
      {transform:'translate(-50%,-50%) scale(.35)',opacity:0},
      {transform:`translate(${-5-i%2*3}px,-24px) scale(1)`,opacity:1,offset:.22},
      {transform:`translate(-4px,${destino.bottom-y+4}px) scale(.85)`,opacity:1,offset:.76},
      {transform:`translate(${destino.left-x-8}px,${destino.top-y}px) scale(.15)`,opacity:0},
    ],{tamanho:9+i%3*2,duracao:650,atraso:i*22,efeito:'estrelas-de-recompensa'});
    const valor = Number(document.getElementById('combo')!.textContent?.replace('×',''));
    if ([3,5,7,10,12,15,20,25,50,100].includes(valor)) {
      fx.animar(orbita,[{opacity:0,transform:'scale(.8)'},{opacity:1,transform:'scale(1.08)',offset:.2},{opacity:1,transform:'scale(1)',offset:.8},{opacity:0}],1100);
      [...orbita.children].forEach((node,i) => fx.animar(node as HTMLElement,[{rotate:`${i*90}deg`},{rotate:`${i*90+210}deg`}],1100));
    }
  },{attributes:true,attributeFilter:['data-estado','class','data-paused']});

  // 10 — Confettis de novo recorde, nas laterais do resultado (centro livre).
  fx.observar(painel, () => {
    if (painel.hidden || painel.classList.contains('resultado-desafio') || !painel.classList.contains('resultado-recorde') || !fx.pode()) return;
    const r = painel.querySelector('.jg-painel-caixa')!.getBoundingClientRect();
    for (let i=0;i<30;i++) {
      const lado=i%2 ? 1 : -1, x=lado<0 ? r.left-4 : r.right+4;
      const y=r.top+18, alcance=Math.min(r.height*.65,260), afastamento=4+i%4*3;
      fx.particula(x,y,[
        {transform:'translate(-50%,-50%) scale(.2)',opacity:0},
        {transform:`translate(${lado*afastamento}px,-28px) rotate(${lado*50}deg)`,opacity:1,offset:.18},
        {transform:`translate(${lado*(afastamento+3)}px,${alcance*.5}px) rotate(${lado*210}deg)`,opacity:1,offset:.65},
        {transform:`translate(${lado*afastamento}px,${alcance}px) rotate(${lado*390}deg) scale(.5)`,opacity:0},
      ],{tipo:i%3?'confetti':'estrela',cor:CORES_FX[i%5],tamanho:7+i%4*2,duracao:1500+i%3*120,atraso:i*22,efeito:'festa-de-recorde'});
    }
  },{attributes:true,attributeFilter:['hidden']});
}