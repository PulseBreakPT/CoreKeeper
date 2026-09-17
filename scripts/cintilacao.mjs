/**
 * Mede cintilação: com o Portador parado e nada a mexer-se, dois quadros
 * seguidos deviam ser quase iguais. Qualquer diferença grande é a imagem a
 * piscar — o que cansa a vista e parece quebra de desempenho.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const servidor = await createServer({ root: raiz, server: { port: 5195 }, logLevel: 'error' });
await servidor.listen();
const exe = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
].filter(Boolean).find(existsSync);
const navegador = await chromium.launch({ executablePath: exe, args: ['--disable-gpu'] });
const pagina = await navegador.newPage({ viewport: { width: 873, height: 393 }, deviceScaleFactor: 2 });

await pagina.goto('http://localhost:5195/', { waitUntil: 'networkidle' });
await pagina.fill('#seed', 'tiago');
await pagina.click('#novo');
await pagina.waitForTimeout(1200);

const resultado = await pagina.evaluate(async () => {
  const canvas = document.getElementById('canvas') ?? document.getElementById('jogo');
  const ctx = canvas.getContext('2d');
  const l = Math.floor(canvas.width * 0.25);
  const t = Math.floor(canvas.height * 0.35);
  const w = Math.floor(canvas.width * 0.5);
  const h = Math.floor(canvas.height * 0.3);

  const esperar = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const quadros = [];
  for (let i = 0; i < 10; i++) {
    await esperar();
    quadros.push(ctx.getImageData(l, t, w, h).data);
  }

  let somaMedia = 0;
  let pior = 0;
  for (let i = 1; i < quadros.length; i++) {
    const a = quadros[i - 1];
    const b = quadros[i];
    let soma = 0;
    let maximo = 0;
    for (let p = 0; p < a.length; p += 4) {
      const d = Math.abs(a[p] - b[p]) + Math.abs(a[p + 1] - b[p + 1]) + Math.abs(a[p + 2] - b[p + 2]);
      soma += d;
      if (d > maximo) maximo = d;
    }
    const media = soma / (a.length / 4) / 3;
    somaMedia += media;
    if (media > pior) pior = media;
  }

  return {
    diferencaMedia: +(somaMedia / (quadros.length - 1)).toFixed(2),
    piorQuadro: +pior.toFixed(2),
    maxPorPixel: 255,
  };
});

console.log(JSON.stringify(resultado, null, 2));
await navegador.close();
await servidor.close();
