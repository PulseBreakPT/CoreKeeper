// Captura o launcher Nexus Word em vários ecrãs e reporta overflow/sobreposições.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { mkdirSync } from 'node:fs';

const RAIZ = new URL('../palavras-app/www/', import.meta.url).pathname;
const DESTINO = process.env.DESTINO || '/tmp/nw';
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const ECRAS = [[360, 800], [390, 844], [411, 915], [430, 932]];

const servidor = createServer(async (req, res) => {
  const caminho = join(RAIZ, normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''));
  try {
    const alvo = caminho.endsWith('/') ? join(caminho, 'index.html') : caminho;
    res.writeHead(200, { 'content-type': TIPOS[extname(alvo)] || 'application/octet-stream' });
    res.end(await readFile(alvo));
  } catch { if (!res.headersSent) res.writeHead(404); res.end('404'); }
});
await new Promise(r => servidor.listen(4319, r));
mkdirSync(DESTINO, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
let falhas = 0;
for (const [w, h] of ECRAS) {
  const pagina = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const erros = [];
  pagina.on('pageerror', e => erros.push(String(e)));
  pagina.on('console', m => { if (m.type() === 'error') erros.push(m.text()); });
  await pagina.goto('http://127.0.0.1:4319/palavras.html', { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(900);
  await pagina.screenshot({ path: `${DESTINO}/menu-${w}x${h}.png` });

  const relatorio = await pagina.evaluate(() => {
    const raiz = document.getElementById('menu');
    const problemas = [];
    if (raiz.scrollWidth > raiz.clientWidth + 1) problemas.push(`scroll horizontal ${raiz.scrollWidth}>${raiz.clientWidth}`);
    const excesso = raiz.scrollHeight - raiz.clientHeight;
    for (const n of raiz.querySelectorAll('.nw-exemplo b,.nw-copy small,.nw-recorde,.nw-daily b,.nw-daily em,.nw-chip,.nw-bottom b,.nw-cta strong')) {
      if (n.scrollWidth > n.clientWidth + 1) problemas.push(`corta "${n.textContent.trim()}" (${n.scrollWidth}>${n.clientWidth})`);
      const c = getComputedStyle(n);
      if (parseFloat(c.fontSize) < 7) problemas.push(`texto minúsculo "${n.textContent.trim()}" ${c.fontSize}`);
    }
    for (const n of raiz.querySelectorAll('.nw-card,.nw-daily,.nw-best,.nw-bottom')) {
      const r = n.getBoundingClientRect();
      if (r.left < -0.5 || r.right > innerWidth + 0.5) problemas.push(`${n.className} fora do ecrã`);
    }
    // O buffer do shader não é preservado, por isso confirma-se que desenhou e que
    // está por cima do cenário; o brilho em si verifica-se na captura.
    const tela = raiz.querySelector('.nw-luz');
    let luz = 'ausente (fallback CSS)';
    if (tela) {
      luz = `${tela.dataset.luz || 'sem desenhar'} ${tela.width}x${tela.height}`;
      if (tela.dataset.luz !== 'activa') problemas.push('camada de luz nunca desenhou');
      if (!tela.previousElementSibling?.classList.contains('nw-cenario')) problemas.push('camada de luz fora de ordem');
    }
    return { problemas, excesso, luz };
  });
  const etiqueta = `${w}x${h}`;
  if (erros.length) { falhas++; console.log(`✗ ${etiqueta} erros JS:`, erros.slice(0, 3)); }
  if (relatorio.problemas.length) { falhas++; console.log(`✗ ${etiqueta}`, relatorio.problemas); }
  else console.log(`✓ ${etiqueta} (scroll extra ${relatorio.excesso}px) · luz ${relatorio.luz}`);

  // Interações: folha de recordes, palavra do dia e arranque/regresso de partida.
  const passos = [];
  await pagina.click('#abrir-recordes');
  await pagina.waitForTimeout(350);
  passos.push(['folha recordes', await pagina.isVisible('#folha-conteudo .linha-folha')]);
  if (w === 390) await pagina.screenshot({ path: `${DESTINO}/folha-${w}x${h}.png` });
  await pagina.click('#fechar-folha-x');
  await pagina.click('#ver-palavra-dia');
  passos.push(['palavra do dia', await pagina.isVisible('.palavra-dia-folha')]);
  await pagina.click('#fechar-folha-x');
  // A onda de toque tem de nascer no elemento premido e desaparecer sozinha.
  const cartao = await pagina.locator('[data-modo="singular"]').boundingBox();
  await pagina.mouse.move(cartao.x + 30, cartao.y + cartao.height - 20);
  await pagina.mouse.down();
  await pagina.waitForTimeout(80);
  passos.push(['onda de toque', await pagina.locator('[data-modo="singular"] .nw-onda').count() === 1]);
  // Sair do cartão antes de largar, para não disparar o clique e arrancar a partida.
  await pagina.mouse.move(w / 2, 4);
  await pagina.mouse.up();
  await pagina.waitForTimeout(700);
  passos.push(['onda limpa-se', await pagina.locator('.nw-onda').count() === 0]);
  passos.push(['toque não arranca jogo', await pagina.isVisible('#menu')]);

  await pagina.click('[data-modo="plural"]');
  await pagina.waitForTimeout(400);
  passos.push(['inicia jogo', await pagina.isHidden('#menu') && await pagina.isVisible('#jogo')]);
  await pagina.waitForTimeout(2600);
  await pagina.click('#voltar');
  passos.push(['volta ao menu', await pagina.isVisible('#menu')]);
  // Desligar ANIMAÇÕES nas definições tem de calar a camada de luz e as ondas.
  await pagina.click('#abrir-definicoes');
  await pagina.waitForTimeout(300);
  await pagina.click('[data-opcao="movimento"]');
  await pagina.waitForTimeout(250);
  await pagina.click('#fechar-folha-x');
  await pagina.waitForTimeout(250);
  passos.push(['luz cala-se sem animações', await pagina.evaluate(() => {
    const t = document.querySelector('.nw-luz');
    return !t || t.style.opacity === '0';
  })]);
  const c2 = await pagina.locator('[data-modo="singular"]').boundingBox();
  await pagina.mouse.move(c2.x + 30, c2.y + c2.height - 20);
  await pagina.mouse.down();
  await pagina.waitForTimeout(80);
  passos.push(['sem onda com movimento reduzido', await pagina.locator('.nw-onda').count() === 0]);
  await pagina.mouse.move(w / 2, 4);
  await pagina.mouse.up();
  await pagina.evaluate(() => localStorage.clear());

  // Ecrã de jogo: arrancar uma partida e medir a casca nova com as mesmas regras.
  await pagina.evaluate(() => localStorage.clear());
  await pagina.reload({ waitUntil: 'networkidle' });
  await pagina.waitForTimeout(500);
  await pagina.click('[data-modo="plural"]');
  await pagina.waitForTimeout(400);
  if (w === 390) await pagina.screenshot({ path: `${DESTINO}/contagem-${w}x${h}.png` });
  await pagina.waitForSelector('#contagem', { state: 'hidden', timeout: 8000 });
  await pagina.waitForTimeout(500);
  if (w === 390) await pagina.screenshot({ path: `${DESTINO}/jogo-${w}x${h}.png` });

  const jogo = await pagina.evaluate(() => {
    const raiz = document.getElementById('jogo');
    const maus = [];
    if (raiz.scrollWidth > raiz.clientWidth + 1) maus.push(`scroll horizontal ${raiz.scrollWidth}>${raiz.clientWidth}`);
    for (const n of raiz.querySelectorAll('.jg-marcador strong,.jg-marcador small,.nw-chip,.jg-faixa b,.jg-faixa small,.nw-cta strong,.jg-tempo-corpo b,.jg-bottom b,.jg-pergunta h1,.jg-pergunta p,#estado-input')) {
      if (n.scrollWidth > n.clientWidth + 1) maus.push(`corta "${n.textContent.trim()}" (${n.scrollWidth}>${n.clientWidth})`);
      if (parseFloat(getComputedStyle(n).fontSize) < 6.5) maus.push(`texto minúsculo "${n.textContent.trim()}"`);
    }
    for (const n of raiz.querySelectorAll('.jg-card,.jg-faixa,.jg-bottom,.jg-hud,.jg-tempo')) {
      const r = n.getBoundingClientRect();
      if (r.left < -0.5 || r.right > innerWidth + 0.5) maus.push(`${n.className} fora do ecrã`);
    }
    return { maus, excesso: raiz.scrollHeight - raiz.clientHeight, tempo: document.getElementById('tempo-numero').textContent };
  });
  if (jogo.maus.length) { falhas++; console.log(`  ✗ jogo ${etiqueta}`, jogo.maus); }
  else console.log(`  ✓ jogo ${etiqueta} (scroll extra ${jogo.excesso}px, relógio ${jogo.tempo})`);

  // Resposta errada de propósito: primeiro a segunda oportunidade, depois o erro.
  // É o caminho determinista — o plural certo depende da palavra sorteada.
  await pagina.fill('#resposta', 'zzzz');
  await pagina.click('#confirmar');
  await pagina.waitForTimeout(220);
  // Verifica a classe base também: main.ts reescreve className inteiro e já a perdeu uma vez.
  passos.push(['segunda oportunidade', await pagina.evaluate(() => {
    const f = document.getElementById('feedback');
    return !f.hidden && f.classList.contains('oportunidade') && f.classList.contains('jg-feedback')
      && getComputedStyle(f).position === 'absolute';
  })]);
  passos.push(['caixa da resposta mantém estilo', await pagina.evaluate(() =>
    document.getElementById('resposta-wrap').classList.contains('jg-resposta'))]);
  if (w === 390) await pagina.screenshot({ path: `${DESTINO}/feedback-${w}x${h}.png` });
  await pagina.waitForTimeout(800);
  await pagina.fill('#resposta', 'zzzz');
  await pagina.click('#confirmar');
  await pagina.waitForTimeout(220);
  passos.push(['feedback de erro', await pagina.evaluate(() => {
    const f = document.getElementById('feedback');
    return !f.hidden && f.classList.contains('errado') && f.classList.contains('jg-feedback');
  })]);
  await pagina.waitForTimeout(900);
  passos.push(['histórico preenche', await pagina.locator('#historico span').count() >= 1]);

  // Pausar, retomar, pular e mudo.
  await pagina.click('#pausa');
  await pagina.waitForTimeout(150);
  passos.push(['pausa muda rótulo', (await pagina.textContent('#pausa-texto')) === 'RETOMAR']);
  await pagina.click('#pausa');
  await pagina.waitForTimeout(150);
  passos.push(['retoma', (await pagina.textContent('#pausa-texto')) === 'PAUSAR']);
  await pagina.click('#som');
  passos.push(['som desliga', (await pagina.getAttribute('#som', 'aria-pressed')) === 'false']);
  await pagina.click('#som');
  const antesPular = await pagina.evaluate(() => document.getElementById('vidas').textContent);
  await pagina.click('#pular');
  await pagina.waitForTimeout(1100);
  passos.push(['pular custa vida', (await pagina.evaluate(() => document.getElementById('vidas').textContent)) !== antesPular]);

  // Gastar as vidas que restam para chegar ao painel final e à revisão.
  for (let i = 0; i < 4 && await pagina.isHidden('#painel'); i++) {
    await pagina.click('#pular');
    await pagina.waitForTimeout(1100);
  }
  passos.push(['painel final aparece', await pagina.isVisible('#painel')]);
  if (w === 390) await pagina.screenshot({ path: `${DESTINO}/painel-${w}x${h}.png` });
  passos.push(['painel tem resumo', (await pagina.locator('#painel .jg-resumo span').count()) === 4]);
  await pagina.click('#rever-erros');
  await pagina.waitForTimeout(300);
  passos.push(['revisão lista erros', (await pagina.locator('#lista-erros article').count()) > 0]);
  if (w === 390) await pagina.screenshot({ path: `${DESTINO}/revisao-${w}x${h}.png` });
  await pagina.click('#fechar-revisao');
  await pagina.click('#ir-menu');
  passos.push(['sai para o menu', await pagina.isVisible('#menu')]);

  const maus = passos.filter(([, ok]) => !ok).map(([n]) => n);
  if (maus.length || erros.length) { falhas++; console.log(`  ✗ interações ${etiqueta}:`, maus, erros.slice(0, 2)); }
  else console.log(`  ✓ interações ${etiqueta}`);
  await pagina.close();
}
await browser.close();
servidor.close();
process.exit(falhas ? 1 : 0);
