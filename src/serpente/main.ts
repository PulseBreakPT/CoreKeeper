/** Montagem do jogo da serpente: estado, ciclo de quadros, HUD e fim de partida. */

import './estilo.css';
import { Jogo, LADO, SEGUNDOS_RELOGIO, type Direcao, type Modo } from './logica';
import { Pintor } from './pintura';
import { Som } from './audio';
import { ligarControlos } from './controlos';

/** Cada modo tem o seu recorde: as pontuações não são comparáveis entre eles. */
const CHAVE_RECORDE: Record<Modo, string> = {
  classico: 'serpente:recorde:v1',
  relogio: 'serpente:recorde:relogio:v1',
};
const CHAVE_MODO = 'serpente:modo:v1';
/** Tempo entre a morte e o cartão de fim — dá espaço ao impacto. */
const ESPERA_FIM = 440;
const RELOGIO_MS = SEGUNDOS_RELOGIO * 1000;

function elemento<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Falta o elemento #${id}`);
  return e as T;
}

function lerRecorde(modo: Modo): number {
  try {
    const n = Number(localStorage.getItem(CHAVE_RECORDE[modo]));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function gravarRecorde(modo: Modo, n: number): void {
  try {
    localStorage.setItem(CHAVE_RECORDE[modo], String(n));
  } catch {
    /* sem armazenamento, o recorde vive só nesta sessão */
  }
}

function lerModo(): Modo {
  try {
    return localStorage.getItem(CHAVE_MODO) === 'relogio' ? 'relogio' : 'classico';
  } catch {
    return 'classico';
  }
}

const palco = elemento<HTMLDivElement>('palco');
const hud = elemento<HTMLElement>('hud');
const arena = elemento<HTMLDivElement>('arena');
const tela = elemento<HTMLCanvasElement>('tela');
const marcadorPontos = elemento<HTMLDivElement>('marcador-pontos');
const alvoPontos = elemento<HTMLSpanElement>('pontos');
const alvoRecorde = elemento<HTMLSpanElement>('recorde');
const coroa = elemento<HTMLElement>('coroa');
const dica = elemento<HTMLParagraphElement>('dica');
const cartao = elemento<HTMLDivElement>('fim');
const tituloFim = elemento<HTMLHeadingElement>('fim-titulo');
const fimPontos = elemento<HTMLSpanElement>('fim-pontos');
const fimRecorde = elemento<HTMLSpanElement>('fim-recorde');
const fimMedalha = elemento<HTMLParagraphElement>('fim-medalha');
const botaoJogar = elemento<HTMLButtonElement>('jogar');
const botaoSom = elemento<HTMLButtonElement>('som');
const botaoModo = elemento<HTMLButtonElement>('modo');

const modoInicial = lerModo();
const jogo = new Jogo({ lado: LADO, recorde: lerRecorde(modoInicial), modo: modoInicial });
const pintor = new Pintor(tela);
const som = new Som();

let temporizadorFim: number | null = null;
let podeReiniciar = false;
let ultimo = performance.now();
let acumulado = 0;
/** Milissegundos que faltam para comer, no modo de relógio. */
let restante = RELOGIO_MS;
/** Último segundo anunciado, para o tique-taque não disparar a cada quadro. */
let ultimoTique = 0;
let porTempo = false;

const semRato = window.matchMedia('(hover: none)').matches;
dica.textContent = semRato ? 'Desliza para começar' : 'Setas ou WASD para começar';

function animar(alvo: HTMLElement, classe: string): void {
  alvo.classList.remove(classe);
  // Forçar refluxo reinicia a animação mesmo quando dispara duas vezes seguidas.
  void alvo.offsetWidth;
  alvo.classList.add(classe);
}

let matizAplicada = -1;

/** A interface acompanha a cor da serpente, que por sua vez segue a velocidade. */
function sincronizarMatiz(): void {
  const matiz = Math.round(pintor.matiz);
  if (matiz === matizAplicada) return;
  matizAplicada = matiz;
  document.documentElement.style.setProperty('--matiz', String(matiz));
}

function actualizarHud(): void {
  alvoPontos.textContent = String(jogo.pontos);
  alvoRecorde.textContent = String(jogo.recorde);
  coroa.hidden = !(jogo.pontos > 0 && jogo.pontos === jogo.recorde);
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
  cartao.classList.toggle('vitoria', ganhou);
  tituloFim.textContent = ganhou ? 'ARENA CHEIA' : porTempo ? 'TEMPO ESGOTADO' : 'FIM DE JOGO';
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
  gravarRecorde(jogo.modo, jogo.recorde);
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
  reporRelogio();
  actualizarHud();
}

/** Volta a encher a janela de tempo: ao arrancar, ao comer e ao reiniciar. */
function reporRelogio(): void {
  restante = RELOGIO_MS;
  ultimoTique = 0;
  porTempo = false;
  pintor.relogio = jogo.modo === 'relogio' ? 1 : null;
  pintor.segundos = SEGUNDOS_RELOGIO;
}

function aplicar(): void {
  const r = jogo.passo();
  if (r.comeu) {
    pintor.explodir(jogo.corpo[0], jogo.pontos, r.marco);
    som.comer(jogo.comidas);
    restante = RELOGIO_MS;
    ultimoTique = 0;
    actualizarHud();
    animar(alvoPontos, 'subiu');
    if (r.marco) {
      som.marco();
      animar(marcadorPontos, 'marco');
    }
  }
  if (r.completo) {
    pintor.vitoria(jogo.corpo[0]);
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

  if (jogo.estado === 'a-jogar' && jogo.modo === 'relogio') {
    restante -= dt;
    const segundos = Math.max(0, Math.ceil(restante / 1000));
    pintor.relogio = Math.max(0, restante / RELOGIO_MS);
    pintor.segundos = segundos;
    if (segundos <= 3 && segundos > 0 && segundos !== ultimoTique) {
      ultimoTique = segundos;
      som.tique();
    }
    if (restante <= 0 && jogo.esgotar()) {
      porTempo = true;
      pintor.relogio = 0;
      pintor.impacto(jogo.corpo[0]);
      som.fim();
      terminar();
    }
  }

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
  sincronizarMatiz();
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

function sincronizarBotaoModo(): void {
  const relogio = jogo.modo === 'relogio';
  botaoModo.classList.toggle('activo', relogio);
  botaoModo.setAttribute('aria-pressed', String(relogio));
  const etiqueta = relogio
    ? `Modo relógio: ${SEGUNDOS_RELOGIO} segundos para comer. Tocar volta ao clássico`
    : 'Modo clássico. Tocar liga o modo relógio';
  botaoModo.setAttribute('aria-label', etiqueta);
  botaoModo.title = etiqueta;
}

function trocarModo(): void {
  jogo.modo = jogo.modo === 'relogio' ? 'classico' : 'relogio';
  try {
    localStorage.setItem(CHAVE_MODO, jogo.modo);
  } catch {
    /* sem armazenamento, o modo vive só nesta sessão */
  }
  // Cada modo tem o seu recorde, por isso troca-se também o que está no HUD.
  jogo.recorde = lerRecorde(jogo.modo);
  sincronizarBotaoModo();
  reiniciar();
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

botaoModo.addEventListener('click', () => {
  som.garantir();
  trocarModo();
  botaoModo.blur();
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
    serpente?: { jogo: Jogo; som: Som; reiniciar: () => void; restante: () => number };
  }
}
window.serpente = { jogo, som, reiniciar, restante: () => restante };

sincronizarBotaoSom();
sincronizarBotaoModo();
reporRelogio();
sincronizarMatiz();
actualizarHud();
medirArena();
requestAnimationFrame(quadro);
