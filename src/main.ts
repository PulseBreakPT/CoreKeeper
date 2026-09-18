/** Arranque: liga canvas, entrada, HUD e ciclo de jogo. */

import './style.css';
import './tipografia.css';
import './ui-arte.css';
import { audio } from './core/audio';
import { Input } from './core/input';
import { perf } from './core/perf';
import { seedFromText, randomSeed } from './core/rng';
import { clearSave, hasSave, loadSettings, saveSettings } from './core/storage';
import { Game, type GanchosUI } from './game/game';
import { Renderer } from './render/renderer';
import { sprite } from './render/sprites';
import { spriteItem, temPintorItem } from './render/itens';
import { desenharInimigo, desenharJogador } from './render/criaturas';
import { Inimigo, INIMIGOS } from './entities/enemies';
import { BLOCKS, GROUNDS } from './world/tiles';
import { ITEMS } from './game/items';
import { Hud } from './ui/hud';
import { EcraMorte, Menus } from './ui/menu';
import { PainelInventario } from './ui/paineis';

const app = document.getElementById('app');
if (!app) throw new Error('Elemento #app em falta.');

const canvas = document.createElement('canvas');
canvas.id = 'jogo';
app.appendChild(canvas);

const renderer = new Renderer(canvas);
const input = new Input();
input.attachTouch(app);
input.attachKeyboard(window);

let jogo: Game | null = null;

const painel = new PainelInventario(() => {
  if (jogo) {
    jogo.pausado = false;
    jogo.estacaoAberta = null;
  }
  input.releaseAll();
  input.enabled = true;
});

const menus = new Menus({
  novoJogo: (seedTexto) => comecar(seedTexto ? seedFromText(seedTexto) : randomSeed()),
  continuar: () => continuar(),
  retomar: () => {
    menus.fechar();
    if (jogo) jogo.pausado = false;
    input.enabled = true;
  },
  guardar: () => {
    const ok = jogo?.guardar() ?? false;
    hud.mensagem(ok ? 'Jogo guardado.' : 'Não foi possível guardar neste navegador.', ok ? 'bom' : 'aviso');
  },
  abandonar: () => {
    jogo?.guardar();
    jogo = null;
    menus.mostrarInicial(hasSave());
  },
  qualidade: (novo) => {
    if (novo) {
      renderer.modoQualidade = novo;
      saveSettings({ qualidade: novo });
    }
    return renderer.modoQualidade;
  },
  desempenho: () => ({ fps: perf.fps, ms: perf.msLogica + perf.msDesenho }),
});

const ecraMorte = new EcraMorte();

const hud = new Hud(
  input,
  () => abrirPainel(null),
  () => {
    if (!jogo) return;
    jogo.pausado = true;
    input.enabled = false;
    input.releaseAll();
    menus.mostrarPausa();
  },
);

hud.aoEscolherSlot = (i) => {
  if (jogo) jogo.inventario.selecionado = i;
};

// Aviso para rodar: o jogo foi desenhado para ecrã deitado.
const rodar = document.createElement('div');
rodar.className = 'rodar';
rodar.innerHTML = `
  <div class="rodar-icone"></div>
  <h2>Roda o telemóvel</h2>
  <p>The Hollow Star joga-se com o ecrã deitado — é assim que vês a caverna à tua frente
  e alcanças os controlos com os dois polegares.</p>`;

app.append(hud.raiz, painel.raiz, menus.raiz, ecraMorte.raiz, rodar);

const ganchos: GanchosUI = {
  mensagem: (texto, tipo) => hud.mensagem(texto, tipo),
  abrirEstacao: (estacao) => abrirPainel(estacao),
  aoMorrer: () => ecraMorte.mostrar(),
  aoMudarBioma: (info) => hud.anunciarBioma(info, jogo?.biomaAtual ?? 0),
};

function abrirPainel(estacao: Parameters<GanchosUI['abrirEstacao']>[0]): void {
  if (!jogo || jogo.player.morto) return;
  audio.garantir();
  audio.retomar();
  jogo.pausado = true;
  input.enabled = false;
  input.releaseAll();
  painel.abrir(jogo, estacao);
}

function comecar(seed: number): void {
  clearSave();
  jogo = new Game(renderer, input, ganchos, seed);
  menus.fechar();
  input.enabled = true;
  hud.mensagem('Portador identificado.', 'lore');
  setTimeout(() => hud.mensagem('Arranca Ironroot das paredes e constrói uma Bancada.', 'info'), 2600);
}

function continuar(): void {
  const carregado = Game.carregar(renderer, input, ganchos);
  if (!carregado) {
    hud.mensagem('Registo corrompido. A gerar um Portador novo.', 'aviso');
    comecar(randomSeed());
    return;
  }
  jogo = carregado;
  menus.fechar();
  input.enabled = true;
  hud.mensagem('Ligação restabelecida, Bearer 73.', 'lore');
}

// --- Ciclo ------------------------------------------------------------------

let anterior = performance.now();

function quadro(agora: number): void {
  const dtMs = agora - anterior;
  const dt = Math.min(0.05, dtMs / 1000);
  anterior = agora;
  perf.quadro(dtMs);

  if (jogo) {
    if (input.consume('inventory')) {
      if (painel.aberto) painel.fechar();
      else abrirPainel(null);
    }
    perf.comecarLogica();
    jogo.passo(dt);
    perf.fimLogica();

    perf.comecarDesenho();
    jogo.desenhar(dtMs);
    perf.fimDesenho();

    hud.atualizar(jogo);
    if (painel.aberto) painel.atualizar();
    if (!jogo.player.morto) ecraMorte.esconder();
  }

  requestAnimationFrame(quadro);
}

function ajustar(): void {
  renderer.redimensionar();
}

window.addEventListener('resize', ajustar);
window.addEventListener('orientationchange', () => setTimeout(ajustar, 120));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && jogo) {
    jogo.guardar();
    jogo.pausado = true;
    input.releaseAll();
  } else if (!document.hidden && jogo && !painel.aberto && !menus.aberto) {
    jogo.pausado = false;
  }
});
window.addEventListener('pagehide', () => jogo?.guardar());
app.addEventListener('contextmenu', (e) => e.preventDefault());
app.addEventListener('pointerdown', () => {
  audio.garantir();
  audio.retomar();
});

// Ponte de diagnóstico: usada pelo teste de fumo e útil para espreitar na consola.
(window as unknown as { nucleoPerdido?: unknown }).nucleoPerdido = {
  jogo: () => jogo,
  comecar,
  hud,
  arte: {
    sprite, spriteItem, temPintorItem, BLOCKS, GROUNDS, ITEMS,
    desenharJogador, desenharInimigo, Inimigo, INIMIGOS,
  },
  perf,
};

// Preferências guardadas (qualidade gráfica escolhida à mão).
const prefs = loadSettings<{ qualidade?: 'auto' | 'alta' | 'media' | 'baixa' }>();
if (prefs?.qualidade) renderer.modoQualidade = prefs.qualidade;

ajustar();
menus.mostrarInicial(hasSave());
requestAnimationFrame(quadro);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
    navigator.serviceWorker.register(`${base}sw.js`).catch(() => undefined);
  });
}
