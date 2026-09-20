/**
 * Gera os ícones da Serpente — favicon da página e lançador Android — a partir
 * de uma grelha 16x16. Mesma maquinaria do outro jogo, arte própria.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DENSIDADES, png, svg } from './lib/icones.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const FUNDO = '#070c17';
const PALETA = {
  '.': [7, 12, 23, 255],
  v: [15, 122, 92, 255],
  V: [46, 209, 149, 255],
  h: [201, 255, 232, 255],
  e: [4, 32, 26, 255],
  o: [255, 196, 107, 255],
};

// A serpente enrolada em gancho: a cauda afunila em baixo, o corpo sobe pela
// esquerda, atravessa o topo e sai numa cabeça que passa além do corpo — é o
// que a faz ler como serpente e não como letra. A comida fica no vão, à frente.
const ARTE = [
  '................',
  '................',
  '...VVVVVVVV.....',
  '...VVVVVVVV.....',
  '...VV...hhhhh...',
  '...VV...hehhh...',
  '...VV...hhhhh...',
  '...VV...........',
  '...vv..ooo......',
  '...vv..ooo......',
  '...vv..ooo......',
  '...vv...........',
  '...vvvvvvvv.....',
  '....vvvvvv......',
  '.....vvvv.......',
  '................',
];

// --- Favicon da página -------------------------------------------------------
const pastaWeb = join(raiz, 'src', 'serpente');
mkdirSync(pastaWeb, { recursive: true });
writeFileSync(join(pastaWeb, 'icone.svg'), svg(ARTE, PALETA, FUNDO));

// --- Android -----------------------------------------------------------------
const res = join(raiz, 'serpente-app', 'android', 'app', 'src', 'main', 'res');
let feitos = 0;
for (const [densidade, legado, adaptativo] of DENSIDADES) {
  const pasta = join(res, `mipmap-${densidade}`);
  try {
    mkdirSync(pasta, { recursive: true });
    writeFileSync(join(pasta, 'ic_launcher.png'), png(ARTE, PALETA, legado));
    writeFileSync(join(pasta, 'ic_launcher_round.png'), png(ARTE, PALETA, legado));
    // O primeiro plano adaptativo precisa de margem: o Android corta as bordas.
    writeFileSync(join(pasta, 'ic_launcher_foreground.png'), png(ARTE, PALETA, adaptativo, 0.25));
    feitos++;
  } catch {
    /* o projecto Android pode não existir nesta máquina */
  }
}

console.log(`Favicon da Serpente gerado. Densidades Android: ${feitos}.`);
