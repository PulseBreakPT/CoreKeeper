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
const CHAVE_TEMA = 'serpente:tema:v1';
const CHAVE_COBRA = 'serpente:cobra:v1';

type Tema = 'floresta' | 'oceano' | 'violeta' | 'brasa';
const TEMAS: Record<Tema, number> = { floresta: 83, oceano: 188, violeta: 274, brasa: 19 };
const CORES_COBRA = [83, 188, 330, 42] as const;
/** Tempo entre a morte e o cartão de fim — dá espaço ao impacto. */
const ESPERA_FIM = 440;
const RELOGIO_MS = SEGUNDOS_RELOGIO * 1000;
/** A contagem de arranque, passo a passo, com a duração de cada um. */
const ARRANQUE: { texto: string; ms: number }[] = [
  { texto: '3', ms: 520 },
  { texto: '2', ms: 520 },
  { texto: '1', ms: 520 },
  { texto: 'VAI', ms: 380 },
];

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

function lerTema(): Tema {
  try {
    const guardado = localStorage.getItem(CHAVE_TEMA) as Tema | null;
    return guardado && guardado in TEMAS ? guardado : 'floresta';
  } catch {
    return 'floresta';
  }
}

function lerCobra(): number {
  try {
    const guardada = Number(localStorage.getItem(CHAVE_COBRA));
    return CORES_COBRA.includes(guardada as (typeof CORES_COBRA)[number]) ? guardada : 83;
  } catch {
    return 83;
  }
}

const palco = elemento<HTMLDivElement>('palco');
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
const botaoPausar = elemento<HTMLButtonElement>('pausar');
const inicio = elemento<HTMLDivElement>('inicio');
const pausa = elemento<HTMLDivElement>('pausa');
const estado = elemento<HTMLElement>('estado');
const hudModo = elemento<HTMLElement>('hud-modo');
const progresso = elemento<HTMLProgressElement>('progresso');
const menuPrincipal = elemento<HTMLElement>('menu-principal');
const botaoEntrar = elemento<HTMLButtonElement>('entrar');
const botaoAbrirMenu = elemento<HTMLButtonElement>('abrir-menu');
let pausado = false;
let estadoAplicado = '';
let temaEscolhido = lerTema();
let cobraEscolhida = lerCobra();

const modoInicial = lerModo();
const jogo = new Jogo({ lado: LADO, recorde: lerRecorde(modoInicial), modo: modoInicial });
const pintor = new Pintor(tela);
const som = new Som();
pintor.definirCores(cobraEscolhida, TEMAS[temaEscolhido]);
document.documentElement.dataset.tema = temaEscolhido;
document.documentElement.style.setProperty('--cobra', String(cobraEscolhida));

let temporizadorFim: number | null = null;
let podeReiniciar = false;
let ultimo = performance.now();
let acumulado = 0;
/** Milissegundos que faltam para comer, no modo de relógio. */
let restante = RELOGIO_MS;
/** Último segundo anunciado, para o tique-taque não disparar a cada quadro. */
let ultimoTique = 0;
let porTempo = false;
/** Milissegundos decorridos da contagem de arranque, ou -1 quando não há. */
let arranque = -1;
let arranqueAnunciado = -1;

const semRato = window.matchMedia('(hover: none)').matches;
dica.textContent = semRato ? 'Desliza ou toca nas setas' : 'Setas ou WASD para começar';

/** Resposta tátil curta: acrescenta confirmação sem competir com o som. */
function vibrar(padrao: number | number[]): void {
  if ('vibrate' in navigator) navigator.vibrate(padrao);
}

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
  document.documentElement.style.setProperty('--cobra', String(matiz));
}

function actualizarEscolhasMenu(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-tema]').forEach((botao) => {
    const seleccionado = botao.dataset.tema === temaEscolhido;
    botao.classList.toggle('seleccionada', seleccionado);
    botao.setAttribute('aria-pressed', String(seleccionado));
  });
  document.querySelectorAll<HTMLButtonElement>('[data-cobra]').forEach((botao) => {
    const seleccionado = Number(botao.dataset.cobra) === cobraEscolhida;
    botao.classList.toggle('seleccionada', seleccionado);
    botao.setAttribute('aria-pressed', String(seleccionado));
  });
  document.querySelectorAll<HTMLButtonElement>('[data-escolha-modo]').forEach((botao) => {
    const seleccionado = botao.dataset.escolhaModo === jogo.modo;
    botao.classList.toggle('seleccionado', seleccionado);
    botao.setAttribute('aria-pressed', String(seleccionado));
  });
}

function escolherTema(tema: Tema): void {
  temaEscolhido = tema;
  document.documentElement.dataset.tema = tema;
  pintor.definirCores(cobraEscolhida, TEMAS[tema]);
  try { localStorage.setItem(CHAVE_TEMA, tema); } catch { /* preferência desta sessão */ }
  actualizarEscolhasMenu();
  vibrar(8);
}

function escolherCobra(matiz: number): void {
  cobraEscolhida = matiz;
  document.documentElement.style.setProperty('--cobra', String(matiz));
  matizAplicada = matiz;
  pintor.definirCores(matiz, TEMAS[temaEscolhido]);
  try { localStorage.setItem(CHAVE_COBRA, String(matiz)); } catch { /* preferência desta sessão */ }
  actualizarEscolhasMenu();
  vibrar(8);
}

function escolherModo(modo: Modo): void {
  if (jogo.modo === modo) return;
  jogo.modo = modo;
  jogo.recorde = lerRecorde(modo);
  try { localStorage.setItem(CHAVE_MODO, modo); } catch { /* preferência desta sessão */ }
  sincronizarBotaoModo();
  reiniciar();
  actualizarEscolhasMenu();
  vibrar(8);
}

function actualizarHud(): void {
  alvoPontos.textContent = String(jogo.pontos);
  alvoRecorde.textContent = String(jogo.recorde);
  coroa.hidden = !(jogo.pontos > 0 && jogo.pontos === jogo.recorde);
  const marco = (Math.floor(jogo.pontos / 10) + 1) * 10;
  elemento('marco-texto').textContent = `${jogo.pontos} / ${marco}`;
  progresso.value = jogo.pontos % 10;
  elemento('comprimento').textContent = String(jogo.corpo.length);
  elemento('velocidade').textContent = `${(150 / jogo.passoMs()).toFixed(2)}× RITMO`;
}

function medirArena(): void {
  // A largura vem da coluna; a altura reserva espaço para o cabeçalho e os controlos.
  const deitado = window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
  const movel = window.matchMedia('(max-width: 800px)').matches;
  const topo = palco.getBoundingClientRect().top;
  const reserva = deitado ? 42 : movel ? (window.innerHeight <= 720 ? 88 : 134) : 155;
  const lado = Math.max(100, Math.floor(Math.min(palco.clientWidth, window.innerHeight - topo - reserva)));
  if (tela.style.width === `${lado}px`) return;
  pintor.redimensionar(lado);
  arena.style.width = `${lado}px`;
  arena.style.height = `${lado}px`;
  arena.style.borderRadius = `${pintor.raio}px`;
}

function sincronizarEstado(): void {
  const chave = `${jogo.estado}:${jogo.direcao}:${pausado}:${arranque >= 0}`;
  if (chave === estadoAplicado) return;
  estadoAplicado = chave;
  inicio.hidden = jogo.estado !== 'pronto';
  pausa.hidden = !pausado;
  botaoPausar.disabled = jogo.estado !== 'a-jogar';
  botaoPausar.setAttribute('aria-pressed', String(pausado));
  botaoPausar.setAttribute('aria-label', pausado ? 'Continuar partida' : 'Pausar partida');
  estado.textContent = pausado ? 'EM PAUSA' : jogo.estado === 'pronto' ? 'À TUA ESPERA'
    : jogo.estado === 'a-jogar' ? (arranque >= 0 ? 'PREPARA-TE' : 'NO FLOW')
    : jogo.estado === 'completo' ? 'ARENA CONQUISTADA' : 'MAIS UMA?';
  document.querySelectorAll<HTMLButtonElement>('[data-direcao]').forEach((botao) => {
    botao.classList.toggle('activa', jogo.estado === 'a-jogar' && botao.dataset.direcao === jogo.direcao);
  });
}

function alternarPausa(): void {
  if (jogo.estado !== 'a-jogar') return;
  pausado = !pausado;
  ultimo = performance.now();
  sincronizarEstado();
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
  pausado = false;
  arranque = -1;
  arranqueAnunciado = -1;
  pintor.arranque = null;
  cartao.hidden = true;
  fimMedalha.hidden = true;
  dica.hidden = false;
  dica.textContent = semRato ? 'Desliza ou toca nas setas' : 'Setas ou WASD para começar';
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
    vibrar(r.marco ? [18, 28, 18] : 12);
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
    vibrar([25, 35, 25, 35, 60]);
    terminar();
    return;
  }
  if (r.morreu) {
    pintor.impacto(r.cabeca);
    som.fim();
    vibrar([55, 35, 90]);
    terminar();
  }
}

function quadro(agora: number): void {
  const dt = pausado ? 0 : Math.min(64, Math.max(0, agora - ultimo));
  ultimo = agora;

  if (arranque >= 0) {
    arranque += dt;
    let inicio = 0;
    let passo = 0;
    while (passo < ARRANQUE.length && arranque >= inicio + ARRANQUE[passo].ms) {
      inicio += ARRANQUE[passo].ms;
      passo++;
    }
    if (passo >= ARRANQUE.length) {
      // Acabou: a partir daqui é que a serpente anda e o relógio conta.
      arranque = -1;
      pintor.arranque = null;
      acumulado = 0;
    } else {
      pintor.arranque = {
        texto: ARRANQUE[passo].texto,
        progresso: (arranque - inicio) / ARRANQUE[passo].ms,
      };
      if (passo !== arranqueAnunciado) {
        arranqueAnunciado = passo;
        som.contagem(passo === ARRANQUE.length - 1);
      }
    }
  }

  // Durante a contagem o jogo já está "a jogar", mas ainda não se mexe.
  const aCorrer = jogo.estado === 'a-jogar' && arranque < 0 && !pausado;

  if (aCorrer && jogo.modo === 'relogio') {
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
      vibrar([55, 35, 90]);
      terminar();
    }
  }

  if (aCorrer) {
    acumulado += dt;
    let guarda = 8;
    while (jogo.estado === 'a-jogar' && acumulado >= jogo.passoMs() && guarda-- > 0) {
      acumulado -= jogo.passoMs();
      aplicar();
    }
    if (jogo.estado !== 'a-jogar') acumulado = 0;
  }

  const t = jogo.estado === 'a-jogar' && arranque < 0 ? Math.min(1, acumulado / jogo.passoMs()) : 1;
  pintor.desenhar(jogo, t, dt, agora);
  sincronizarMatiz();
  sincronizarEstado();
  requestAnimationFrame(quadro);
}

function virar(d: Direcao): void {
  if (pausado) return;
  const arrancava = jogo.estado === 'pronto';
  // Se a direcção for recusada (inversão), a dica fica — o jogo ainda não arrancou.
  if (!jogo.virar(d)) return;
  vibrar(7);
  dica.hidden = true;
  // A primeira ordem não põe a serpente a andar: põe a contagem a andar.
  if (arrancava) comecarContagem();
}

/** Arranca o 3, 2, 1, VAI. A serpente fica quieta até ele acabar. */
function comecarContagem(): void {
  arranque = 0;
  arranqueAnunciado = -1;
  acumulado = 0;
  reporRelogio();
}

function confirmar(): void {
  if (pausado) { alternarPausa(); return; }
  if (jogo.estado === 'pronto') {
    dica.hidden = true;
    jogo.comecar();
    comecarContagem();
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
  elemento('modo-nome').textContent = relogio ? 'Relógio' : 'Clássico';
  hudModo.textContent = relogio ? 'CONTRA O TEMPO' : 'CLÁSSICO';
  elemento('modo-dica').textContent = relogio
    ? `${SEGUNDOS_RELOGIO} segundos para comer. Cada luz renova o tempo.`
    : 'O original. Sem limites de tempo.';
}

function trocarModo(): void {
  escolherModo(jogo.modo === 'relogio' ? 'classico' : 'relogio');
}

function sincronizarBotaoSom(): void {
  botaoSom.classList.toggle('mudo', !som.ligado);
  botaoSom.setAttribute('aria-pressed', String(som.ligado));
  botaoSom.setAttribute('aria-label', som.ligado ? 'Desligar som' : 'Ligar som');
  botaoSom.title = som.ligado ? 'Desligar som' : 'Ligar som';
}

ligarControlos(arena, { virar, confirmar, interacao: () => som.garantir() });
document.querySelectorAll<HTMLButtonElement>('[data-tema]').forEach((botao) => {
  botao.addEventListener('click', () => escolherTema(botao.dataset.tema as Tema));
});
document.querySelectorAll<HTMLButtonElement>('[data-cobra]').forEach((botao) => {
  botao.addEventListener('click', () => escolherCobra(Number(botao.dataset.cobra)));
});
document.querySelectorAll<HTMLButtonElement>('[data-escolha-modo]').forEach((botao) => {
  botao.addEventListener('click', () => escolherModo(botao.dataset.escolhaModo as Modo));
});
botaoEntrar.addEventListener('click', () => {
  som.garantir();
  vibrar(14);
  menuPrincipal.classList.add('fechado');
  confirmar();
});
botaoAbrirMenu.addEventListener('click', () => {
  reiniciar();
  document.documentElement.style.setProperty('--cobra', String(cobraEscolhida));
  matizAplicada = cobraEscolhida;
  actualizarEscolhasMenu();
  menuPrincipal.classList.remove('fechado');
  vibrar(10);
});
document.querySelectorAll<HTMLButtonElement>('[data-direcao]').forEach((botao) => {
  botao.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    som.garantir();
    virar(botao.dataset.direcao as Direcao);
    botao.blur();
  });
});
elemento('comecar').addEventListener('click', () => { elemento('comecar').blur(); som.garantir(); confirmar(); });
elemento('continuar').addEventListener('click', () => { elemento('continuar').blur(); alternarPausa(); });
botaoPausar.addEventListener('click', () => { botaoPausar.blur(); alternarPausa(); });
window.addEventListener('keydown', (e) => {
  if (e.repeat || (e.code !== 'KeyP' && e.code !== 'Escape')) return;
  e.preventDefault();
  alternarPausa();
});

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
  if (cartao.contains(e.target as Node) || (e.target as Element).closest('button')) return;
  som.garantir();
  if (jogo.estado === 'pronto') confirmar();
});

window.addEventListener('resize', medirArena);
window.addEventListener('orientationchange', () => window.setTimeout(medirArena, 120));
if ('ResizeObserver' in window) new ResizeObserver(medirArena).observe(palco);

document.addEventListener('visibilitychange', () => {
  if (document.hidden && jogo.estado === 'a-jogar' && !pausado) alternarPausa();
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
actualizarEscolhasMenu();
reporRelogio();
sincronizarMatiz();
actualizarHud();
medirArena();
sincronizarEstado();
requestAnimationFrame(quadro);
