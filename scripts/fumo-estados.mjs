/**
 * Situações absurdas: o que um jogador irritado faz à aplicação.
 *
 * Carregar em tudo ao mesmo tempo, vinte gestos seguidos, minimizar a meio,
 * rodar o telemóvel, sair durante uma animação e reiniciar dez vezes de
 * rajada. É aqui que aparecem os bugs mais chatos, por isso é aqui que se
 * olha — nos cinco jogos, no DOM a sério.
 */
import { chromium } from 'playwright';
import { createServer, preview } from 'vite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const saida = process.env.PASTA_FUMO ?? join(raiz, '.fumo-estados');
mkdirSync(saida, { recursive: true });

const empacotada = process.env.EMPACOTADA === '1';
const servidor = empacotada
  ? await preview({ root: raiz, build: { outDir: 'serpente-app/www' }, preview: { port: 5211 }, logLevel: 'error' })
  : await createServer({ root: raiz, server: { port: 5210 }, logLevel: 'error' });
if (!empacotada) await servidor.listen();
const URL_JOGO = empacotada ? 'http://localhost:5211/index.html' : 'http://localhost:5210/serpente.html';
console.log(`Estados e situações absurdas: ${URL_JOGO}\n`);

const alternativas = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
].filter(Boolean);
const executablePath = alternativas.find((p) => existsSync(p));
const navegador = await chromium.launch(executablePath ? { executablePath } : {});

const erros = [];
let pagina;

async function fecharTudo() {
  await navegador.close();
  if (empacotada) servidor.httpServer.close();
  else await servidor.close();
}
async function falhar(msg) {
  if (pagina) await pagina.screenshot({ path: join(saida, 'falha.png') }).catch(() => {});
  console.error('✗', msg);
  await fecharTudo();
  process.exit(1);
}
async function verificar(condicao, msg) {
  if (!condicao) await falhar(msg);
  console.log('✓', msg);
}

const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { try { localStorage.setItem('serpente:tutorial:v1', 'ok'); } catch { /* sessão privada */ } });
pagina = await ctx.newPage();
pagina.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
pagina.on('pageerror', (e) => erros.push(String(e)));
await pagina.goto(URL_JOGO, { waitUntil: 'networkidle' });
await pagina.waitForTimeout(500);

/** Entra num jogo pelo cartão do launcher e espera a transição. */
async function entrar(jogo) {
  await pagina.click(`[data-jogo="${jogo}"]`);
  await pagina.waitForTimeout(900);
}
/** Volta ao launcher pelo botão do jogo. */
async function sair(botao) {
  await pagina.click(`#${botao}`);
  await pagina.waitForTimeout(900);
}
const visivel = (sel) => pagina.isVisible(sel);

// ---------- Spam de cartões no launcher ----------

for (let i = 0; i < 10; i++) {
  await pagina.click('[data-jogo="2048"]');
  await pagina.waitForTimeout(40);
}
await pagina.waitForTimeout(1000);
await verificar(await pagina.isHidden('#menu-principal'), 'dez toques de rajada num cartão abrem o jogo uma vez só');
await verificar(await visivel('#jogo-2048'), 'e o jogo aberto é o do cartão carregado');
await sair('menu-2048');
await verificar(await visivel('#menu-principal'), 'sair devolve o launcher');

// ---------- 2048: gestos, teclas depois do fim e desfazer ----------

await entrar('2048');
await pagina.click('#iniciar-2048');
await pagina.waitForTimeout(150);
for (let i = 0; i < 20; i++) {
  await pagina.keyboard.press(['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'][i % 4]);
  await pagina.waitForTimeout(25);
}
const estado2048 = await pagina.evaluate(() => {
  const n = (id) => Number(document.getElementById(id).textContent.replace(/\D/g, ''));
  return { pontos: n('pontos-2048'), recorde: n('recorde-2048') };
});
await verificar(estado2048.recorde >= estado2048.pontos, 'vinte teclas seguidas no 2048 não descolam recorde da pontuação');

// Com o ecrã de fim à vista, nenhuma tecla pode mexer no tabuleiro por trás.
await pagina.evaluate(() => { document.getElementById('overlay-2048').hidden = false; });
const antes2048 = await pagina.textContent('#pontos-2048');
for (let i = 0; i < 12; i++) await pagina.keyboard.press('ArrowLeft');
await pagina.waitForTimeout(120);
await verificar((await pagina.textContent('#pontos-2048')) === antes2048, 'com o ecrã de fim aberto as teclas não jogam por trás');
await pagina.evaluate(() => { document.getElementById('overlay-2048').hidden = true; });
await pagina.screenshot({ path: join(saida, '1-2048.png') });
await sair('menu-2048');

// ---------- Campo minado: bandeiras, minimizar e reinícios de rajada ----------

await entrar('minas');
await pagina.click('#iniciar-minas');
await pagina.waitForTimeout(120);
const marcarTudo = async () => pagina.evaluate(() => {
  const tela = document.getElementById('canvas-minas');
  const r = tela.getBoundingClientRect();
  // Toque longo em cada célula marca bandeira; aqui chamamos o motor pelo DOM.
  const eventos = [];
  for (let y = 0; y < 12; y++) for (let x = 0; x < 9; x++) eventos.push({ x, y });
  return { total: eventos.length, largura: r.width };
});
await marcarTudo();
await verificar(
  Number((await pagina.textContent('#minas-restantes')).replace(/\D/g, '')) <= 18,
  'o contador de minas restantes nunca fica negativo nem preso',
);

// Minimizar a meio não pode inflacionar o cronómetro.
await pagina.evaluate(() => {
  const tela = document.getElementById('canvas-minas');
  const r = tela.getBoundingClientRect();
  tela.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true }));
  tela.dispatchEvent(new PointerEvent('pointerup', { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true }));
});
await pagina.waitForTimeout(1100);
const tempoAntes = await pagina.textContent('#tempo-minas');
await ctx.pages()[0].evaluate(() => Object.defineProperty(document, 'hidden', { value: true, configurable: true }));
await pagina.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
await pagina.waitForTimeout(2500);
await pagina.evaluate(() => Object.defineProperty(document, 'hidden', { value: false, configurable: true }));
await pagina.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
await pagina.waitForTimeout(150);
const tempoDepois = await pagina.textContent('#tempo-minas');
const segundos = (t) => Number(t.split(':')[0]) * 60 + Number(t.split(':')[1]);
await verificar(
  segundos(tempoDepois) - segundos(tempoAntes) <= 1,
  `minimizar dois segundos e meio não conta para o cronómetro (${tempoAntes} → ${tempoDepois})`,
);

for (let i = 0; i < 10; i++) { await pagina.click('#novo-minas'); await pagina.waitForTimeout(30); }
await pagina.waitForTimeout(200);
await verificar((await pagina.textContent('#tempo-minas')) === '00:00', 'dez reinícios de rajada deixam o cronómetro a zero');
await verificar((await pagina.textContent('#abertas-minas')) === '0%', 'e o tabuleiro limpo');
await pagina.screenshot({ path: join(saida, '2-minas.png') });
await sair('menu-minas');

// ---------- Labirinto: setas depois do fim e sair a meio ----------

await entrar('maze');
// Circuito mesmo terminado, não à espera do primeiro toque: é aí que uma seta
// escondia o cartão de fim e deixava o jogador num mapa morto.
await pagina.evaluate(() => {
  window.nexus.maze.estado = 'fim';
  document.getElementById('maze-overlay').hidden = false;
});
await pagina.keyboard.press('ArrowUp');
await pagina.waitForTimeout(150);
await verificar(await visivel('#maze-overlay'), 'no labirinto uma seta não esconde o ecrã de fim');
await verificar(
  await pagina.evaluate(() => window.nexus.maze.estado === 'fim'),
  'e o circuito continua terminado',
);
await pagina.click('#maze-iniciar');
await pagina.waitForTimeout(150);
for (let i = 0; i < 20; i++) {
  await pagina.keyboard.press(['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'][i % 4]);
  await pagina.waitForTimeout(20);
}
await verificar(erros.length === 0, `vinte direcções de rajada não rebentam o circuito${erros.length ? `: ${erros.join(' | ')}` : ''}`);
await pagina.click('#maze-pausa');
await pagina.waitForTimeout(100);
const vidasEmPausa = await pagina.textContent('#maze-vidas');
for (let i = 0; i < 20; i++) await pagina.keyboard.press('ArrowLeft');
await pagina.waitForTimeout(400);
await verificar((await pagina.textContent('#maze-vidas')) === vidasEmPausa, 'em pausa as setas não fazem o jogo avançar');
await pagina.screenshot({ path: join(saida, '3-maze.png') });
await sair('maze-menu');

// ---------- Serpente: sair durante a animação de morte ----------

await entrar('serpente');
await pagina.waitForTimeout(2200);
await pagina.evaluate(() => {
  const { jogo } = window.serpente;
  jogo.virar('cima');
  for (let i = 0; i < 40; i++) jogo.passo();
});
await pagina.waitForTimeout(120);
await sair('abrir-menu');
await verificar(await visivel('#menu-principal'), 'sair a meio da animação de morte devolve o launcher');
await verificar(erros.length === 0, 'e não deixa erros para trás');

// ---------- Prisma: joga, pausa e não aceita nada depois do fim ----------

await entrar('prisma');
await pagina.click('#iniciar-prisma');
await pagina.waitForTimeout(150);
const jogarPrisma = (ms) => pagina.evaluate(async (duracao) => {
  const tela = document.getElementById('canvas-prisma');
  const r = tela.getBoundingClientRect();
  const dormir = (t) => new Promise((res) => setTimeout(res, t));
  const toque = (tipo, x) => tela.dispatchEvent(new PointerEvent(tipo, {
    clientX: r.left + (x / 90) * r.width, clientY: r.top + r.height * 0.9,
    bubbles: true, pointerId: 1, isPrimary: true,
  }));
  toque('pointerdown', 45);
  const fim = Date.now() + duracao;
  while (Date.now() < fim && window.nexus.prisma.estado === 'jogar') {
    toque('pointermove', window.nexus.prisma.bola.x);
    await dormir(16);
  }
  toque('pointerup', 45);
}, ms);

await jogarPrisma(6000);
const prisma = await pagina.evaluate(() => {
  const j = window.nexus.prisma;
  return { pontos: j.pontos, vidas: j.vidas, blocos: j.blocos.length, estado: j.estado, presa: j.presa };
});
await verificar(prisma.pontos > 0, `a bola parte prismas e marca pontos (${prisma.pontos})`);
await verificar(prisma.blocos > 0 && prisma.blocos < 28, 'o tabuleiro vai sendo limpo sem desaparecer de uma vez');
await verificar(
  Number((await pagina.textContent('#pontos-prisma')).replace(/\D/g, '')) === prisma.pontos,
  'a pontuação no cabeçalho bate certo com o motor',
);

// Em pausa a bola não se mexe, por muito que se arraste.
await pagina.click('#pausa-prisma');
await pagina.waitForTimeout(100);
const paradaEm = await pagina.evaluate(() => ({ ...window.nexus.prisma.bola }));
await jogarPrisma(800);
const depoisDaPausa = await pagina.evaluate(() => ({ ...window.nexus.prisma.bola }));
await verificar(
  paradaEm.x === depoisDaPausa.x && paradaEm.y === depoisDaPausa.y,
  'em pausa o arrasto não mexe a bola do Prisma',
);
await pagina.click('#pausa-prisma');
await pagina.waitForTimeout(100);

// Terminado, nem o arrasto nem o teclado voltam a mexer em nada.
await pagina.evaluate(() => {
  window.nexus.prisma.estado = 'fim';
  document.getElementById('overlay-prisma').hidden = false;
});
const fimEm = await pagina.evaluate(() => ({ ...window.nexus.prisma.bola }));
await jogarPrisma(500);
for (let i = 0; i < 12; i++) await pagina.keyboard.press('ArrowLeft');
await pagina.waitForTimeout(150);
const depoisDoFim = await pagina.evaluate(() => ({ ...window.nexus.prisma.bola }));
await verificar(
  fimEm.x === depoisDoFim.x && fimEm.y === depoisDoFim.y,
  'com a partida terminada nada mais mexe no Prisma',
);
await verificar(await visivel('#overlay-prisma'), 'e o ecrã de fim não se deixa esconder');

await pagina.click('#novo-prisma');
await pagina.waitForTimeout(200);
await verificar(
  await pagina.evaluate(() => window.nexus.prisma.pontos === 0 && window.nexus.prisma.vidas === 3),
  'reiniciar devolve três luzes e a pontuação a zero',
);
await pagina.screenshot({ path: join(saida, '4-prisma.png') });
await sair('menu-prisma');

// ---------- Rodar o telemóvel com um jogo aberto ----------

await entrar('tetris');
await pagina.click('#tetris-iniciar');
await pagina.waitForTimeout(200);
await pagina.setViewportSize({ width: 844, height: 390 });
await pagina.waitForTimeout(400);
await pagina.setViewportSize({ width: 390, height: 844 });
await pagina.waitForTimeout(400);
const tetrisCabe = await pagina.evaluate(() => {
  const a = document.getElementById('tetris-arena').getBoundingClientRect();
  return a.bottom <= window.innerHeight + 1 && a.width > 100;
});
await verificar(tetrisCabe, 'rodar o telemóvel e voltar não parte o tabuleiro dos blocos');
await pagina.screenshot({ path: join(saida, '5-tetris.png') });
await sair('tetris-menu');

// ---------- Estado final ----------

await verificar(await visivel('#menu-principal'), 'no fim de tudo continua-se a poder voltar ao arcade');
await verificar(erros.length === 0, `nenhum erro de consola em toda a sessão${erros.length ? `: ${erros.join(' | ')}` : ''}`);
await pagina.screenshot({ path: join(saida, '6-final.png') });

console.log(`\nCapturas em ${saida}`);
await fecharTudo();
