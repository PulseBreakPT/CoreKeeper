import { MotorEfeitos, ESTRELA_FX } from './efeitos-motor';

export function prepararEfeitosMenu(fx: MotorEfeitos): void {
  const menu = document.getElementById('menu')!;
  const { signal } = fx.abortar;

  // 01 — Pétalas na brisa: só no cenário, por trás dos cartões.
  const brisa = fx.decorar(menu, 'nw-fx-brisa', 'brisa-de-petalas');
  brisa.innerHTML = Array.from({length:6}, (_, i) => `<i style="--n:${i};--x:${[3,94,7,91,2,96][i]}%;--y:${[15,24,48,61,79,90][i]}%"></i>`).join('');

  // 02 — Pequena constelação em redor do logótipo, nunca em cima das letras.
  const ceu = fx.decorar(menu.querySelector('.nw-hero')!, 'nw-fx-constelacao', 'constelacao-do-logo');
  ceu.innerHTML = [[21,13],[78,5],[19,59],[83,51],[27,88],[74,88]].map(([x,y],i) =>
    `<i style="left:${x}%;top:${y}%;--n:${i}">${ESTRELA_FX}</i>`).join('');

  menu.querySelectorAll<HTMLElement>('button.modo,button.nw-daily').forEach(card => {
    // 03 — Perspetiva nas peças: o texto e a área de toque ficam imóveis.
    const art = card.querySelector<HTMLElement>('.nw-arte,.daily-art');
    const reposicionar = () => { art?.style.removeProperty('--fx-rx'); art?.style.removeProperty('--fx-ry'); };
    art?.classList.add('nw-fx-perspetiva');
    card.addEventListener('pointermove', event => {
      if (!fx.pode() || event.pointerType !== 'mouse') return;
      const box = card.getBoundingClientRect();
      art?.style.setProperty('--fx-rx', `${(0.5-(event.clientY-box.top)/box.height)*10}deg`);
      art?.style.setProperty('--fx-ry', `${((event.clientX-box.left)/box.width-0.5)*15}deg`);
    }, {passive:true, signal});
    card.addEventListener('pointerleave', reposicionar, {signal});
    card.addEventListener('pointerdown', () => {
      if (art) fx.animar(art, [{transform:'perspective(500px) rotateY(-9deg) scale(.96)'},{transform:'perspective(500px) rotateY(5deg) scale(1.035)'},{transform:'none'}], 420);
    }, {passive:true, signal});

    // 04 — Um fio de luz percorre o rebordo, com o centro sempre transparente.
    const contorno = fx.decorar(card, 'nw-fx-contorno', 'rebordo-de-luz');
    contorno.innerHTML = '<i></i>';
    let ultimo = -Infinity;
    const iluminar = () => {
      if (performance.now()-ultimo < 900 || !fx.pode()) return;
      ultimo = performance.now();
      fx.animar(contorno, [{opacity:0},{opacity:1,offset:.22},{opacity:1,offset:.65},{opacity:0}], 900);
      fx.animar(contorno.firstElementChild as HTMLElement, [{transform:'rotate(0deg)'},{transform:'rotate(300deg)'}], 900);
    };
    card.addEventListener('pointerenter', iluminar, {signal});
    card.addEventListener('focus', iluminar, {signal});
    card.addEventListener('pointerdown', iluminar, {passive:true, signal});
  });
}