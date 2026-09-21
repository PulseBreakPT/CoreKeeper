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
  partilharResultado,
  valorMissao,
  type Missao,
  type Estatisticas,
} from './progressao';
import {
  definirIdioma,
  idiomaActual,
  nomeDiario,
  nomeModo,
  t,
  textoConquista,
  textoMissao,
  type ChaveTexto,
  type Idioma,
} from './idiomas';

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
  extremo: 'serpente:recorde:extremo:v1',
  mini: 'serpente:recorde:mini:v1',
  dupla: 'serpente:recorde:dupla:v1',
};
const CHAVE_MODO = 'serpente:modo:v1';
const CHAVE_TEMA = 'serpente:tema:v1';
const CHAVE_COBRA = 'serpente:cobra:v1';
const CHAVE_PELE = 'serpente:pele:v1';
const CHAVE_DEFINICOES = 'serpente:definicoes:v1';
const CHAVE_TUTORIAL = 'serpente:tutorial:v1';

type Tema = 'floresta' | 'oceano' | 'violeta' | 'brasa';
const TEMAS: Record<Tema, number> = { floresta: 83, oceano: 188, violeta: 274, brasa: 19 };
const CORES_COBRA = [83, 188, 330, 42] as const;
type Pele = 'aurora' | 'pulso' | 'prisma' | 'brasa';
const PELES: Pele[] = ['aurora', 'pulso', 'prisma', 'brasa'];
interface Definicoes { sensibilidade: number; esquerdino: boolean; reduzirMovimento: boolean; daltonico: boolean; temaAutomatico: boolean; rasto: boolean }
const DEFINICOES_BASE: Definicoes = { sensibilidade: 11, esquerdino: false, reduzirMovimento: false, daltonico: false, temaAutomatico: false, rasto: true };

function lerDefinicoes(): Definicoes {
  try { return { ...DEFINICOES_BASE, ...JSON.parse(localStorage.getItem(CHAVE_DEFINICOES) ?? '{}') }; }
  catch { return { ...DEFINICOES_BASE }; }
}
/** Tempo entre a morte e o cartão de fim — dá espaço ao impacto. */
const ESPERA_FIM = 440;
const RELOGIO_MS = SEGUNDOS_RELOGIO * 1000;
/** A contagem de arranque, passo a passo, com a duração de cada um. */
const ARRANQUE: { texto: string; ms: number }[] = [
  { texto: '3', ms: 520 },
  { texto: '2', ms: 520 },
  { texto: '1', ms: 520 },
  { texto: '', ms: 380 },
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
const caixaEstado = elemento<HTMLDivElement>('estado-caixa');
const alvoTempo = elemento<HTMLElement>('tempo');
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
const folhaSistema = elemento<HTMLElement>('folha-sistema');
const sistemaTitulo = elemento<HTMLElement>('sistema-titulo');
const sistemaEtiqueta = elemento<HTMLElement>('sistema-etiqueta');
const sistemaConteudo = elemento<HTMLElement>('sistema-conteudo');
const poderesActivos = elemento<HTMLElement>('poderes-ativos');
const botaoReviver = elemento<HTMLButtonElement>('reviver');
const tutorial = elemento<HTMLElement>('tutorial');
let pausado = false;
let estadoAplicado = '';
let temaEscolhido = lerTema();
let cobraEscolhida = lerCobra();
let peleEscolhida = lerPele();
let idiomaEscolhido = idiomaActual();
let definicoes = lerDefinicoes();
definirIdioma(idiomaEscolhido);

const modoInicial = lerModo();
const jogo = new Jogo({ lado: LADO, recorde: lerRecorde(modoInicial), modo: modoInicial });
const pintor = new Pintor(tela);
const som = new Som();
const carreira = new Carreira();
pintor.definirCores(cobraEscolhida, TEMAS[temaEscolhido]);
pintor.definirPele(peleEscolhida, definicoes.rasto);
document.documentElement.dataset.tema = temaEscolhido;
document.documentElement.style.setProperty('--cobra', String(cobraEscolhida));
document.documentElement.style.setProperty('--tema', String(TEMAS[temaEscolhido]));
aplicarDefinicoes();

let temporizadorFim: number | null = null;
let podeReiniciar = false;
let ultimo = performance.now();
let acumulado = 0;
/** Milissegundos que faltam para comer, no modo de relógio. */
let restante = RELOGIO_MS;
/** Último segundo anunciado, para o tique-taque não disparar a cada quadro. */
let ultimoTique = 0;
let porTempo = false;
/** Último texto posto no contador, para não escrever no DOM a cada quadro. */
let tempoMostrado = '';
/** Milissegundos decorridos da contagem de arranque, ou -1 quando não há. */
let arranque = -1;
let arranqueAnunciado = -1;
let duracaoPartida = 0;
let numeroPartida = carreira.dados.partidas;
let missao: Missao = criarMissao(numeroPartida, modoInicial);
let missaoCumprida = false;
let novasConquistas = '';
let jaRegistada = false;
let carreiraAntesDoFim: Estatisticas | null = null;
let comboAnterior = 0;

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

function guardarDefinicoes(): void {
  try { localStorage.setItem(CHAVE_DEFINICOES, JSON.stringify(definicoes)); } catch { /* sessão privada */ }
}

function aplicarDefinicoes(): void {
  document.documentElement.classList.toggle('esquerdino', definicoes.esquerdino);
  document.documentElement.classList.toggle('reduzir-movimento', definicoes.reduzirMovimento);
  document.documentElement.classList.toggle('modo-daltonico', definicoes.daltonico);
  document.documentElement.classList.toggle('rasto-neon', carreira?.dados.compras.includes('rasto-neon') ?? false);
  document.documentElement.classList.toggle('impacto-prisma', carreira?.dados.compras.includes('impacto-prisma') ?? false);
  document.documentElement.classList.toggle('aura-coroa', carreira?.dados.compras.includes('aura-coroa') ?? false);
  pintor?.definirPele(peleEscolhida, definicoes.rasto);
  if (definicoes.temaAutomatico) {
    const hora = new Date().getHours();
    escolherTema(hora < 7 || hora >= 20 ? 'violeta' : hora < 12 ? 'oceano' : hora < 18 ? 'floresta' : 'brasa', false);
  }
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
  document.querySelectorAll<HTMLButtonElement>('[data-idioma]').forEach((botao) => {
    const seleccionado = botao.dataset.idioma === idiomaEscolhido;
    botao.classList.toggle('seleccionada', seleccionado);
    botao.setAttribute('aria-pressed', String(seleccionado));
  });
}

function aplicarIdioma(idioma: Idioma): void {
  idiomaEscolhido = idioma;
  definirIdioma(idioma);
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((alvo) => {
    alvo.textContent = t(alvo.dataset.i18n as ChaveTexto);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((alvo) => {
    alvo.innerHTML = t(alvo.dataset.i18nHtml as ChaveTexto);
  });
  const descricao = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (descricao) descricao.content = t('meta');
  tela.setAttribute('aria-label', t('deslizaArena'));
  botaoAbrirMenu.setAttribute('aria-label', t('abrirMenu'));
  elemento('fechar-carreira').setAttribute('aria-label', t('fechar'));
  elemento('fechar-carreira-x').setAttribute('aria-label', t('fechar'));
  if (jogo.estado === 'pronto') dica.textContent = semRato ? t('deslizaComecar') : t('teclasComecar');
  estadoAplicado = '';
  sincronizarBotaoSom();
  sincronizarBotaoModo();
  actualizarEscolhasMenu();
  actualizarCarreira();
  actualizarHud();
  sincronizarEstado();
}

function actualizarCarreira(): void {
  const d = carreira.dados;
  elemento('stat-partidas').textContent = String(d.partidas);
  elemento('stat-comidas').textContent = String(d.comidas);
  elemento('stat-nivel').textContent = String(carreira.nivel());
  elemento('diario-titulo').textContent = nomeDiario();
  elemento('diario-recorde').textContent = String(lerRecorde('diario'));
  elemento('menu-recorde').textContent = String(jogo.recorde);
  elemento('menu-conquistas').textContent = `${d.conquistas.length}/${CONQUISTAS.length}`;
  elemento('menu-moedas').textContent = String(d.moedas);
  elemento('menu-xp').textContent = String(d.xp);
  const minutos = Math.floor(d.tempoMs / 60_000);
  elemento('carreira-contagem').innerHTML = `<b id="stat-partidas">${d.partidas}</b> ${t('partidas')} · <b id="stat-comidas">${d.comidas}</b> ${t('luzes')}`;
  elemento('estatisticas').innerHTML = [
    [t('statPartidas'), d.partidas], [t('statPontos'), d.pontos], [t('statLuzes'), d.comidas],
    [t('statEspeciais'), d.especiais], [t('statCombo'), `×${d.melhorCombo}`],
    [t('statCobra'), d.maiorComprimento], [t('statMissoes'), d.missoes], [t('statMinutos'), minutos],
  ].map(([rotulo, valor]) => `<div><small>${rotulo}</small><strong>${valor}</strong></div>`).join('');
  elemento('conquistas').innerHTML = CONQUISTAS.map((c) => {
    const feita = d.conquistas.includes(c.id);
    const texto = textoConquista(c.id);
    return `<article class="${feita ? 'feita' : ''}"><b>${c.icone}</b><span><strong>${texto.nome}</strong><small>${texto.descricao}</small></span><i>${feita ? '✓' : '·'}</i></article>`;
  }).join('');
  const hoje = new Date().toDateString();
  const partidasHoje = d.historico.filter((r) => new Date(r.data).toDateString() === hoje);
  const pontosHoje = partidasHoje.reduce((s, r) => s + r.pontos, 0);
  elemento('objetivos-diarios').innerHTML = `<small>${t('objetivosHoje')}</small><div><span class="${partidasHoje.length >= 3 ? 'feito' : ''}"><b>${Math.min(3, partidasHoje.length)}/3</b> Partidas</span><span class="${pontosHoje >= 50 ? 'feito' : ''}"><b>${Math.min(50, pontosHoje)}/50</b> ${t('pontos')}</span></div>`;
}

function escolherTema(tema: Tema, guardar = true): void {
  temaEscolhido = tema;
  document.documentElement.dataset.tema = tema;
  document.documentElement.style.setProperty('--tema', String(TEMAS[tema]));
  pintor.definirCores(cobraEscolhida, TEMAS[tema]);
  if (guardar) try { localStorage.setItem(CHAVE_TEMA, tema); } catch { /* preferência desta sessão */ }
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

function escolherPele(pele: Pele): void {
  peleEscolhida = pele;
  pintor.definirPele(pele);
  try { localStorage.setItem(CHAVE_PELE, pele); } catch { /* preferência desta sessão */ }
  actualizarEscolhasMenu();
  vibrar(8);
}

function escolherIdioma(idioma: Idioma): void {
  if (idioma === idiomaEscolhido) return;
  aplicarIdioma(idioma);
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
  missaoTexto.textContent = textoMissao(missao);
  missaoProgresso.textContent = `${valor}/${missao.alvo}`;
  missaoPartida.classList.toggle('cumprida', missaoCumprida);
  if (!missaoCumprida && valor >= missao.alvo) {
    missaoCumprida = true;
    missaoPartida.classList.add('cumprida');
    missaoTexto.textContent = t('missaoCumprida');
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
  elemento('velocidade').textContent = `${(150 / jogo.passoMs()).toFixed(2)}× ${t('ritmo')}`;
  combo.hidden = jogo.combo < 2;
  comboValor.textContent = `×${jogo.combo}`;
  // O tipo tem de estar no literal: só depois do filtro, o TypeScript já perdeu o par.
  const todos: [string, number][] = [
    [t('vidas'), jogo.vidas], [t('escudo'), jogo.escudo], [t('ima'), jogo.ima], [t('lento'), jogo.lento],
    [t('dobro'), jogo.dobro], [t('inversao'), jogo.inversao], [t('veneno'), jogo.sequencia],
  ];
  const poderes = todos.filter(([, valor]) => valor > 0);
  poderesActivos.hidden = poderes.length === 0;
  poderesActivos.innerHTML = poderes.map(([nome, valor]) => `<span><b>${nome}</b><i>${valor}</i></span>`).join('');
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
  botaoPausar.setAttribute('aria-label', pausado ? t('retomar') : t('pausar'));
  estado.textContent = pausado ? t('emPausa') : jogo.estado === 'pronto' ? t('pronto')
    : jogo.estado === 'a-jogar' ? (arranque >= 0 ? t('prepara') : t('fluxo'))
    : jogo.estado === 'completo' ? t('conquistada') : t('maisUma');
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
  tituloFim.textContent = ganhou ? t('arenaCheia') : porTempo ? t('tempoEsgotado') : t('fimJogo');
  fimPontos.textContent = String(jogo.pontos);
  fimRecorde.textContent = String(jogo.recorde);
  if (ganhou) fimMedalha.textContent = t('cheiaDesc');
  else if (jogo.pontos > 0 && jogo.pontos === jogo.recorde) fimMedalha.textContent = t('novoRecorde');
  else fimMedalha.textContent = '';
  if (novasConquistas) fimMedalha.textContent = `${fimMedalha.textContent ? `${fimMedalha.textContent} · ` : ''}${t('conquistaNova', { nome: novasConquistas })}`;
  if (missaoCumprida) fimMedalha.textContent = `${fimMedalha.textContent ? `${fimMedalha.textContent} · ` : ''}${t('missaoCumprida')}`;
  fimMedalha.hidden = fimMedalha.textContent === '';
  cartao.hidden = false;
  botaoReviver.hidden = ganhou || jogo.modo === 'uma-vida' || carreira.dados.moedas < 25;
  animar(cartao, 'aparecer-fim');
}

function terminar(): void {
  gravarRecorde(jogo.modo, jogo.recorde);
  if (!jaRegistada) {
    carreiraAntesDoFim = structuredClone(carreira.dados);
    const novas = carreira.registar(jogo, duracaoPartida, missaoCumprida);
    novasConquistas = novas.map((c) => textoConquista(c.id).nome).join(', ');
    jaRegistada = true;
  }
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
  dica.textContent = semRato ? t('deslizaComecar') : t('teclasComecar');
  pintor.limpar();
  jogo.reiniciar();
  numeroPartida++;
  missao = criarMissao(numeroPartida, jogo.modo);
  missaoCumprida = false;
  duracaoPartida = 0;
  novasConquistas = '';
  jaRegistada = false;
  carreiraAntesDoFim = null;
  comboAnterior = 0;
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
  mostrarTempo();
}

/**
 * Escreve os segundos que faltam, com uma décima — é a décima que faz o
 * contador parecer vivo em vez de um número parado. A moldura da arena drena
 * em paralelo: uma coisa lê-se de relance, a outra dá o valor exacto.
 */
function mostrarTempo(): void {
  const activo = jogo.modo === 'relogio';
  alvoTempo.hidden = !activo;
  if (!activo) {
    caixaEstado.classList.remove('urgente');
    return;
  }
  const segundos = Math.max(0, restante) / 1000;
  const texto = segundos.toFixed(1);
  if (texto !== tempoMostrado) {
    tempoMostrado = texto;
    alvoTempo.textContent = texto;
  }
  caixaEstado.classList.toggle('urgente', segundos <= 3);
}

function aplicar(): void {
  const r = jogo.passo();
  if (r.comeu) {
    pintor.explodir(jogo.corpo[0], r.ganhos, r.marco);
    som.comer(jogo.comidas, r.tipoComida ?? 'normal');
    vibrar(r.marco ? [18, 28, 18] : 12);
    restante = RELOGIO_MS;
    ultimoTique = 0;
    mostrarTempo();
    actualizarHud();
    animar(alvoPontos, 'subiu');
    if (r.marco) {
      som.marco();
      animar(marcadorPontos, 'marco');
    }
    if (jogo.combo > comboAnterior && jogo.combo >= 2) animar(combo, 'novo-combo');
    comboAnterior = jogo.combo;
  }
  if (r.item) {
    som.item(r.item);
    vibrar(r.item === 'veneno' || r.item === 'inversao' ? [30, 18, 30] : [12, 18, 26]);
    actualizarHud();
    animar(poderesActivos, 'celebrar');
  }
  if (r.protegido || r.ressuscitou) {
    vibrar([35, 20, 12]);
    actualizarHud();
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
        texto: passo === ARRANQUE.length - 1 ? t('vai') : ARRANQUE[passo].texto,
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
    mostrarTempo();
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

  const progressoPasso = jogo.estado === 'a-jogar' && arranque < 0 ? Math.min(1, acumulado / jogo.passoMs()) : 1;
  pintor.desenhar(jogo, progressoPasso, dt, agora);
  som.ritmo(pintor.intensidade, aCorrer);
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
  hudModo.textContent = nomeModo(jogo.modo);
}

function sincronizarBotaoSom(): void {
  botaoSom.classList.toggle('mudo', !som.ligado);
  botaoSom.setAttribute('aria-pressed', String(som.ligado));
  botaoSom.setAttribute('aria-label', som.ligado ? t('somDesligar') : t('somLigar'));
  botaoSom.title = som.ligado ? t('somDesligar') : t('somLigar');
}

function abrirSistema(titulo: string, etiqueta: string, conteudo: string): void {
  sistemaTitulo.textContent = titulo;
  sistemaEtiqueta.textContent = etiqueta;
  sistemaConteudo.innerHTML = conteudo;
  folhaSistema.hidden = false;
  vibrar(8);
}

function abrirLoja(): void {
  const produtos = [
    { id: 'rasto-neon', nome: 'Rasto Neon', desc: 'Uma assinatura luminosa em cada curva.', custo: 60, icone: '〰' },
    { id: 'impacto-prisma', nome: 'Impacto Prisma', desc: 'Explosão cromática ao terminar.', custo: 90, icone: '✦' },
    { id: 'aura-coroa', nome: 'Aura de Recorde', desc: 'Brilho exclusivo durante novos recordes.', custo: 120, icone: '♛' },
  ];
  abrirSistema(t('loja'), `${carreira.dados.moedas} ◇`, `<div class="loja-lista">${produtos.map((p) => {
    const comprado = carreira.dados.compras.includes(p.id);
    return `<article><i>${p.icone}</i><span><b>${p.nome}</b><small>${p.desc}</small></span><button data-comprar="${p.id}" data-custo="${p.custo}" ${comprado ? 'disabled' : ''}>${comprado ? t('adquirido') : `${p.custo} ◇`}</button></article>`;
  }).join('')}</div><div class="loja-lista"><article><i>≈</i><span><b>Rasto da cobra</b><small>Ativa ou desativa partículas para máxima nitidez.</small></span><button data-rasto>${definicoes.rasto ? 'ON' : 'OFF'}</button></article></div>`);
}

function abrirRanking(): void {
  const ranking = carreira.ranking();
  const modos = Object.entries(carreira.dados.modos).sort((a, b) => b[1]! - a[1]!);
  abrirSistema(t('ranking'), t('historico'), `<div class="ranking-lista">${ranking.length ? ranking.map((r, i) => `<article><b>${i + 1}</b><span><strong>${r.pontos} ${t('pontos').toLocaleLowerCase()}</strong><small>${nomeModo(r.modo)} · ${r.comprimento} ${t('segmentos').toLocaleLowerCase()}</small></span><time>${new Date(r.data).toLocaleDateString(idiomaEscolhido)}</time></article>`).join('') : '<p class="vazio">Joga uma partida para inaugurar o ranking.</p>'}</div><h3>MODOS</h3><div class="chips-modos">${modos.map(([modo, n]) => `<span>${nomeModo(modo as Modo)} <b>${n}</b></span>`).join('')}</div>`);
}

function abrirDefinicoes(): void {
  const alternador = (chave: keyof Definicoes, rotulo: string) => `<label class="definicao"><span>${rotulo}</span><input type="checkbox" data-definicao="${chave}" ${definicoes[chave] ? 'checked' : ''}><i></i></label>`;
  abrirSistema(t('definicoes'), 'ACESSIBILIDADE', `<label class="sensibilidade"><span>${t('sensibilidade')} <b>${definicoes.sensibilidade}</b></span><input type="range" min="6" max="22" step="1" value="${definicoes.sensibilidade}" data-sensibilidade></label>${alternador('esquerdino', t('canhoto'))}${alternador('reduzirMovimento', t('movimentoReduzido'))}${alternador('daltonico', t('daltonico'))}${alternador('temaAutomatico', t('temaAutomatico'))}`);
}

function mostrarTutorial(): void {
  try { if (localStorage.getItem(CHAVE_TUTORIAL)) return; } catch { /* mostrar */ }
  const passos = [
    ['Desliza para virar', 'Um gesto curto guarda a próxima direção. Podes antecipar até três curvas.'],
    ['Lê a arena', 'A seta aponta para a comida. Itens dão poderes, mas veneno e inversão são armadilhas.'],
    ['Constrói o combo', 'Chega depressa à luz para subir o multiplicador até ×5. Boa sorte.'],
  ];
  let indice = 0;
  const desenhar = () => {
    elemento('tutorial-passo').textContent = `0${indice + 1} / 03`;
    elemento('tutorial-titulo').textContent = passos[indice][0];
    elemento('tutorial-texto').textContent = passos[indice][1];
    elemento('tutorial-seguinte').textContent = indice === 2 ? t('entrar') : 'SEGUINTE';
  };
  const fechar = () => { tutorial.hidden = true; try { localStorage.setItem(CHAVE_TUTORIAL, 'ok'); } catch { /* sessão */ } };
  elemento('tutorial-seguinte').onclick = () => { if (indice === 2) fechar(); else { indice++; desenhar(); } };
  elemento('tutorial-saltar').onclick = fechar;
  desenhar();
  tutorial.hidden = false;
}

async function partilharCartao(texto: string): Promise<boolean> {
  if (!navigator.share || !navigator.canShare) return false;
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1080;
  const ctx = c.getContext('2d'); if (!ctx) return false;
  const gradiente = ctx.createRadialGradient(820, 160, 10, 540, 540, 920);
  gradiente.addColorStop(0, `hsl(${cobraEscolhida} 48% 20%)`); gradiente.addColorStop(1, `hsl(${cobraEscolhida} 30% 4%)`);
  ctx.fillStyle = gradiente; ctx.fillRect(0, 0, 1080, 1080);
  ctx.strokeStyle = `hsl(${cobraEscolhida} 80% 68%)`; ctx.lineWidth = 4; ctx.strokeRect(70, 70, 940, 940);
  ctx.fillStyle = `hsl(${cobraEscolhida} 80% 72%)`; ctx.font = '700 38px sans-serif'; ctx.fillText('SERPENTE', 110, 160);
  ctx.fillStyle = '#f4f6ef'; ctx.font = '700 280px sans-serif'; ctx.fillText(String(jogo.pontos), 100, 530);
  ctx.fillStyle = `hsl(${cobraEscolhida} 30% 72%)`; ctx.font = '500 34px sans-serif'; ctx.fillText(t('pontos'), 115, 590);
  ctx.font = '600 48px sans-serif'; ctx.fillText(nomeModo(jogo.modo), 115, 730);
  ctx.font = '400 32px sans-serif'; ctx.fillText(`${jogo.corpo.length} ${t('segmentos')}  ·  COMBO ×${jogo.melhorCombo}`, 115, 800);
  const blob = await new Promise<Blob | null>((resolver) => c.toBlob(resolver, 'image/png'));
  if (!blob) return false;
  const ficheiro = new File([blob], 'serpente-resultado.png', { type: 'image/png' });
  if (!navigator.canShare({ files: [ficheiro] })) return false;
  await navigator.share({ title: 'Serpente', text: texto, files: [ficheiro] });
  return true;
}

ligarControlos(arena, { virar, confirmar, interacao: () => som.garantir(), limiar: () => definicoes.sensibilidade });
document.querySelectorAll<HTMLButtonElement>('[data-tema]').forEach((botao) => {
  botao.addEventListener('click', () => escolherTema(botao.dataset.tema as Tema));
});
document.querySelectorAll<HTMLButtonElement>('[data-cobra]').forEach((botao) => {
  botao.addEventListener('click', () => escolherCobra(Number(botao.dataset.cobra)));
});
document.querySelectorAll<HTMLButtonElement>('[data-pele]').forEach((botao) => {
  botao.addEventListener('click', () => escolherPele(botao.dataset.pele as Pele));
});
document.querySelectorAll<HTMLButtonElement>('[data-idioma]').forEach((botao) => {
  botao.addEventListener('click', () => escolherIdioma(botao.dataset.idioma as Idioma));
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

const fecharSistema = (): void => { folhaSistema.hidden = true; };
elemento('fechar-sistema').addEventListener('click', fecharSistema);
elemento('fechar-sistema-x').addEventListener('click', fecharSistema);
elemento('abrir-loja').addEventListener('click', abrirLoja);
elemento('abrir-ranking').addEventListener('click', abrirRanking);
elemento('abrir-definicoes').addEventListener('click', abrirDefinicoes);
sistemaConteudo.addEventListener('click', (e) => {
  const alvo = (e.target as Element).closest<HTMLElement>('[data-comprar], [data-rasto]');
  if (!alvo) return;
  if (alvo.dataset.comprar) {
    if (carreira.comprar(alvo.dataset.comprar, Number(alvo.dataset.custo))) { vibrar([10, 18, 24]); aplicarDefinicoes(); actualizarCarreira(); abrirLoja(); }
    else { alvo.textContent = t('saldoInsuficiente'); animar(alvo, 'abanar'); }
  } else {
    definicoes.rasto = !definicoes.rasto; guardarDefinicoes(); aplicarDefinicoes(); abrirLoja();
  }
});
sistemaConteudo.addEventListener('input', (e) => {
  const alvo = e.target as HTMLInputElement;
  if (alvo.matches('[data-sensibilidade]')) {
    definicoes.sensibilidade = Number(alvo.value);
    alvo.closest('label')?.querySelector('b')?.replaceChildren(alvo.value);
  } else if (alvo.dataset.definicao) {
    (definicoes as unknown as Record<string, boolean>)[alvo.dataset.definicao] = alvo.checked;
  }
  guardarDefinicoes(); aplicarDefinicoes();
});

botaoReviver.addEventListener('click', () => {
  if (!carreiraAntesDoFim) return;
  carreira.restaurar(carreiraAntesDoFim);
  if (!carreira.gastar(25) || !jogo.reviver()) return;
  carreiraAntesDoFim = null;
  jaRegistada = false;
  cartao.hidden = true;
  podeReiniciar = false;
  acumulado = 0;
  ultimo = performance.now();
  actualizarCarreira(); actualizarHud(); sincronizarEstado();
  vibrar([20, 30, 45]);
});

botaoPartilhar.addEventListener('click', async () => {
  const modo = nomeModo(jogo.modo).toLocaleLowerCase(idiomaEscolhido);
  const texto = t('partilhaTexto', { pontos: jogo.pontos, segmentos: jogo.corpo.length, modo });
  try {
    if (await partilharCartao(texto)) return;
    const resultado = await partilharResultado(texto);
    if (resultado === 'copiado') botaoPartilhar.querySelector('span')!.textContent = t('copiado');
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
  document.documentElement.style.setProperty('--tema', String(TEMAS[temaEscolhido]));
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

aplicarIdioma(idiomaEscolhido);
reporRelogio();
sincronizarMatiz();
medirArena();
mostrarTutorial();
requestAnimationFrame(quadro);
