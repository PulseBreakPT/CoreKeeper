/** Montagem do jogo da serpente: estado, ciclo de quadros, HUD e fim de partida. */

import './estilo.css';
import { Jogo, LADO, type Direcao } from './logica';
import { Pintor } from './pintura';
import { Som } from './audio';
import { ligarControlos } from './controlos';

const CHAVE_RECORDE = 'serpente:recorde:v1';
/** Tempo entre a morte e o cartão de fim — dá espaço ao impacto. */
const ESPERA_FIM = 440;

function elemento<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Falta o elemento #${id}`);
  return e as T;
}

function lerRecorde(): number {
  try {
    const n = Number(localStorage.getItem(CHAVE_RECORDE));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function gravarRecorde(n: number): void {
  try {
    localStorage.setItem(CHAVE_RECORDE, String(n));
  } catch {
    /* sem armazenamento, o recorde vive só nesta sessão */
  }
}

const palco = elemento<HTMLDivElement>('palco');
const hud = elemento<HTMLElement>('hud');
const arena = elemento<HTMLDivElement>('arena');
const tela = elemento<HTMLCanvasElement>('tela');
const marcadorPontos = elemento<HTMLDivElement>('marcador-pontos');
const alvoPontos = elemento<HTMLSpanElement>('pontos');
const alvoRecorde = elemento<HTMLSpanElement>('recorde');
const dica = elemento<HTMLParagraphElement>('dica');
const cartao = elemento<HTMLDivElement>('fim');
const tituloFim = elemento<HTMLHeadingElement>('fim-titulo');
const fimPontos = elemento<HTMLSpanElement>('fim-pontos');
const fimRecorde = elemento<HTMLSpanElement>('fim-recorde');
const fimMedalha = elemento<HTMLParagraphElement>('fim-medalha');
const botaoJogar = elemento<HTMLButtonElement>('jogar');
const botaoSom = elemento<HTMLButtonElement>('som');

const jogo = new Jogo({ lado: LADO, recorde: lerRecorde() });
const pintor = new Pintor(tela);
const som = new Som();

let temporizadorFim: number | null = null;
let podeReiniciar = false;
let ultimo = performance.now();
let acumulado = 0;

const semRato = window.matchMedia('(hover: none)').matches;
dica.textContent = semRato ? 'Desliza para começar' : 'Setas ou WASD para começar';

function animar(alvo: HTMLElement, classe: string): void {
  alvo.classList.remove(classe);
  // Forçar refluxo reinicia a animação mesmo quando dispara duas vezes seguidas.
  void alvo.offsetWidth;
  alvo.classList.add(classe);
}

function actualizarHud(): void {
  alvoPontos.textContent = String(jogo.pontos);
  alvoRecorde.textContent = String(jogo.recorde);
}

function medirArena(): void {
  // Medimos a partir do ecrã (e não da arena) para não haver realimentação de tamanhos.
  const caixa = document.documentElement;
  const estilo = getComputedStyle(palco.parentElement as HTMLElement);
  const folgaH = parseFloat(estilo.paddingLeft) + parseFloat(estilo.paddingRight);
  const folgaV = parseFloat(estilo.paddingTop) + parseFloat(estilo.paddingBottom);
  const intervalo = parseFloat(estilo.rowGap) || 0;
  const largura = caixa.clientWidth - folgaH;
  const altura = window.innerHeight - folgaV - hud.offsetHeight - intervalo;
  const lado = Math.max(180, Math.floor(Math.min(largura, altura)));
  pintor.redimensionar(lado);
  arena.style.width = `${lado}px`;
  arena.style.height = `${lado}px`;
  arena.style.borderRadius = `${pintor.raio}px`;
  // A HUD acompanha a largura da arena para os números assentarem nos cantos dela.
  document.documentElement.style.setProperty('--largura-arena', `${Math.max(260, lado)}px`);
}

function mostrarFim(): void {
  temporizadorFim = null;
  podeReiniciar = true;
  const ganhou = jogo.estado === 'completo';
  tituloFim.textContent = ganhou ? 'ARENA CHEIA' : 'FIM DE JOGO';
  fimPontos.textContent = String(jogo.pontos);
  fimRecorde.textContent = String(jogo.recorde);
  if (ganhou) fimMedalha.textContent = 'Encheste o tabuleiro. Não há mais sítio para crescer.';
  else if (jogo.pontos > 0 && jogo.pontos === jogo.recorde) fimMedalha.textContent = 'Recorde novo!';
  else fimMedalha.textContent = '';
  fimMedalha.hidden = fimMedalha.textContent === '';
  cartao.hidden = false;
  animar(cartao, 'entrar');
}

function terminar(): void {
  gravarRecorde(jogo.recorde);
  actualizarHud();
  dica.hidden = true;
  podeReiniciar = false;
  if (temporizadorFim !== null) window.clearTimeout(temporizadorFim);
  temporizadorFim = window.setTimeout(mostrarFim, ESPERA_FIM);
}

function reiniciar(): void {
  if (temporizadorFim !== null) {
    window.clearTimeout(temporizadorFim);
    temporizadorFim = null;
  }
  podeReiniciar = false;
  cartao.hidden = true;
  fimMedalha.hidden = true;
  dica.hidden = false;
  dica.textContent = semRato ? 'Desliza para começar' : 'Setas ou WASD para começar';
  pintor.limpar();
  jogo.reiniciar();
  acumulado = 0;
  ultimo = performance.now();
  actualizarHud();
}

function aplicar(): void {
  const r = jogo.passo();
  if (r.comeu) {
    pintor.explodir(jogo.corpo[0]);
    som.comer(jogo.comidas);
    actualizarHud();
    animar(alvoPontos, 'subiu');
    if (r.marco) {
      som.marco();
      animar(marcadorPontos, 'marco');
    }
  }
  if (r.completo) {
    som.vitoria();
    terminar();
    return;
  }
  if (r.morreu) {
    pintor.impacto(r.cabeca);
    som.fim();
    terminar();
  }
}

function quadro(agora: number): void {
  const dt = Math.min(64, Math.max(0, agora - ultimo));
  ultimo = agora;

  if (jogo.estado === 'a-jogar') {
    acumulado += dt;
    let guarda = 8;
    while (jogo.estado === 'a-jogar' && acumulado >= jogo.passoMs() && guarda-- > 0) {
      acumulado -= jogo.passoMs();
      aplicar();
    }
    if (jogo.estado !== 'a-jogar') acumulado = 0;
  }

  const t = jogo.estado === 'a-jogar' ? Math.min(1, acumulado / jogo.passoMs()) : 1;
  pintor.desenhar(jogo, t, dt, agora);
  requestAnimationFrame(quadro);
}

function virar(d: Direcao): void {
  // Se a direcção for recusada (inversão), a dica fica — o jogo ainda não arrancou.
  if (jogo.virar(d)) dica.hidden = true;
}

function confirmar(): void {
  if (jogo.estado === 'pronto') {
    dica.hidden = true;
    jogo.comecar();
    acumulado = 0;
    return;
  }
  if ((jogo.estado === 'morto' || jogo.estado === 'completo') && podeReiniciar) reiniciar();
}

function sincronizarBotaoSom(): void {
  botaoSom.classList.toggle('mudo', !som.ligado);
  botaoSom.setAttribute('aria-pressed', String(som.ligado));
  botaoSom.setAttribute('aria-label', som.ligado ? 'Desligar som' : 'Ligar som');
  botaoSom.title = som.ligado ? 'Desligar som' : 'Ligar som';
}

ligarControlos(arena, { virar, confirmar, interacao: () => som.garantir() });

botaoJogar.addEventListener('click', () => {
  som.garantir();
  botaoJogar.blur();
  if (podeReiniciar) reiniciar();
});

botaoSom.addEventListener('click', () => {
  som.alternar();
  sincronizarBotaoSom();
  botaoSom.blur();
});

arena.addEventListener('mousedown', (e) => {
  // Clicar na arena acorda o áudio e arranca; o cartão de fim tem o seu botão.
  if (cartao.contains(e.target as Node)) return;
  som.garantir();
  if (jogo.estado === 'pronto') confirmar();
});

window.addEventListener('resize', medirArena);
window.addEventListener('orientationchange', () => window.setTimeout(medirArena, 120));
if ('ResizeObserver' in window) new ResizeObserver(medirArena).observe(document.documentElement);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    ultimo = performance.now();
    acumulado = 0;
  }
});

// Mesma porta de diagnóstico que o jogo principal usa no teste de fumo.
declare global {
  interface Window {
    serpente?: { jogo: Jogo; som: Som; reiniciar: () => void };
  }
}
window.serpente = { jogo, som, reiniciar };

sincronizarBotaoSom();
actualizarHud();
medirArena();
requestAnimationFrame(quadro);
