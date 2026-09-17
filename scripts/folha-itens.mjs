/** Desenha todos os ícones de item em grande, para se rever a arte. */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const saida = process.env.PASTA_FUMO ?? join(raiz, '.fumo');
mkdirSync(saida, { recursive: true });

const servidor = await createServer({ root: raiz, server: { port: 5194 }, logLevel: 'error' });
await servidor.listen();
const exe = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].filter(Boolean).find(existsSync);
const navegador = await chromium.launch({ executablePath: exe });
const pagina = await navegador.newPage({ viewport: { width: 1400, height: 1200 } });
await pagina.goto('http://localhost:5194/', { waitUntil: 'networkidle' });

const relatorio = await pagina.evaluate(() => {
  const { spriteItem, temPintorItem, sprite, ITEMS } = window.nucleoPerdido.arte;
  const itens = Object.values(ITEMS);
  const celula = 104;
  const porLinha = 13;
  const linhas = Math.ceil(itens.length / porLinha);

  const folha = document.createElement('canvas');
  folha.id = 'folha';
  folha.width = porLinha * celula;
  folha.height = linhas * celula;
  folha.style.cssText = 'position:absolute;inset:0;z-index:999;background:#0d0b16';
  const c = folha.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#0d0b16';
  c.fillRect(0, 0, folha.width, folha.height);
  c.font = '10px system-ui';
  c.textAlign = 'center';

  const semPintor = [];
  itens.forEach((def, i) => {
    const x = (i % porLinha) * celula;
    const y = Math.floor(i / porLinha) * celula;
    const arte = temPintorItem(def.sprite)
      ? spriteItem(def.sprite, def.paleta, undefined, def.variante ?? 0)
      : (semPintor.push(`${def.id} (${def.sprite})`), sprite(def.sprite, 0, def.paleta));
    const lado = celula - 26;
    c.drawImage(arte, x + 13, y + 6, lado, lado);
    c.fillStyle = '#b9b0d0';
    c.fillText(def.nome.slice(0, 16), x + celula / 2, y + celula - 6);
  });

  document.body.appendChild(folha);
  return { total: itens.length, semPintor };
});

await pagina.locator('#folha').screenshot({ path: join(saida, 'folha-itens.png') });
console.log(`Folha de itens gerada: ${relatorio.total} itens.`);
if (relatorio.semPintor.length) {
  console.log(`Sem pintor dedicado (${relatorio.semPintor.length}): ${relatorio.semPintor.join(', ')}`);
}
await navegador.close();
await servidor.close();
