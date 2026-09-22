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
    return { problemas, excesso };
  });
  const etiqueta = `${w}x${h}`;
  if (erros.length) { falhas++; console.log(`✗ ${etiqueta} erros JS:`, erros.slice(0, 3)); }
  if (relatorio.problemas.length) { falhas++; console.log(`✗ ${etiqueta}`, relatorio.problemas); }
  else console.log(`✓ ${etiqueta} (scroll extra ${relatorio.excesso}px)`);

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
  await pagina.click('[data-modo="plural"]');
  await pagina.waitForTimeout(400);
  passos.push(['inicia jogo', await pagina.isHidden('#menu') && await pagina.isVisible('#jogo')]);
  await pagina.waitForTimeout(2600);
  await pagina.click('#voltar');
  passos.push(['volta ao menu', await pagina.isVisible('#menu')]);
  const maus = passos.filter(([, ok]) => !ok).map(([n]) => n);
  if (maus.length || erros.length) { falhas++; console.log(`  ✗ interações ${etiqueta}:`, maus, erros.slice(0, 2)); }
  else console.log(`  ✓ interações ${etiqueta}`);
  await pagina.close();
}
await browser.close();
servidor.close();
process.exit(falhas ? 1 : 0);
