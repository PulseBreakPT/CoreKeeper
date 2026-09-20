/**
 * Gera todos os ícones do The Hollow Star — web (PWA) e Android — a partir de
 * uma grelha 16x16 desenhada à mão. A maquinaria vive em lib/icones.mjs.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DENSIDADES, png, svg } from './lib/icones.mjs';

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

// --- Web / PWA ---------------------------------------------------------------
mkdirSync(join(raiz, 'public'), { recursive: true });
for (const tamanho of [192, 512]) {
  writeFileSync(join(raiz, 'public', `icon-${tamanho}.png`), png(ARTE, PALETA, tamanho));
}
writeFileSync(join(raiz, 'public', 'icon.svg'), svg(ARTE, PALETA, '#06050a'));

// --- Android -----------------------------------------------------------------
const resAndroid = join(raiz, 'android', 'app', 'src', 'main', 'res');
let feitosAndroid = 0;
for (const [densidade, legado, adaptativo] of DENSIDADES) {
  const pasta = join(resAndroid, `mipmap-${densidade}`);
  try {
    mkdirSync(pasta, { recursive: true });
    writeFileSync(join(pasta, 'ic_launcher.png'), png(ARTE, PALETA, legado));
    writeFileSync(join(pasta, 'ic_launcher_round.png'), png(ARTE, PALETA, legado));
    // O primeiro plano adaptativo precisa de margem: o Android corta as bordas.
    writeFileSync(join(pasta, 'ic_launcher_foreground.png'), png(ARTE, PALETA, adaptativo, 0.25));
    feitosAndroid++;
  } catch {
    /* o projecto Android pode não existir nesta máquina */
  }
}

console.log(`Ícones web gerados. Densidades Android: ${feitosAndroid}.`);
