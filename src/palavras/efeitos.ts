import './efeitos.css';
import { MotorEfeitos } from './efeitos-motor';
import { prepararEfeitosMenu } from './efeitos-menu';
import { prepararEfeitosPartida } from './efeitos-partida';
import { prepararEfeitosDesafio } from './efeitos-desafio';

/** Efeitos automáticos e celebrações contextuais, sem novas configurações. */
export function iniciarEfeitosVisuais(): () => void {
  const fx = new MotorEfeitos();
  const html = document.documentElement;
  const menu = document.getElementById('menu')!, jogo = document.getElementById('jogo')!;
  const folha = document.getElementById('folha')!, revisao = document.getElementById('revisao')!;
  const {signal} = fx.abortar;
  prepararEfeitosMenu(fx);
  prepararEfeitosPartida(fx);
  prepararEfeitosDesafio(fx);

  const sincronizar = () => {
    html.dataset.fxSuspenso = String(!fx.pode());
    menu.classList.toggle('nw-fx-ambiente-pausado', !folha.hidden);
    if (!fx.pode() || html.dataset.paused === 'true') fx.limpar();
  };
  fx.observar(html,sincronizar,{attributes:true,attributeFilter:['class','data-paused']});
  // Não deixar animações da partida anterior passarem para outro ecrã.
  for (const node of [menu,jogo,folha,revisao]) fx.observar(node,() => {
    fx.limpar(); sincronizar();
  },{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',sincronizar,{signal});
  fx.movimento.addEventListener('change',sincronizar,{signal});
  // Coordenadas de partículas transitórias deixam de ser válidas ao deslocar o ecrã.
  window.addEventListener('resize',() => fx.limpar(),{signal});
  jogo.addEventListener('scroll',() => fx.limpar(),{passive:true,signal});
  window.visualViewport?.addEventListener('resize',() => fx.limpar(),{signal});
  sincronizar();
  return () => fx.destruir();
}