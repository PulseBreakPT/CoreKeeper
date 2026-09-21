/** Montagem do jogo da serpente: estado, ciclo de quadros, HUD e fim de partida. */

import './estilo.css';
import { Jogo, LADO, SEGUNDOS_RELOGIO, type Direcao, type Modo } from './logica';
import { Pintor } from './pintura';
import { Som } from './audio';
import { ligarControlos } from './controlos';
import {
  CONQUISTAS,
  Carreira,
  criarMissao,
  nomeDesafioDiario,
  partilharResultado,
  valorMissao,
  type Missao,
} from './progressao';

/** Cada modo tem o seu recorde: as pontuações não são comparáveis entre eles. */
const CHAVE_RECORDE: Record<Modo, string> = {
  classico: 'serpente:recorde:v1',
  relogio: 'serpente:recorde:relogio:v1',
  portais: 'serpente:recorde:portais:v1',
  zen: 'serpente:recorde:zen:v1',
  escuro: 'serpente:recorde:escuro:v1',
  obstaculos: 'serpente:recorde:obstaculos:v1',
  'uma-vida': 'serpente:recorde:uma-vida:v1',
  diario: 'serpente:recorde:diario:v1',
};
const CHAVE_MODO = 'serpente:modo:v1';
const CHAVE_TEMA = 'serpente:tema:v1';
const CHAVE_COBRA = 'serpente:cobra:v1';
const CHAVE_PELE = 'serpente:pele:v1';

type Tema = 'floresta' | 'oceano' | 'violeta' | 'brasa';
const TEMAS: Record<Tema, number> = { floresta: 83, oceano: 188, violeta: 274, brasa: 19 };
const CORES_COBRA = [83, 188, 330, 42] as const;
type Pele = 'aurora' | 'pulso' | 'prisma' | 'brasa';
const PELES: Pele[] = ['aurora', 'pulso', 'prisma', 'brasa'];
const NOMES_MODO: Record<Modo, string> = {
  classico: 'CLÁSSICO', relogio: 'CONTRA O TEMPO', portais: 'PORTAIS', zen: 'ZEN',
  escuro: 'ECLIPSE', obstaculos: 'LABIRINTO', 'uma-vida': 'UMA VIDA', diario: 'DESAFIO DIÁRIO',
};
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
    const chave = modo === 'diario' ? `${CHAVE_RECORDE.diario}:${Math.floor(Date.now() / 86_400_000)}` : CHAVE_RECORDE[modo];
    const n = Number(localStorage.getItem(chave));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function gravarRecorde(modo: Modo, n: number): void {
  try {
    const chave = modo === 'diario' ? `${CHAVE_RECORDE.diario}:${Math.floor(Date.now() / 86_400_000)}` : CHAVE_RECORDE[modo];
    localStorage.setItem(chave, String(n));
  } catch {
    /* sem armazenamento, o recorde vive só nesta sessão */
  }
}

function lerModo(): Modo {
  try {
    const modo = localStorage.getItem(CHAVE_MODO) as Modo | null;
    return modo && modo in CHAVE_RECORDE ? modo : 'classico';
  } catch {
    return 'classico';
  }
}

function lerPele(): Pele {
  try {
    const pele = localStorage.getItem(CHAVE_PELE) as Pele | null;
    return pele && PELES.includes(pele) ? pele : 'aurora';
  } catch { return 'aurora'; }
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
const botaoPausar = elemento<HTMLButtonElement>('pausar');
const inicio = elemento<HTMLDivElement>('inicio');
const pausa = elemento<HTMLDivElement>('pausa');
const estado = elemento<HTMLElement>('estado');
const hudModo = elemento<HTMLElement>('hud-modo');
const progresso = elemento<HTMLProgressElement>('progresso');
const menuPrincipal = elemento<HTMLElement>('menu-principal');
const botaoEntrar = elemento<HTMLButtonElement>('entrar');
const botaoAbrirMenu = elemento<HTMLButtonElement>('abrir-menu');
const combo = elemento<HTMLDivElement>('combo');
const comboValor = elemento<HTMLElement>('combo-valor');
const missaoPartida = elemento<HTMLDivElement>('missao-partida');
const missaoTexto = elemento<HTMLElement>('missao-texto');
const missaoProgresso = elemento<HTMLElement>('missao-progresso');
const botaoPartilhar = elemento<HTMLButtonElement>('partilhar');
const folhaCarreira = elemento<HTMLElement>('folha-carreira');
let pausado = false;
let estadoAplicado = '';
let temaEscolhido = lerTema();
let cobraEscolhida = lerCobra();
let peleEscolhida = lerPele();

const modoInicial = lerModo();
const jogo = new Jogo({ lado: LADO, recorde: lerRecorde(modoInicial), modo: modoInicial });
const pintor = new Pintor(tela);
const som = new Som();
const carreira = new Carreira();
pintor.definirCores(cobraEscolhida, TEMAS[temaEscolhido]);
pintor.definirPele(peleEscolhida);
document.documentElement.dataset.tema = temaEscolhido;
document.documentElement.style.setProperty('--cobra', String(cobraEscolhida));
document.documentElement.style.setProperty('--tema', String(cobraEscolhida));

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
let duracaoPartida = 0;
let numeroPartida = carreira.dados.partidas;
let missao: Missao = criarMissao(numeroPartida, modoInicial);
let missaoCumprida = false;
let novasConquistas = '';

const semRato = window.matchMedia('(hover: none)').matches;
dica.textContent = semRato ? 'Desliza para começar' : 'Setas ou WASD para começar';

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
  document.querySelectorAll<HTMLButtonElement>('[data-pele]').forEach((botao) => {
    const seleccionado = botao.dataset.pele === peleEscolhida;
    botao.classList.toggle('seleccionada', seleccionado);
    botao.setAttribute('aria-pressed', String(seleccionado));
  });
}

function actualizarCarreira(): void {
  const d = carreira.dados;
  elemento('stat-partidas').textContent = String(d.partidas);
  elemento('stat-comidas').textContent = String(d.comidas);
  elemento('stat-nivel').textContent = String(carreira.nivel());
  elemento('diario-titulo').textContent = nomeDesafioDiario();
  elemento('diario-recorde').textContent = String(lerRecorde('diario'));
  elemento('menu-recorde').textContent = String(jogo.recorde);
  elemento('menu-conquistas').textContent = `${d.conquistas.length}/${CONQUISTAS.length}`;
  const minutos = Math.floor(d.tempoMs / 60_000);
  elemento('estatisticas').innerHTML = [
    ['PARTIDAS', d.partidas], ['PONTOS', d.pontos], ['LUZES', d.comidas],
    ['ESPECIAIS', d.especiais], ['MELHOR COMBO', `×${d.melhorCombo}`],
    ['MAIOR COBRA', d.maiorComprimento], ['MISSÕES', d.missoes], ['MINUTOS', minutos],
  ].map(([rotulo, valor]) => `<div><small>${rotulo}</small><strong>${valor}</strong></div>`).join('');
  elemento('conquistas').innerHTML = CONQUISTAS.map((c) => {
    const feita = d.conquistas.includes(c.id);
    return `<article class="${feita ? 'feita' : ''}"><b>${c.icone}</b><span><strong>${c.nome}</strong><small>${c.descricao}</small></span><i>${feita ? '✓' : '·'}</i></article>`;
  }).join('');
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
  document.documentElement.style.setProperty('--tema', String(matiz));
  matizAplicada = matiz;
  pintor.definirCores(matiz, TEMAS[temaEscolhido]);
  try { localStorage.setItem(CHAVE_COBRA, String(matiz)); } catch { /* preferência desta sessão */ }
  actualizarEscolhasMenu();
  vibrar(8);
}

function escolherPele(pele: Pele): void {
  peleEscolhida = pele;
  pintor.definirPele(pele);
  try { localStorage.setItem(CHAVE_PELE, pele); } catch { /* preferência desta sessão */ }
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

function actualizarMissao(): void {
  const valor = Math.min(missao.alvo, valorMissao(missao, jogo));
  missaoTexto.textContent = missao.texto;
  missaoProgresso.textContent = `${valor}/${missao.alvo}`;
  missaoPartida.classList.toggle('cumprida', missaoCumprida);
  if (!missaoCumprida && valor >= missao.alvo) {
    missaoCumprida = true;
    missaoPartida.classList.add('cumprida');
    missaoTexto.textContent = 'Missão cumprida';
    missaoProgresso.textContent = '✓';
    animar(missaoPartida, 'celebrar');
    som.marco();
    vibrar([16, 22, 28]);
  }
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
  combo.hidden = jogo.combo < 2;
  comboValor.textContent = `×${jogo.combo}`;
  actualizarMissao();
}

function medirArena(): void {
  // A largura vem da coluna; a altura reserva espaço para o cabeçalho e os controlos.
  const deitado = window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
  const movel = window.matchMedia('(max-width: 800px)').matches;
  const topo = palco.getBoundingClientRect().top;
  const reserva = deitado ? 42 : movel ? (window.innerHeight <= 720 ? 122 : 170) : 191;
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
  document.documentElement.dataset.estadoJogo = pausado ? 'pausa' : jogo.estado;
  inicio.hidden = jogo.estado !== 'pronto';
  pausa.hidden = !pausado;
  botaoPausar.disabled = jogo.estado !== 'a-jogar';
  botaoPausar.setAttribute('aria-pressed', String(pausado));
  botaoPausar.setAttribute('aria-label', pausado ? 'Continuar partida' : 'Pausar partida');
  estado.textContent = pausado ? 'EM PAUSA' : jogo.estado === 'pronto' ? 'À TUA ESPERA'
    : jogo.estado === 'a-jogar' ? (arranque >= 0 ? 'PREPARA-TE' : 'NO FLOW')
    : jogo.estado === 'completo' ? 'ARENA CONQUISTADA' : 'MAIS UMA?';
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
  if (novasConquistas) fimMedalha.textContent = `${fimMedalha.textContent ? `${fimMedalha.textContent} · ` : ''}Conquista: ${novasConquistas}.`;
  if (missaoCumprida) fimMedalha.textContent = `${fimMedalha.textContent ? `${fimMedalha.textContent} · ` : ''}Missão cumprida.`;
  fimMedalha.hidden = fimMedalha.textContent === '';
  cartao.hidden = false;
  animar(cartao, 'entrar');
}

function terminar(): void {
  gravarRecorde(jogo.modo, jogo.recorde);
  const novas = carreira.registar(jogo, duracaoPartida, missaoCumprida);
  novasConquistas = novas.map((c) => c.nome).join(', ');
  actualizarCarreira();
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
  dica.textContent = semRato ? 'Desliza para começar' : 'Setas ou WASD para começar';
  pintor.limpar();
  jogo.reiniciar();
  numeroPartida++;
  missao = criarMissao(numeroPartida, jogo.modo);
  missaoCumprida = false;
  duracaoPartida = 0;
  novasConquistas = '';
  missaoPartida.classList.remove('cumprida');
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
    pintor.explodir(jogo.corpo[0], r.ganhos, r.marco);
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
  if (r.cortou) {
    vibrar(18);
    actualizarHud();
  }
  if (r.comboQuebrou) actualizarHud();
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
  if (aCorrer) duracaoPartida += dt;

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

function virar(d: Direcao): boolean {
  if (pausado) return false;
  const arrancava = jogo.estado === 'pronto';
  // Se a direcção for recusada (inversão), a dica fica — o jogo ainda não arrancou.
  if (!jogo.virar(d)) return false;
  vibrar(7);
  animar(arena, 'virou');
  dica.hidden = true;
  // A primeira ordem não põe a serpente a andar: põe a contagem a andar.
  if (arrancava) comecarContagem();
  return true;
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
  hudModo.textContent = NOMES_MODO[jogo.modo];
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
document.querySelectorAll<HTMLButtonElement>('[data-pele]').forEach((botao) => {
  botao.addEventListener('click', () => escolherPele(botao.dataset.pele as Pele));
});
document.querySelectorAll<HTMLButtonElement>('[data-escolha-modo]').forEach((botao) => {
  botao.addEventListener('click', () => escolherModo(botao.dataset.escolhaModo as Modo));
});
document.querySelectorAll<HTMLButtonElement>('[data-menu-categoria]').forEach((botao) => {
  botao.addEventListener('click', () => {
    const categoria = botao.dataset.menuCategoria;
    document.querySelectorAll<HTMLButtonElement>('[data-menu-categoria]').forEach((b) => b.classList.toggle('activo', b === botao));
    document.querySelectorAll<HTMLElement>('[data-menu-painel]').forEach((painel) => painel.classList.toggle('activo', painel.dataset.menuPainel === categoria));
    vibrar(6);
  });
});

const fecharCarreira = (): void => { folhaCarreira.hidden = true; };
elemento('abrir-carreira').addEventListener('click', () => {
  actualizarCarreira();
  folhaCarreira.hidden = false;
  vibrar(8);
});
elemento('fechar-carreira').addEventListener('click', fecharCarreira);
elemento('fechar-carreira-x').addEventListener('click', fecharCarreira);

botaoPartilhar.addEventListener('click', async () => {
  const modo = NOMES_MODO[jogo.modo].toLocaleLowerCase('pt-PT');
  const texto = `Marquei ${jogo.pontos} pontos e cheguei a ${jogo.corpo.length} segmentos no modo ${modo} de Serpente. Consegues superar?`;
  try {
    const resultado = await partilharResultado(texto);
    if (resultado === 'copiado') botaoPartilhar.firstChild!.textContent = 'RESULTADO COPIADO ';
  } catch { /* o jogador fechou o menu nativo */ }
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
  document.documentElement.style.setProperty('--tema', String(cobraEscolhida));
  matizAplicada = cobraEscolhida;
  actualizarEscolhasMenu();
  menuPrincipal.classList.remove('fechado');
  vibrar(10);
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
actualizarCarreira();
reporRelogio();
sincronizarMatiz();
actualizarHud();
medirArena();
sincronizarEstado();
requestAnimationFrame(quadro);
