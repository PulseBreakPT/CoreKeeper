import './desafio-conquista.css';
import { MotorEfeitos } from './efeitos-motor';
import { EVENTO_META_DIARIA, consumirConquistaDiaria, montarConquistaDiaria } from './conquista-diaria';

/** A meta é comunicada pelo jogo; não é inferida a partir de números no ecrã. */
export function prepararEfeitosDesafio(fx: MotorEfeitos): void {
  const painel = document.getElementById('painel')!;
  const combo = document.getElementById('combo')!.closest('.jg-marcador')!;
  const card = montarConquistaDiaria();
  const halo = fx.decorar(combo, 'nw-fx-meta-diaria', 'meta-diaria-atingida');
  const brilho = fx.decorar(card, 'nw-fx-meta-conquistada', 'brilho-da-conquista');
  const {signal} = fx.abortar;

  // O brilho acaba antes da próxima pergunta; não acrescenta espera nem modal.
  document.addEventListener(EVENTO_META_DIARIA, () => {
    fx.animar(halo,[{opacity:0,scale:'.98'},{opacity:1,scale:'1.035',offset:.28},{opacity:0,scale:'1.06'}],600);
  },{signal});

  const celebrar = () => {
    if (document.hidden || painel.hidden || card.hidden) return;
    if (!consumirConquistaDiaria(painel.dataset.desafioDia || '')) return;
    // Com movimento reduzido mantém-se o cartão legível, sem animações.
    if (!fx.pode()) return;
    fx.animar(brilho,[{opacity:0},{opacity:1,offset:.22},{opacity:.65,offset:.65},{opacity:0}],1900);
    fx.animar(card.querySelector<HTMLElement>('.conquista-taca')!,[
      {rotate:'-7deg',scale:'.94'},{rotate:'5deg',scale:'1.1',offset:.3},{rotate:'-2deg',scale:'1.02',offset:.7},{rotate:'0deg',scale:'1'},
    ],1100);
    const rect = painel.querySelector('.jg-painel-caixa')!.getBoundingClientRect();
    const cores = ['#ffe071','#fff4be','#82dfbd','#8cdbf5'];
    for (let i=0;i<32;i++) {
      const lado = i%2 ? 1 : -1;
      const x = lado < 0 ? rect.left-3 : rect.right+3;
      const y = rect.top+Math.min(55,rect.height*.12);
      const alcance = Math.min(290, rect.height*.65), abertura = 4+i%4*2;
      fx.particula(x,y,[
        {transform:'translate(-50%,-50%) scale(.2)',opacity:0},
        {transform:`translate(${lado*abertura}px,-28px) rotate(${lado*55}deg) scale(1)`,opacity:1,offset:.2},
        {transform:`translate(${lado*(abertura+2)}px,${alcance*.5}px) rotate(${lado*230}deg)`,opacity:1,offset:.65},
        {transform:`translate(${lado*abertura}px,${alcance}px) rotate(${lado*410}deg) scale(.45)`,opacity:0},
      ],{efeito:'festa-do-desafio-diario',tipo:i%3?'confetti':'estrela',cor:cores[i%4],tamanho:8+i%3*2,duracao:1650+i%3*130,atraso:i*20});
    }
  };
  fx.observar(painel,celebrar,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',celebrar,{signal});
  signal.addEventListener('abort',() => card.remove(),{once:true});
}