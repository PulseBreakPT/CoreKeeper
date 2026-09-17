/**
 * Mede o desempenho real: arranca o jogo, joga uns segundos e reporta
 * FPS médio, percentis e o custo de cada fase do desenho.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const servidor = await createServer({ root: raiz, server: { port: 5196 }, logLevel: 'error' });
await servidor.listen();

const caminhos = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
].filter(Boolean);
const executablePath = caminhos.find((p) => existsSync(p));

// Sem aceleração gráfica: aproxima-se mais de um telemóvel modesto.
const navegador = await chromium.launch({
  executablePath,
  args: ['--disable-gpu', '--disable-software-rasterizer'],
});
const pagina = await navegador.newPage({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });

await pagina.goto('http://localhost:5196/', { waitUntil: 'networkidle' });
await pagina.fill('#seed', 'tiago');
await pagina.click('#novo');
await pagina.waitForTimeout(900);

// Caminhar durante a medição, para o mundo estar a gerar chunks como em jogo real.
await pagina.evaluate(() => {
  window.__amostras = [];
  let anterior = performance.now();
  const medir = (t) => {
    window.__amostras.push(t - anterior);
    anterior = t;
    requestAnimationFrame(medir);
  };
  requestAnimationFrame(medir);
});

async function medir(modo) {
  await pagina.evaluate((m) => {
    const j = window.nucleoPerdido.jogo();
    j.renderer.modoQualidade = m;
    window.__amostras.length = 0;
  }, modo);
  await pagina.keyboard.down('KeyD');
  await pagina.waitForTimeout(2600);
  await pagina.keyboard.up('KeyD');
  return pagina.evaluate((m) => {
    const p = window.nucleoPerdido.perf;
    return { modo: m, msDesenho: p.msDesenho, msLogica: p.msLogica, fps: p.fps };
  }, modo);
}

const porNivel = [];
for (const modo of ['alta', 'media', 'baixa']) porNivel.push(await medir(modo));
await pagina.evaluate(() => {
  const j = window.nucleoPerdido.jogo();
  j.renderer.modoQualidade = 'auto';
  window.__amostras.length = 0;
});

await pagina.keyboard.down('KeyD');
await pagina.waitForTimeout(6000);
await pagina.keyboard.up('KeyD');

const r = await pagina.evaluate(() => {
  const a = window.__amostras.slice(10).sort((x, y) => x - y);
  const media = a.reduce((s, v) => s + v, 0) / a.length;
  const pct = (p) => a[Math.floor(a.length * p)];
  const j = window.nucleoPerdido.jogo();
  const perf = window.nucleoPerdido.perf;
  return {
    amostras: a.length,
    fpsMedido: +(1000 / media).toFixed(1),
    intervaloP50: +pct(0.5).toFixed(2),
    intervaloP95: +pct(0.95).toFixed(2),
    // Isto é o que realmente conta: quanto tempo o jogo gasta por quadro.
    msLogica: perf.msLogica,
    msDesenho: perf.msDesenho,
    msTrabalho: +(perf.msLogica + perf.msDesenho).toFixed(2),
    qualidade: j ? j.renderer?.qualidade : null,
    bichos: j.inimigos.length,
    particulas: j.particulas.length,
  };
});

console.log(JSON.stringify({ ...r, porNivel }, null, 2));
await navegador.close();
await servidor.close();
