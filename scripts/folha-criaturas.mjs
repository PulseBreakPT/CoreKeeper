/** Desenha o Portador e o bestiário em grande, para se rever a arte. */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const saida = process.env.PASTA_FUMO ?? join(raiz, '.fumo');
mkdirSync(saida, { recursive: true });

const servidor = await createServer({ root: raiz, server: { port: 5193 }, logLevel: 'error' });
await servidor.listen();
const exe = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].filter(Boolean).find(existsSync);
const navegador = await chromium.launch({ executablePath: exe });
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 900 } });
await pagina.goto('http://localhost:5193/', { waitUntil: 'networkidle' });

const quais = (process.env.CRIATURAS ?? 'grubjaw,dustling,tunnel_maw,stoneback,sporekin,bloom_maw,root_walker,furnace_drone,scrap_hound,forge_sentinel,storm_beetle,sand_wraith,prism_serpent,murkfin,shellwarden,lantern_eel,marrow_crawler,bone_weaver,pale_hunger,ossuary_knight,echo_shade,nullborn,observer,goruun,myra,varkan,tempest,nereth,giant,bearer_zero').split(',');

await pagina.evaluate((lista) => {
  const { desenharJogador, desenharInimigo, Inimigo, INIMIGOS } = window.nucleoPerdido.arte;
  const u = 74;
  const celula = 130;
  const porLinha = 8;
  const total = 4 + lista.length;
  const linhas = Math.ceil(total / porLinha);

  const folha = document.createElement('canvas');
  folha.id = 'folha';
  folha.width = porLinha * celula;
  folha.height = linhas * celula;
  folha.style.cssText = 'position:absolute;inset:0;z-index:999;background:#0d0b16';
  const c = folha.getContext('2d');
  c.fillStyle = '#0d0b16';
  c.fillRect(0, 0, folha.width, folha.height);
  c.font = '11px system-ui';
  c.textAlign = 'center';

  const rotular = (texto, x, y) => {
    c.fillStyle = '#b9b0d0';
    c.fillText(texto.slice(0, 18), x, y + celula / 2 - 6);
  };

  let i = 0;
  const posicao = () => {
    const x = (i % porLinha) * celula + celula / 2;
    const y = Math.floor(i / porLinha) * celula + celula / 2;
    i++;
    return [x, y];
  };

  // Portador nas quatro direcções.
  for (const [nome, dx, dy] of [['frente', 0, 1], ['costas', 0, -1], ['perfil', 1, 0], ['a andar', 1, 0]]) {
    const [x, y] = posicao();
    c.save();
    c.translate(x, y);
    desenharJogador(
      c,
      { dirX: dx, dirY: dy, andar: nome === 'a andar' ? 1.2 : 0, invulneravel: 0, morto: false, golpe: 0 },
      u,
      null,
      null,
    );
    c.restore();
    rotular(nome, x, y);
  }

  for (const id of lista) {
    const def = INIMIGOS[id];
    if (!def) continue;
    const e = new Inimigo(def, 0, 0, null);
    e.anim = 1.1;
    const [x, y] = posicao();
    c.save();
    c.translate(x, y);
    const escala = Math.min(1, 0.52 / def.raio);
    c.scale(escala, escala);
    desenharInimigo(c, e, u);
    c.restore();
    rotular(def.nome, x, y);
  }

  // Prova da silhueta: a mesma folha a preto. Se duas criaturas não se
  // distinguem aqui, o desenho está a apoiar-se na cor em vez da forma.
  const silhueta = document.createElement('canvas');
  silhueta.id = 'silhueta';
  silhueta.width = folha.width;
  silhueta.height = folha.height;
  const sc = silhueta.getContext('2d');
  sc.drawImage(folha, 0, 0);
  const img = sc.getImageData(0, 0, silhueta.width, silhueta.height);
  const d = img.data;
  // O fundo da folha é #0d0b16: tudo o que se afasta dele é criatura.
  for (let i = 0; i < d.length; i += 4) {
    const fundo = Math.abs(d[i] - 13) < 12 && Math.abs(d[i + 1] - 11) < 12 && Math.abs(d[i + 2] - 22) < 14;
    const v = fundo ? 236 : 18;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = fundo ? 232 : 22;
  }
  sc.putImageData(img, 0, 0);
  silhueta.style.cssText = 'position:absolute;inset:0;z-index:998';

  document.body.appendChild(folha);
  document.body.appendChild(silhueta);
  silhueta.style.display = 'none';
  window.__mostrarSilhueta = () => {
    folha.style.display = 'none';
    silhueta.style.display = 'block';
  };
}, quais);

await pagina.locator('#folha').screenshot({ path: join(saida, 'folha-criaturas.png') });
await pagina.evaluate(() => window.__mostrarSilhueta());
await pagina.locator('#silhueta').screenshot({ path: join(saida, 'folha-silhuetas.png') });
console.log('Folha de criaturas gerada.');
await navegador.close();
await servidor.close();
