/** Desenha todos os sprites numa folha, para se rever a arte de uma vez. */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const saida = process.env.PASTA_FUMO ?? join(raiz, '.fumo');
mkdirSync(saida, { recursive: true });

const servidor = await createServer({ root: raiz, server: { port: 5198 }, logLevel: 'error' });
await servidor.listen();
const caminhos = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
].filter(Boolean);
const executablePath = caminhos.find((p) => existsSync(p));
const navegador = await chromium.launch(executablePath ? { executablePath } : {});
const pagina = await navegador.newPage({ viewport: { width: 900, height: 700 } });
await pagina.goto('http://localhost:5198/', { waitUntil: 'networkidle' });

await pagina.evaluate(() => {
  const { sprite, BLOCKS, GROUNDS, ITEMS } = window.nucleoPerdido.arte;
  const escala = 4;
  const passo = 16 * escala + 26;
  const porLinha = 10;
  const entradas = [
    ...GROUNDS.map((g) => ({ canvas: sprite(g.sprite, 0), nome: g.name })),
    ...BLOCKS.filter((b) => b.sprite).map((b) => ({ canvas: sprite(b.sprite, 0), nome: b.name })),
    ...Object.values(ITEMS).map((i) => ({ canvas: sprite(i.sprite, 0, i.cor, i.cor2), nome: i.nome })),
  ];
  const linhas = Math.ceil(entradas.length / porLinha);
  const folha = document.createElement('canvas');
  folha.width = porLinha * passo;
  folha.height = linhas * passo;
  folha.id = 'folha';
  folha.style.cssText = 'position:absolute;inset:0;z-index:999;background:#15101d';
  const ctx = folha.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#15101d';
  ctx.fillRect(0, 0, folha.width, folha.height);
  ctx.font = '10px system-ui';
  ctx.textAlign = 'center';
  entradas.forEach((e, i) => {
    const x = (i % porLinha) * passo;
    const y = Math.floor(i / porLinha) * passo;
    ctx.drawImage(e.canvas, x + 13, y + 4, 16 * escala, 16 * escala);
    ctx.fillStyle = '#cfc6dd';
    ctx.fillText(e.nome.slice(0, 16), x + passo / 2, y + 16 * escala + 16);
  });
  document.body.appendChild(folha);
  window.scrollTo(0, 0);
});

const folha = pagina.locator('#folha');
await folha.screenshot({ path: join(saida, 'folha-sprites.png') });
console.log('Folha gerada.');
await navegador.close();
await servidor.close();
