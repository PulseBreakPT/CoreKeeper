/**
 * Teste de fumo da Serpente: abre o jogo num Chromium, joga a sério com teclado
 * e com swipe, e verifica pontuação, colisões, reinício, recorde e responsividade.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const saida = process.env.PASTA_FUMO ?? join(raiz, '.fumo-serpente');
mkdirSync(saida, { recursive: true });

const servidor = await createServer({ root: raiz, server: { port: 5200 }, logLevel: 'error' });
await servidor.listen();
const URL_JOGO = 'http://localhost:5200/serpente.html';

const alternativas = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
].filter(Boolean);
const executablePath = alternativas.find((p) => existsSync(p));
const navegador = await chromium.launch(executablePath ? { executablePath } : {});

const erros = [];
let pagina;

function vigiar(p) {
  p.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });
  p.on('pageerror', (e) => erros.push(String(e)));
}

async function falhar(msg) {
  if (pagina) await pagina.screenshot({ path: join(saida, 'falha.png') }).catch(() => {});
  console.error('✗', msg);
  await navegador.close();
  await servidor.close();
  process.exit(1);
}

async function verificar(condicao, msg) {
  if (!condicao) await falhar(msg);
  console.log('✓', msg);
}

const estado = () =>
  pagina.evaluate(() => {
    const j = window.serpente.jogo;
    return {
      estado: j.estado,
      pontos: j.pontos,
      recorde: j.recorde,
      comprimento: j.corpo.length,
      direcao: j.direcao,
      corpo: j.corpo.map((p) => `${p.x},${p.y}`),
      comida: `${j.comida.x},${j.comida.y}`,
      passoMs: j.passoMs(),
    };
  });

// ---------- Desktop ----------

const ctxDesktop = await navegador.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
pagina = await ctxDesktop.newPage();
vigiar(pagina);
await pagina.goto(URL_JOGO, { waitUntil: 'networkidle' });
await pagina.waitForTimeout(400);
await pagina.screenshot({ path: join(saida, '1-inicio.png') });

let e = await estado();
await verificar(e.estado === 'pronto' && e.pontos === 0, 'arranca parado à espera do jogador');
await verificar(!e.corpo.includes(e.comida), 'a comida não nasce dentro da serpente');
await verificar(await pagina.isVisible('#dica'), 'mostra a dica de arranque');

// A cobra tem de continuar quieta mesmo depois de tempo a passar.
await pagina.waitForTimeout(600);
const paradoDepois = await estado();
await verificar(paradoDepois.corpo.join('|') === e.corpo.join('|'), 'não anda antes da primeira ordem');

await pagina.keyboard.press('ArrowUp');
await pagina.waitForTimeout(220);
e = await estado();
await verificar(e.estado === 'a-jogar' && e.direcao === 'cima', 'a seta arranca o jogo e vira para cima');
await verificar(await pagina.isHidden('#dica'), 'a dica desaparece ao arrancar');

// Inversão impossível: para cima, carregar para baixo não pode virar.
await pagina.keyboard.press('ArrowDown');
await pagina.waitForTimeout(200);
await verificar((await estado()).direcao === 'cima', 'não inverte a direcção sobre o próprio corpo');

// Joga a sério: varre a arena em ziguezague e come 12 vezes.
const partida = await pagina.evaluate(async () => {
  const { jogo } = window.serpente;
  const V = { cima: [0, -1], baixo: [0, 1], esquerda: [-1, 0], direita: [1, 0] };
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  const limite = Date.now() + 20000;
  let descer = false;
  while (jogo.pontos < 12 && jogo.estado === 'a-jogar' && Date.now() < limite) {
    const [vx, vy] = V[jogo.direcao];
    const f = { x: jogo.corpo[0].x + vx, y: jogo.corpo[0].y + vy };
    const dentro = f.x >= 1 && f.y >= 1 && f.x < jogo.lado - 1 && f.y < jogo.lado - 1;
    if (dentro) {
      jogo.comida = f;
    } else if (jogo.direcao === 'cima' || jogo.direcao === 'baixo') {
      descer = jogo.direcao === 'cima';
      jogo.virar('direita');
    } else {
      jogo.virar(descer ? 'baixo' : 'cima');
    }
    await dormir(20);
  }
  return { pontos: jogo.pontos, estado: jogo.estado };
}, null);

e = await estado();
await verificar(partida.pontos >= 12, `comeu 12 vezes (ficou em ${partida.pontos})`);
await verificar(e.comprimento === 3 + e.pontos, 'cada comida faz crescer exactamente um segmento');
await verificar(new Set(e.corpo).size === e.corpo.length, 'não há segmentos sobrepostos');
await verificar(!e.corpo.includes(e.comida), 'a comida continua a nascer fora da serpente');
await verificar(e.passoMs < 150 && e.passoMs > 70, `a velocidade subiu de forma controlada (${Math.round(e.passoMs)} ms/passo)`);
await verificar((await pagina.textContent('#pontos')) === String(e.pontos), 'o HUD mostra a pontuação certa');
await verificar((await pagina.textContent('#recorde')) === String(e.recorde), 'o HUD mostra o recorde');
await pagina.screenshot({ path: join(saida, '2-a-jogar.png') });

// Morte contra a parede: o movimento tem de parar no instante.
await pagina.evaluate(async () => {
  const { jogo } = window.serpente;
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  const limite = Date.now() + 15000;
  while (jogo.estado === 'a-jogar' && Date.now() < limite) {
    jogo.comida = { x: 0, y: 0 };
    if (jogo.direcao !== 'direita') jogo.virar('direita');
    await dormir(20);
  }
});
const morto = await estado();
await verificar(morto.estado === 'morto', 'bater na parede termina a partida');
await pagina.waitForTimeout(700);
const depoisDeMorrer = await estado();
await verificar(depoisDeMorrer.corpo.join('|') === morto.corpo.join('|'), 'o movimento pára no instante da morte');

await verificar(await pagina.isVisible('#fim'), 'aparece o cartão de fim de jogo');
// A serpente desfaz-se em partículas; nenhum quadro dessa animação pode rebentar.
await verificar(erros.length === 0, `a animação de morte corre sem erros${erros.length ? `: ${erros.join(' | ')}` : ''}`);
await verificar((await pagina.textContent('#fim-pontos')) === String(morto.pontos), 'o cartão mostra a pontuação final');
await verificar((await pagina.textContent('#fim-recorde')) === String(morto.recorde), 'o cartão mostra o recorde');
await pagina.screenshot({ path: join(saida, '3-fim.png') });

// Reinício pelo botão.
await pagina.click('#jogar');
await pagina.waitForTimeout(200);
let novo = await estado();
await verificar(
  novo.estado === 'pronto' && novo.pontos === 0 && novo.comprimento === 3,
  'o botão "Jogar novamente" limpa o estado anterior',
);
await verificar(novo.recorde === morto.recorde, 'o recorde sobrevive ao reinício');
await verificar(await pagina.isHidden('#fim'), 'o cartão de fim desaparece');

// Reinício por Enter e por Espaço, ao fim de mais partidas seguidas.
for (const tecla of ['Enter', 'Space']) {
  await pagina.evaluate(async () => {
    const { jogo } = window.serpente;
    const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
    jogo.virar('cima');
    const limite = Date.now() + 10000;
    while (jogo.estado === 'a-jogar' && Date.now() < limite) await dormir(30);
  });
  await pagina.waitForTimeout(700);
  await pagina.keyboard.press(tecla);
  await pagina.waitForTimeout(200);
  novo = await estado();
  await verificar(novo.estado === 'pronto' && novo.pontos === 0, `${tecla} reinicia a partida`);
}

// Recorde gravado entre sessões.
const recordeGuardado = await pagina.evaluate(() => localStorage.getItem('serpente:recorde:v1'));
await verificar(Number(recordeGuardado) === morto.recorde, 'o recorde fica gravado no armazenamento');
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.waitForTimeout(300);
await verificar((await pagina.textContent('#recorde')) === String(morto.recorde), 'o recorde reaparece depois de recarregar');

// Botão de som.
await verificar((await pagina.getAttribute('#som', 'aria-pressed')) === 'true', 'o som começa ligado');
await pagina.click('#som');
await verificar((await pagina.getAttribute('#som', 'aria-pressed')) === 'false', 'o botão desliga o som');
await verificar(
  (await pagina.evaluate(() => localStorage.getItem('serpente:som:v1'))) === 'off',
  'a escolha de som fica gravada',
);
await pagina.click('#som');
await verificar((await pagina.getAttribute('#som', 'aria-pressed')) === 'true', 'o botão volta a ligar o som');

// A tela é quadrada e cabe no ecrã.
const caixa = await pagina.evaluate(() => {
  const t = document.getElementById('tela').getBoundingClientRect();
  return { l: t.width, a: t.height, scroll: document.documentElement.scrollWidth - window.innerWidth };
});
await verificar(Math.abs(caixa.l - caixa.a) < 1.5, 'as células são quadradas no desktop');
await verificar(caixa.scroll <= 0, 'não há barra de deslocamento horizontal');
await ctxDesktop.close();

// ---------- Telemóvel ao alto, com swipe ----------

const ctxMovel = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
});
pagina = await ctxMovel.newPage();
vigiar(pagina);
await pagina.goto(URL_JOGO, { waitUntil: 'networkidle' });
await pagina.waitForTimeout(400);

const cdp = await ctxMovel.newCDPSession(pagina);
async function deslizar(dx, dy) {
  const c = await pagina.evaluate(() => {
    const r = document.getElementById('arena').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
  for (let i = 1; i <= 4; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: c.x + (dx * i) / 4, y: c.y + (dy * i) / 4 }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pagina.waitForTimeout(140);
}

await deslizar(0, -70);
await verificar((await estado()).direcao === 'cima', 'swipe para cima vira para cima');
await deslizar(-70, 0);
await verificar((await estado()).direcao === 'esquerda', 'swipe para a esquerda vira para a esquerda');
await deslizar(0, 70);
await verificar((await estado()).direcao === 'baixo', 'swipe para baixo vira para baixo');
await deslizar(70, 0);
await verificar((await estado()).direcao === 'direita', 'swipe para a direita vira para a direita');
// A ir para a direita, um swipe para a esquerda é meia-volta: tem de ser recusado.
await deslizar(-70, 0);
await verificar((await estado()).direcao === 'direita', 'swipe para trás não inverte a serpente');
// Um arrasto curto não conta como swipe nem muda nada.
await deslizar(6, 0);
await verificar((await estado()).direcao === 'direita', 'um toque curto não vira a serpente por engano');
await pagina.screenshot({ path: join(saida, '4-movel-vertical.png') });

const caixaMovel = await pagina.evaluate(() => {
  const t = document.getElementById('tela').getBoundingClientRect();
  return {
    l: t.width,
    a: t.height,
    cabe: t.bottom <= window.innerHeight + 1 && t.right <= window.innerWidth + 1,
    scroll: document.documentElement.scrollHeight - window.innerHeight,
  };
});
await verificar(Math.abs(caixaMovel.l - caixaMovel.a) < 1.5, 'as células continuam quadradas no telemóvel');
await verificar(caixaMovel.cabe, 'a arena cabe inteira no ecrã vertical');
await verificar(caixaMovel.scroll <= 1, 'a página não ganha deslocamento no telemóvel');

// ---------- Telemóvel deitado ----------

await pagina.setViewportSize({ width: 844, height: 390 });
await pagina.waitForTimeout(400);
const deitado = await pagina.evaluate(() => {
  const t = document.getElementById('tela').getBoundingClientRect();
  return { l: t.width, a: t.height, cabe: t.bottom <= window.innerHeight + 1 };
});
await verificar(Math.abs(deitado.l - deitado.a) < 1.5, 'as células ficam quadradas em ecrã deitado');
await verificar(deitado.cabe && deitado.a > 240, `a arena aproveita a altura deitada (${Math.round(deitado.a)} px)`);
await pagina.screenshot({ path: join(saida, '5-movel-deitado.png') });

// ---------- Tablet ----------

await pagina.setViewportSize({ width: 820, height: 1180 });
await pagina.waitForTimeout(400);
await pagina.screenshot({ path: join(saida, '6-tablet.png') });
const tablet = await pagina.evaluate(() => {
  const t = document.getElementById('tela').getBoundingClientRect();
  return { l: t.width, a: t.height };
});
await verificar(Math.abs(tablet.l - tablet.a) < 1.5 && tablet.l > 500, 'a arena cresce no tablet sem deformar');

// Fluidez: o jogo tem de manter uma taxa de quadros confortável enquanto anda.
await pagina.setViewportSize({ width: 390, height: 844 });
await pagina.waitForTimeout(300);
const fps = await pagina.evaluate(() => {
  const { jogo } = window.serpente;
  jogo.reiniciar();
  jogo.comecar();
  return new Promise((resolve) => {
    let quadros = 0;
    const inicio = performance.now();
    const contar = () => {
      quadros++;
      if (performance.now() - inicio < 2000) requestAnimationFrame(contar);
      else resolve((quadros * 1000) / (performance.now() - inicio));
    };
    requestAnimationFrame(contar);
  });
});
await verificar(fps > 45, `desenha a ${Math.round(fps)} FPS no formato de telemóvel`);

await verificar(erros.length === 0, `não houve erros na consola${erros.length ? `: ${erros.join(' | ')}` : ''}`);

console.log(`\nCapturas em ${saida}`);
await navegador.close();
await servidor.close();
