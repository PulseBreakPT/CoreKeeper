/**
 * Gera todos os ícones do jogo — web (PWA) e Android — a partir de uma
 * grelha 16x16 desenhada à mão. Sem dependências: escreve o PNG à unha.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const PALETA = {
  '.': [6, 5, 10, 255],
  n: [13, 12, 20, 255],
  e: [26, 24, 38, 255],
  b: [67, 64, 92, 255],
  o: [122, 93, 13, 255],
  O: [242, 195, 51, 255],
  L: [255, 246, 194, 255],
  c: [109, 224, 255, 255],
};

// O sigilo do Portador: anel negro, losango de Veyra, quatro marcas dos Architects.
const ARTE = [
  '................',
  '....nnnnnnnn....',
  '..nnbbbbbbbbnn..',
  '..nb..cOOc..bn..',
  '.nb..oOLLOo..bn.',
  '.nb.oOLLLLOo.bn.',
  'nb..OLLLLLLO..bn',
  'nb.cOLLLLLLOc.bn',
  'nb.cOLLLLLLOc.bn',
  'nb..OLLLLLLO..bn',
  '.nb.oOLLLLOo.bn.',
  '.nb..oOLLOo..bn.',
  '..nb..cOOc..bn..',
  '..nnbbbbbbbbnn..',
  '....nnnnnnnn....',
  '................',
];

function crc32(buf) {
  const tabela = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = tabela[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(tipo, dados) {
  const comprimento = Buffer.alloc(4);
  comprimento.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([comprimento, corpo, crc]);
}

/** `margem` deixa espaço à volta, para os ícones adaptativos do Android. */
function png(tamanho, margem = 0) {
  const util = tamanho * (1 - margem * 2);
  const escala = util / 16;
  const offset = (tamanho - util) / 2;
  const linhas = [];
  for (let y = 0; y < tamanho; y++) {
    const linha = Buffer.alloc(1 + tamanho * 4);
    for (let x = 0; x < tamanho; x++) {
      const gx = Math.floor((x - offset) / escala);
      const gy = Math.floor((y - offset) / escala);
      const ch = gx >= 0 && gx < 16 && gy >= 0 && gy < 16 ? ARTE[gy][gx] : '.';
      linha.set(PALETA[ch] ?? PALETA['.'], 1 + x * 4);
    }
    linhas.push(linha);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tamanho, 0);
  ihdr.writeUInt32BE(tamanho, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(linhas), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function svg() {
  let corpo = '';
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = ARTE[y][x];
      if (ch === '.') continue;
      const [r, g, b] = PALETA[ch];
      corpo += `<rect x="${x}" y="${y}" width="1" height="1" fill="rgb(${r},${g},${b})"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect width="16" height="16" fill="#06050a"/>${corpo}</svg>`;
}

// --- Web / PWA ---------------------------------------------------------------
mkdirSync(join(raiz, 'public'), { recursive: true });
for (const tamanho of [192, 512]) {
  writeFileSync(join(raiz, 'public', `icon-${tamanho}.png`), png(tamanho));
}
writeFileSync(join(raiz, 'public', 'icon.svg'), svg());

// --- Android -----------------------------------------------------------------
const DENSIDADES = [
  ['mdpi', 48, 108],
  ['hdpi', 72, 162],
  ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324],
  ['xxxhdpi', 192, 432],
];

const resAndroid = join(raiz, 'android', 'app', 'src', 'main', 'res');
let feitosAndroid = 0;
for (const [densidade, legado, adaptativo] of DENSIDADES) {
  const pasta = join(resAndroid, `mipmap-${densidade}`);
  try {
    mkdirSync(pasta, { recursive: true });
    writeFileSync(join(pasta, 'ic_launcher.png'), png(legado));
    writeFileSync(join(pasta, 'ic_launcher_round.png'), png(legado));
    // O primeiro plano adaptativo precisa de margem: o Android corta as bordas.
    writeFileSync(join(pasta, 'ic_launcher_foreground.png'), png(adaptativo, 0.25));
    feitosAndroid++;
  } catch {
    /* o projecto Android pode não existir nesta máquina */
  }
}

console.log(`Ícones web gerados. Densidades Android: ${feitosAndroid}.`);
