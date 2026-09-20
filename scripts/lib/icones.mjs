/**
 * Maquinaria partilhada dos ícones: pinta uma grelha 16x16 em PNG e em SVG,
 * sem dependências — os PNG são escritos à unha.
 *
 * Cada jogo traz a sua arte e a sua paleta; daqui só sai o desenho.
 */
import { deflateSync } from 'node:zlib';

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
export function png(arte, paleta, tamanho, margem = 0) {
  const util = tamanho * (1 - margem * 2);
  const escala = util / 16;
  const offset = (tamanho - util) / 2;
  const linhas = [];
  for (let y = 0; y < tamanho; y++) {
    const linha = Buffer.alloc(1 + tamanho * 4);
    for (let x = 0; x < tamanho; x++) {
      const gx = Math.floor((x - offset) / escala);
      const gy = Math.floor((y - offset) / escala);
      const ch = gx >= 0 && gx < 16 && gy >= 0 && gy < 16 ? arte[gy][gx] : '.';
      linha.set(paleta[ch] ?? paleta['.'], 1 + x * 4);
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

export function svg(arte, paleta, fundo) {
  let corpo = '';
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = arte[y][x];
      if (ch === '.') continue;
      const [r, g, b] = paleta[ch];
      corpo += `<rect x="${x}" y="${y}" width="1" height="1" fill="rgb(${r},${g},${b})"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect width="16" height="16" fill="${fundo}"/>${corpo}</svg>`;
}

/** As cinco densidades Android: [pasta, ícone antigo, primeiro plano adaptativo]. */
export const DENSIDADES = [
  ['mdpi', 48, 108],
  ['hdpi', 72, 162],
  ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324],
  ['xxxhdpi', 192, 432],
];
