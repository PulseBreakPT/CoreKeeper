/**
 * Teste de fumo: abre o jogo num Chromium, joga uns segundos e verifica
 * que não há erros, que o ecrã desenha e que a mineração devolve itens.
 */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const saida = process.env.PASTA_FUMO ?? join(raiz, '.fumo');
mkdirSync(saida, { recursive: true });

const servidor = await createServer({ root: raiz, server: { port: 5199 }, logLevel: 'error' });
await servidor.listen();

// O contentor traz um Chromium pré-instalado que pode não bater certo com a versão do Playwright.
const alternativas = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
].filter(Boolean);
const executablePath = alternativas.find((p) => existsSync(p));
const navegador = await chromium.launch(executablePath ? { executablePath } : {});
const pagina = await navegador.newPage({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });

const erros = [];
pagina.on('console', (m) => {
  if (m.type() === 'error') erros.push(m.text());
});
pagina.on('pageerror', (e) => erros.push(String(e)));

const falhar = async (msg) => {
  await pagina.screenshot({ path: join(saida, 'falha.png') });
  console.error('✗', msg);
  await navegador.close();
  await servidor.close();
  process.exit(1);
};

await pagina.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
await pagina.screenshot({ path: join(saida, '1-menu.png') });

// Começa sempre a mesma partida, para o teste ser repetível.
await pagina.fill('#seed', 'tiago');
await pagina.click('#novo');
await pagina.waitForTimeout(700);

const vivo = await pagina.evaluate(() => Boolean(window.nucleoPerdido?.jogo()));
if (!vivo) await falhar('o jogo não arrancou');

// Anda um pouco em cada direcção e pica o que estiver à frente.
for (const tecla of ['KeyS', 'KeyD', 'KeyW', 'KeyA']) {
  await pagina.keyboard.down(tecla);
  await pagina.waitForTimeout(260);
  await pagina.keyboard.up(tecla);
}

const antes = await pagina.evaluate(() => {
  const j = window.nucleoPerdido.jogo();
  return { blocos: j.estatisticas.blocos, itens: j.inventario.slots.filter(Boolean).length };
});

// Procura uma parede mesmo ao lado de chão livre e encosta-se a ela.
const encostado = await pagina.evaluate(() => {
  const j = window.nucleoPerdido.jogo();
  for (let raio = 2; raio < 40; raio++) {
    for (let a = 0; a < 64; a++) {
      const ang = (a / 64) * Math.PI * 2;
      const x = Math.round(Math.cos(ang) * raio);
      const y = Math.round(Math.sin(ang) * raio);
      if (j.world.solido(x, y)) continue;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const def = j.world.blocoDef(x + dx, y + dy);
        if (!def.minavel || def.invulneravel || def.nivel > 1) continue;
        j.player.x = x + 0.5;
        j.player.y = y + 0.5;
        j.player.dirX = dx;
        j.player.dirY = dy;
        return { x, y, dx, dy, alvo: def.nome };
      }
    }
  }
  return null;
});
if (!encostado) await falhar('não foi encontrada nenhuma parede para minar');

await pagina.keyboard.down('Space');
await pagina.waitForTimeout(4000);
await pagina.keyboard.up('Space');
await pagina.waitForTimeout(600);

const depois = await pagina.evaluate(() => {
  const j = window.nucleoPerdido.jogo();
  return {
    blocos: j.estatisticas.blocos,
    itens: j.inventario.slots.filter(Boolean).length,
    vida: j.player.vida,
    tempo: j.tempo,
  };
});

await pagina.screenshot({ path: join(saida, '2-jogo.png') });

// O ecrã tem de ter cor a sério (não pode ficar tudo preto).
const cores = await pagina.evaluate(() => {
  const canvas = document.getElementById('jogo');
  const ctx = canvas.getContext('2d');
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const vistas = new Set();
  let soma = 0;
  for (let i = 0; i < d.length; i += 4 * 997) {
    vistas.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
    soma += d[i] + d[i + 1] + d[i + 2];
  }
  return { distintas: vistas.size, brilhoMedio: soma / (d.length / (4 * 997)) / 3 };
});

// Abre a mochila e cria uma bancada com madeira dada de propósito.
await pagina.evaluate(() => {
  const j = window.nucleoPerdido.jogo();
  j.inventario.adicionar('ironroot', 8);
});
await pagina.click('.botao-mochila');
await pagina.waitForTimeout(250);
await pagina.click('[data-aba="criar"]');
await pagina.waitForTimeout(200);
await pagina.screenshot({ path: join(saida, '3-criar.png') });
const receitas = await pagina.locator('.receita').count();
if (receitas === 0) await falhar('o painel de criação está vazio');
await pagina.locator('.receita', { hasText: 'Bancada' }).first().click();
await pagina.waitForTimeout(200);
const temBancada = await pagina.evaluate(() => window.nucleoPerdido.jogo().inventario.contar('workbench') > 0);
await pagina.locator('.painel-fechar').click();

// --- Combate: nasce um bicho à frente do jogador e leva porrada até morrer.
await pagina.evaluate(() => {
  const j = window.nucleoPerdido.jogo();
  j.player.dirX = 1;
  j.player.dirY = 0;
  j.criarInimigo('grubjaw', j.player.x + 1, j.player.y);
});
const bichosAntes = await pagina.evaluate(() => window.nucleoPerdido.jogo().estatisticas.bichos);
for (let i = 0; i < 14; i++) {
  await pagina.keyboard.press('Space');
  await pagina.waitForTimeout(220);
}
const combate = await pagina.evaluate(() => {
  const j = window.nucleoPerdido.jogo();
  return { bichos: j.estatisticas.bichos, vivos: j.inimigos.length };
});
if (combate.bichos <= bichosAntes) await falhar('o bicho não morreu depois de 14 golpes');

// --- Chefe: entrar na arena tem de o acordar.
const chefe = await pagina.evaluate(async () => {
  const j = window.nucleoPerdido.jogo();
  const mod = await import('/src/world/worldgen.ts');
  const sala = mod.salasEspeciais(j.world.seed)[0];
  j.player.x = sala.x + 0.5;
  j.player.y = sala.y + 0.5;
  return { sala };
});
await pagina.waitForTimeout(500);
const chefeAcordado = await pagina.evaluate(() => {
  const j = window.nucleoPerdido.jogo();
  return j.chefeAtivo ? { nome: j.chefeAtivo.def.nome, vida: j.chefeAtivo.vida } : null;
});
if (!chefeAcordado) await falhar('o chefe não acordou dentro da arena');
await pagina.screenshot({ path: join(saida, '4-chefe.png') });

// --- Gravação: guardar, recarregar a página e continuar.
const antesDeGuardar = await pagina.evaluate(() => {
  const j = window.nucleoPerdido.jogo();
  j.player.x = 24.5;
  j.player.y = -18.5;
  j.inventario.adicionar('barra_ferrite', 5);
  j.guardar();
  return { x: j.player.x, y: j.player.y, ouro: j.inventario.contar('barra_ferrite'), seed: j.world.seed };
});
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.click('#continuar');
await pagina.waitForTimeout(600);
const depoisDeCarregar = await pagina.evaluate(() => {
  const j = window.nucleoPerdido.jogo();
  return { x: j.player.x, y: j.player.y, ouro: j.inventario.contar('barra_ferrite'), seed: j.world.seed };
});
const gravacaoOk =
  Math.abs(depoisDeCarregar.x - antesDeGuardar.x) < 0.01 &&
  depoisDeCarregar.ouro === antesDeGuardar.ouro &&
  depoisDeCarregar.seed === antesDeGuardar.seed;
if (!gravacaoOk) await falhar(`a gravação não repôs o estado: ${JSON.stringify({ antesDeGuardar, depoisDeCarregar })}`);

const relatorio = {
  erros,
  encostado,
  tempoSimulado: Number(depois.tempo.toFixed(1)),
  blocosPartidos: depois.blocos - antes.blocos,
  slotsGanhos: depois.itens - antes.itens,
  vida: depois.vida,
  cores,
  receitas,
  temBancada,
  combate,
  chefe: { ...chefe.sala, acordado: chefeAcordado },
  gravacaoOk,
};
writeFileSync(join(saida, 'relatorio.json'), JSON.stringify(relatorio, null, 2));
console.log(JSON.stringify(relatorio, null, 2));

await navegador.close();
await servidor.close();

if (erros.length) {
  console.error('✗ houve erros na consola');
  process.exit(1);
}
if (relatorio.blocosPartidos < 1) {
  console.error('✗ não foi partido nenhum bloco a picar durante 4s');
  process.exit(1);
}
if (!temBancada) {
  console.error('✗ não foi possível criar a bancada');
  process.exit(1);
}
if (cores.distintas < 12 || cores.brilhoMedio < 6) {
  console.error('✗ o ecrã parece vazio ou demasiado escuro');
  process.exit(1);
}
console.log('✓ teste de fumo passou');
