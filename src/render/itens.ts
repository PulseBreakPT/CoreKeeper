/**
 * Ícones de item em pixel art, com o mesmo tratamento das criaturas: contorno
 * fechado, sombreado que segue a forma, matiz desviada e um ponto especular.
 *
 * Desenhados a 48 píxeis — o dobro do tile — porque é a esta escala que se
 * vêem na mochila, e é aí que a falta de detalhe dá mais nas vistas.
 */

import { rampa, type Paleta } from './paleta';
import {
  brilho, caixa, elipse, marca, membro, poligono, volume, type Caminho, type Ctx,
} from './pixel';

export const TAMANHO_ITEM = 48;

type PintorItem = (c: Ctx, s: number, p: Paleta, v: number) => void;

const MADEIRA = rampa('#7a5330');
const COURO = rampa('#5a3a22');
const PEDRA = rampa('#6b6b78');
const VIDRO = rampa('#8fb8cc');

/** Cabo com enrolamento de couro, comum a quase todas as armas. */
function cabo(c: Ctx, s: number, x: number, y: number, w: number, h: number): void {
  volume(c, s, MADEIRA, caixa(x, y, w, h, w * 0.3), { textura: 'pelo', seed: 2, semBrilho: true });
  for (let i = 0; i < 3; i++) {
    marca(c, s, caixa(x - 0.01, y + h * (0.25 + i * 0.2), w + 0.02, h * 0.1, 0.01), COURO.base);
    marca(c, s, caixa(x - 0.01, y + h * (0.25 + i * 0.2), w + 0.02, h * 0.035, 0.01), COURO.claro);
  }
}

/** Marca de gume: uma linha clara ao longo da aresta cortante. */
function gume(c: Ctx, s: number, caminho: Caminho, p: Paleta): void {
  marca(c, s, caminho, p.acento, 0.75);
}

/**
 * Selos dos fragmentos do Núcleo. Todos cabem na mesma pedra, mas a forma
 * interior muda: é assim que se distinguem seis relíquias da mesma cor.
 */
const SELOS_FRAGMENTO: ((c: Ctx, s: number, p: Paleta) => void)[] = [
  // Fome — a mordida de Goruun.
  (c, s) => {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const largura = 0.22;
      marca(c, s, poligono([
        [0.5 + Math.cos(a - largura) * 0.2, 0.52 + Math.sin(a - largura) * 0.2],
        [0.5 + Math.cos(a + largura) * 0.2, 0.52 + Math.sin(a + largura) * 0.2],
        [0.5 + Math.cos(a) * 0.08, 0.52 + Math.sin(a) * 0.08],
      ]), '#efe6d0', 0.95);
    }
    marca(c, s, elipse(0.5, 0.52, 0.07, 0.07), '#2a0d08');
  },
  // Crescimento — o rebento da Mother Below.
  (c, s, p) => {
    membro(c, s, [[0.5, 0.74], [0.5, 0.5], [0.5, 0.36]], 0.04, p, 'contorno');
    marca(c, s, elipse(0.38, 0.5, 0.09, 0.05), p.claro, 0.9);
    marca(c, s, elipse(0.62, 0.42, 0.09, 0.05), p.claro, 0.9);
    marca(c, s, elipse(0.5, 0.34, 0.05, 0.06), '#ffffff', 0.8);
  },
  // Domínio — a coroa de Varkan.
  (c, s, p) => {
    marca(c, s, poligono([
      [0.34, 0.62], [0.34, 0.42], [0.42, 0.52], [0.5, 0.36], [0.58, 0.52], [0.66, 0.42], [0.66, 0.62],
    ]), p.contorno);
    marca(c, s, poligono([
      [0.37, 0.59], [0.37, 0.48], [0.43, 0.56], [0.5, 0.43], [0.57, 0.56], [0.63, 0.48], [0.63, 0.59],
    ]), '#ffffff', 0.75);
  },
  // Movimento — não fica quieto na mochila.
  (c, s, p) => {
    for (let i = 0; i < 3; i++) {
      marca(c, s, caixa(0.28 + i * 0.04, 0.38 + i * 0.12, 0.36 - i * 0.07, 0.055, 0.02), '#efe6d0', 1 - i * 0.22);
    }
    marca(c, s, poligono([[0.62, 0.36], [0.78, 0.52], [0.62, 0.68]]), p.acento, 0.95);
  },
  // Visão — o olho de Nereth.
  (c, s, p) => {
    marca(c, s, poligono([[0.28, 0.52], [0.5, 0.38], [0.72, 0.52], [0.5, 0.66]]), p.contorno);
    marca(c, s, elipse(0.5, 0.52, 0.09, 0.09), '#ffffff', 0.9);
    marca(c, s, elipse(0.5, 0.52, 0.045, 0.045), '#0a0812');
  },
  // Memória — as voltas que o Hollow Giant não largou.
  (c, s, p) => {
    for (let i = 3; i >= 1; i--) {
      marca(c, s, elipse(0.5, 0.52, 0.05 * i, 0.05 * i), i % 2 ? p.contorno : '#ffffff', 0.85);
    }
  },
];

/**
 * Adornos por conjunto de armadura. A base da peça é a mesma — o que muda é a
 * crista, os respiradouros ou os espigões, que é o que o olho apanha primeiro.
 */
interface Adorno {
  elmo: (c: Ctx, s: number, p: Paleta) => void;
  peito: (c: Ctx, s: number, p: Paleta) => void;
  pernas: (c: Ctx, s: number, p: Paleta) => void;
}

const ADORNOS: Adorno[] = [
  // Delver — lanterna de mineiro e cinto de ferramentas.
  {
    elmo: (c, s, p) => {
      volume(c, s, p, caixa(0.38, 0.06, 0.24, 0.12, 0.03), { textura: 'metal', seed: 100 });
      brilho(c, s, 0.5, 0.12, 0.2, `${p.acento}88`, 0.8);
      marca(c, s, elipse(0.5, 0.12, 0.05, 0.05), '#fff3c8', 0.9);
    },
    peito: (c, s, p) => {
      marca(c, s, caixa(0.2, 0.62, 0.6, 0.09, 0.02), COURO.base);
      marca(c, s, caixa(0.44, 0.61, 0.12, 0.11, 0.02), p.claro);
      marca(c, s, caixa(0.26, 0.72, 0.08, 0.1, 0.02), p.escuro, 0.8);
    },
    pernas: (c, s) => {
      marca(c, s, caixa(0.24, 0.62, 0.18, 0.08, 0.02), COURO.base);
      marca(c, s, caixa(0.58, 0.62, 0.18, 0.08, 0.02), COURO.base);
      marca(c, s, caixa(0.26, 0.64, 0.14, 0.025, 0.01), COURO.claro);
      marca(c, s, caixa(0.6, 0.64, 0.14, 0.025, 0.01), COURO.claro);
    },
  },
  // Mycel — chapéus de cogumelo e esporos.
  {
    elmo: (c, s, p) => {
      volume(c, s, p, elipse(0.5, 0.14, 0.24, 0.12), { textura: 'gosma', seed: 101 });
      for (const [x, y] of [[0.36, 0.12], [0.5, 0.08], [0.64, 0.13]] as [number, number][]) {
        marca(c, s, elipse(x, y, 0.035, 0.028), p.claro, 0.9);
      }
    },
    peito: (c, s, p) => {
      for (const [x, y, r] of [[0.32, 0.4, 0.06], [0.68, 0.46, 0.05], [0.42, 0.7, 0.045]] as [number, number, number][]) {
        marca(c, s, elipse(x, y, r, r * 0.8), p.acento, 0.8);
        marca(c, s, elipse(x, y - r * 0.3, r * 0.5, r * 0.35), p.claro, 0.8);
      }
    },
    pernas: (c, s, p) => {
      for (const x of [0.28, 0.62]) {
        marca(c, s, elipse(x + 0.04, 0.66, 0.06, 0.045), p.acento, 0.8);
        marca(c, s, elipse(x + 0.04, 0.78, 0.04, 0.03), p.claro, 0.7);
      }
    },
  },
  // Forgemaster — chaminés e brasa viva.
  {
    elmo: (c, s, p) => {
      for (const x of [0.3, 0.62]) volume(c, s, p, caixa(x, 0.04, 0.09, 0.14, 0.02), { textura: 'metal', seed: 102 });
      brilho(c, s, 0.345, 0.06, 0.14, '#ffb15a99', 0.8);
      brilho(c, s, 0.665, 0.06, 0.14, '#ffb15a99', 0.8);
      marca(c, s, caixa(0.24, 0.66, 0.52, 0.05, 0.02), p.acento, 0.8);
    },
    peito: (c, s, p) => {
      brilho(c, s, 0.5, 0.52, 0.3, '#ff9a3c66', 0.8);
      for (let i = 0; i < 3; i++) marca(c, s, caixa(0.3 + i * 0.16, 0.64, 0.1, 0.14, 0.02), '#2a1410');
      for (let i = 0; i < 3; i++) marca(c, s, caixa(0.31 + i * 0.16, 0.7, 0.08, 0.07, 0.02), p.acento, 0.85);
    },
    pernas: (c, s, p) => {
      for (const x of [0.24, 0.58]) {
        marca(c, s, caixa(x + 0.02, 0.62, 0.16, 0.05, 0.02), '#2a1410');
        marca(c, s, caixa(x + 0.02, 0.72, 0.16, 0.05, 0.02), p.acento, 0.8);
      }
    },
  },
  // Stormwalker — barbatanas de descarga.
  {
    elmo: (c, s, p) => {
      volume(c, s, p, poligono([[0.5, 0.16], [0.56, 0.0], [0.6, 0.16]]), { textura: 'liso', seed: 103 });
      volume(c, s, p, poligono([[0.34, 0.2], [0.3, 0.04], [0.42, 0.18]]), { textura: 'liso', seed: 104 });
      marca(c, s, poligono([[0.5, 0.62], [0.58, 0.68], [0.5, 0.68], [0.56, 0.78]]), p.acento, 0.9);
    },
    peito: (c, s, p) => {
      marca(c, s, poligono([[0.46, 0.34], [0.58, 0.48], [0.5, 0.48], [0.58, 0.68], [0.42, 0.52], [0.5, 0.52]]), p.acento);
      volume(c, s, p, poligono([[0.16, 0.44], [0.24, 0.3], [0.28, 0.5]]), { textura: 'liso', seed: 105 });
      volume(c, s, p, poligono([[0.84, 0.44], [0.76, 0.3], [0.72, 0.5]]), { textura: 'liso', seed: 106 });
    },
    pernas: (c, s, p) => {
      for (const x of [0.2, 0.7]) volume(c, s, p, poligono([[x, 0.52], [x + 0.06, 0.38], [x + 0.1, 0.56]]), {
        textura: 'liso', seed: 107,
      });
      marca(c, s, poligono([[0.3, 0.6], [0.36, 0.68], [0.3, 0.68], [0.34, 0.78]]), p.acento, 0.9);
    },
  },
  // Abyss Diver — guelras e barbatanas.
  {
    elmo: (c, s, p) => {
      volume(c, s, p, elipse(0.5, 0.2, 0.3, 0.16), { textura: 'liso', seed: 108 });
      marca(c, s, elipse(0.5, 0.2, 0.22, 0.1), '#0c1a22', 0.8);
      marca(c, s, elipse(0.42, 0.17, 0.06, 0.035), '#ffffff', 0.35);
      for (let i = 0; i < 3; i++) marca(c, s, caixa(0.2, 0.52 + i * 0.07, 0.1, 0.03, 0.01), p.acento, 0.7);
    },
    peito: (c, s, p) => {
      for (let i = 0; i < 3; i++) {
        marca(c, s, caixa(0.26, 0.42 + i * 0.09, 0.14, 0.035, 0.015), p.contorno, 0.8);
        marca(c, s, caixa(0.6, 0.42 + i * 0.09, 0.14, 0.035, 0.015), p.contorno, 0.8);
      }
      volume(c, s, p, poligono([[0.5, 0.2], [0.58, 0.06], [0.54, 0.24]]), { textura: 'liso', seed: 109 });
    },
    pernas: (c, s, p) => {
      volume(c, s, p, poligono([[0.22, 0.86], [0.1, 0.94], [0.42, 0.9]]), { textura: 'liso', seed: 110 });
      volume(c, s, p, poligono([[0.78, 0.86], [0.9, 0.94], [0.58, 0.9]]), { textura: 'liso', seed: 111 });
    },
  },
  // Ossuary — osso por cima do metal.
  {
    elmo: (c, s, p) => {
      for (const [x, y, a] of [[0.24, 0.3, -0.5], [0.76, 0.3, 0.5]] as [number, number, number][]) {
        volume(c, s, p, poligono([
          [x, y], [x + Math.cos(a) * 0.16, y - 0.24], [x + Math.cos(a) * 0.05, y - 0.02],
        ]), { textura: 'osso', seed: 112 });
      }
      marca(c, s, poligono([[0.42, 0.66], [0.58, 0.66], [0.5, 0.78]]), p.claro, 0.8);
    },
    peito: (c, s, p) => {
      marca(c, s, caixa(0.47, 0.3, 0.06, 0.4, 0.02), p.claro, 0.85);
      for (let i = 0; i < 4; i++) {
        marca(c, s, caixa(0.3, 0.36 + i * 0.1, 0.4, 0.035, 0.015), p.claro, 0.7);
      }
      volume(c, s, p, poligono([[0.14, 0.3], [0.22, 0.14], [0.3, 0.32]]), { textura: 'osso', seed: 113 });
      volume(c, s, p, poligono([[0.86, 0.3], [0.78, 0.14], [0.7, 0.32]]), { textura: 'osso', seed: 114 });
    },
    pernas: (c, s, p) => {
      for (const x of [0.26, 0.6]) {
        marca(c, s, caixa(x + 0.04, 0.4, 0.05, 0.4, 0.02), p.claro, 0.75);
        marca(c, s, elipse(x + 0.065, 0.62, 0.055, 0.05), p.claro, 0.8);
      }
    },
  },
  // Veilwalker — halo de fase e dobra no contorno.
  {
    elmo: (c, s, p) => {
      brilho(c, s, 0.5, 0.36, 0.44, `${p.acento}55`, 0.7);
      c.save();
      c.strokeStyle = p.acento;
      c.globalAlpha = 0.8;
      c.lineWidth = Math.max(2, s * 0.035);
      c.beginPath();
      c.ellipse(0.5 * s, 0.2 * s, 0.32 * s, 0.1 * s, 0, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    },
    peito: (c, s, p) => {
      brilho(c, s, 0.5, 0.5, 0.42, `${p.acento}44`, 0.6);
      marca(c, s, poligono([[0.5, 0.3], [0.64, 0.5], [0.5, 0.7], [0.36, 0.5]]), p.acento, 0.55);
      marca(c, s, poligono([[0.5, 0.38], [0.58, 0.5], [0.5, 0.62], [0.42, 0.5]]), '#0a0812', 0.6);
    },
    pernas: (c, s, p) => {
      for (const x of [0.24, 0.58]) marca(c, s, poligono([
        [x + 0.02, 0.5], [x + 0.16, 0.56], [x + 0.02, 0.62],
      ]), p.acento, 0.6);
    },
  },
  // Starborn — coroa de estrela e nervuras acesas.
  {
    elmo: (c, s, p) => {
      brilho(c, s, 0.5, 0.12, 0.34, `${p.acento}88`, 0.9);
      marca(c, s, poligono([
        [0.5, 0.0], [0.56, 0.1], [0.68, 0.12], [0.58, 0.18], [0.5, 0.28],
        [0.42, 0.18], [0.32, 0.12], [0.44, 0.1],
      ]), p.acento);
      marca(c, s, elipse(0.5, 0.13, 0.04, 0.04), '#fff6d8', 0.9);
      marca(c, s, caixa(0.24, 0.64, 0.52, 0.04, 0.02), p.acento, 0.8);
    },
    peito: (c, s, p) => {
      brilho(c, s, 0.5, 0.48, 0.38, `${p.acento}66`, 0.8);
      marca(c, s, poligono([
        [0.5, 0.26], [0.57, 0.44], [0.74, 0.48], [0.57, 0.53], [0.5, 0.72],
        [0.43, 0.53], [0.26, 0.48], [0.43, 0.44],
      ]), p.acento);
      marca(c, s, elipse(0.5, 0.48, 0.05, 0.05), '#fff6d8', 0.9);
    },
    pernas: (c, s, p) => {
      for (const x of [0.24, 0.58]) {
        marca(c, s, caixa(x + 0.06, 0.38, 0.03, 0.44, 0.01), p.acento, 0.8);
        marca(c, s, elipse(x + 0.075, 0.6, 0.045, 0.045), '#fff6d8', 0.7);
      }
    },
  },
];

const PINTORES: Record<string, PintorItem> = {
  // --- Materiais -------------------------------------------------------------
  i_minerio: (c, s, p, v) => {
    // A pedra muda de recorte com o veio, para dez minérios não serem a mesma
    // pedra pintada de outra cor.
    const pedras: [number, number][][] = [
      [[0.16, 0.5], [0.3, 0.24], [0.62, 0.18], [0.84, 0.38], [0.8, 0.72], [0.5, 0.86], [0.22, 0.74]],
      [[0.12, 0.44], [0.34, 0.16], [0.7, 0.2], [0.88, 0.5], [0.72, 0.8], [0.34, 0.84], [0.16, 0.66]],
      [[0.2, 0.34], [0.52, 0.14], [0.86, 0.32], [0.9, 0.62], [0.62, 0.88], [0.26, 0.8], [0.12, 0.56]],
    ];
    volume(c, s, PEDRA, poligono(pedras[v % pedras.length]), { textura: 'crosta', seed: 4 + v });
    const talhe = v % 4;
    const veios: [number, number, number][] = talhe === 3
      ? [[0.34, 0.4, 0.07], [0.52, 0.3, 0.06], [0.66, 0.44, 0.06], [0.46, 0.6, 0.07], [0.66, 0.66, 0.05]]
      : [[0.38, 0.42, 0.1], [0.63, 0.36, 0.075], [0.54, 0.65, 0.085]];
    for (const [x, y, r] of veios) {
      const face = (escala: number): [number, number][] => {
        if (talhe === 0) return [[x, y - r * escala], [x + r * escala, y], [x, y + r * escala], [x - r * escala, y]];
        if (talhe === 1) {
          return [
            [x - r * 0.5 * escala, y - r * escala], [x + r * 0.5 * escala, y - r * escala],
            [x + r * escala, y], [x + r * 0.5 * escala, y + r * escala],
            [x - r * 0.5 * escala, y + r * escala], [x - r * escala, y],
          ];
        }
        if (talhe === 2) {
          return [
            [x, y - r * 1.25 * escala], [x + r * 0.7 * escala, y + r * 0.3 * escala],
            [x, y + r * escala], [x - r * 0.7 * escala, y + r * 0.3 * escala],
          ];
        }
        return [
          [x - r * 0.8 * escala, y - r * 0.6 * escala], [x + r * 0.8 * escala, y - r * escala],
          [x + r * 0.6 * escala, y + r * 0.8 * escala], [x - r * escala, y + r * 0.5 * escala],
        ];
      };
      marca(c, s, poligono(face(1)), p.contorno);
      marca(c, s, poligono(face(0.72)), p.base);
      marca(c, s, poligono([[x, y - r * 0.4], [x + r * 0.3, y - r * 0.1], [x - r * 0.2, y]]), p.acento);
    }
  },

  i_lingote: (c, s, p, v) => {
    // Face de cima e face da frente, como um lingote a sério.
    volume(c, s, p, poligono([[0.2, 0.44], [0.8, 0.44], [0.88, 0.72], [0.12, 0.72]]), { textura: 'metal', seed: 6 });
    volume(c, s, p, poligono([[0.28, 0.3], [0.72, 0.3], [0.8, 0.44], [0.2, 0.44]]), { textura: 'metal', seed: 7 });
    marca(c, s, caixa(0.3, 0.33, 0.3, 0.04, 0.02), p.acento, 0.6);
    marca(c, s, caixa(0.18, 0.66, 0.64, 0.05, 0.02), p.contorno, 0.4);
    // Marca de fundição: tantos entalhes quanto o nível do metal. Dá para
    // contar a olho qual é o lingote sem ler o nome.
    const entalhes = Math.min(5, (v % 10) + 1);
    for (let i = 0; i < entalhes; i++) {
      const x = 0.5 - (entalhes - 1) * 0.055 + i * 0.11;
      marca(c, s, caixa(x - 0.02, 0.5, 0.04, 0.1, 0.01), p.contorno, 0.55);
      marca(c, s, caixa(x - 0.012, 0.51, 0.024, 0.08, 0.01), p.acento, 0.7);
    }
    if (v >= 5) marca(c, s, caixa(0.22, 0.47, 0.56, 0.02, 0.01), p.claro, 0.45);
  },

  i_fragmento: (c, s, p) => {
    brilho(c, s, 0.5, 0.5, 0.45, `${p.acento}66`, 0.7);
    volume(c, s, p, poligono([[0.5, 0.08], [0.72, 0.36], [0.62, 0.84], [0.38, 0.84], [0.28, 0.36]]), {
      textura: 'liso', seed: 8,
    });
    marca(c, s, poligono([[0.5, 0.14], [0.62, 0.38], [0.5, 0.56], [0.4, 0.38]]), p.claro, 0.55);
    marca(c, s, caixa(0.46, 0.2, 0.04, 0.24, 0.02), '#ffffff', 0.55);
  },

  /** Fragmento do Núcleo: a mesma pedra, com o selo do poder que lhe arrancaram. */
  i_nucleo: (c, s, p, v) => {
    brilho(c, s, 0.5, 0.5, 0.5, `${p.acento}88`, 0.9);
    volume(c, s, p, poligono([[0.5, 0.06], [0.76, 0.34], [0.66, 0.88], [0.34, 0.88], [0.24, 0.34]]), {
      textura: 'liso', seed: 8,
    });
    marca(c, s, poligono([[0.5, 0.12], [0.66, 0.36], [0.5, 0.54], [0.36, 0.36]]), p.claro, 0.5);
    // Janela escura por baixo do selo: sem ela o selo desaparece no dourado.
    marca(c, s, elipse(0.5, 0.52, 0.24, 0.26), '#120c06', 0.85);
    const selo = SELOS_FRAGMENTO[v % SELOS_FRAGMENTO.length];
    if (selo) selo(c, s, p);
    marca(c, s, caixa(0.44, 0.14, 0.035, 0.18, 0.02), '#ffffff', 0.5);
  },

  i_cristal: (c, s, p) => {
    brilho(c, s, 0.5, 0.56, 0.42, `${p.acento}55`, 0.6);
    volume(c, s, p, poligono([[0.3, 0.9], [0.24, 0.5], [0.36, 0.34], [0.44, 0.52], [0.42, 0.9]]), { textura: 'liso' });
    volume(c, s, p, poligono([[0.58, 0.9], [0.56, 0.44], [0.68, 0.26], [0.78, 0.5], [0.72, 0.9]]), { textura: 'liso' });
    volume(c, s, p, poligono([[0.44, 0.92], [0.42, 0.34], [0.52, 0.12], [0.62, 0.36], [0.58, 0.92]]), { textura: 'liso' });
    marca(c, s, caixa(0.48, 0.2, 0.035, 0.34, 0.02), '#ffffff', 0.5);
  },

  i_placa: (c, s, p) => {
    volume(c, s, p, caixa(0.14, 0.24, 0.72, 0.52, 0.05), { textura: 'metal', seed: 9 });
    for (const [x, y] of [[0.22, 0.32], [0.72, 0.32], [0.22, 0.64], [0.72, 0.64]] as [number, number][]) {
      marca(c, s, elipse(x, y, 0.035, 0.035), p.contorno);
      marca(c, s, elipse(x - 0.008, y - 0.008, 0.018, 0.018), p.acento);
    }
    marca(c, s, caixa(0.2, 0.46, 0.6, 0.03, 0.01), p.claro, 0.5);
  },

  i_madeira: (c, s, p) => {
    volume(c, s, p, caixa(0.1, 0.34, 0.8, 0.34, 0.08), { textura: 'pelo', seed: 11 });
    // Topo do tronco, com anéis.
    volume(c, s, p, elipse(0.82, 0.51, 0.1, 0.17), { textura: 'liso', semBrilho: true });
    marca(c, s, elipse(0.82, 0.51, 0.06, 0.11), p.escuro);
    marca(c, s, elipse(0.82, 0.51, 0.03, 0.055), p.claro);
    marca(c, s, caixa(0.16, 0.42, 0.5, 0.03, 0.01), p.claro, 0.4);
    marca(c, s, caixa(0.2, 0.58, 0.42, 0.03, 0.01), p.escuro, 0.5);
  },

  i_fibra: (c, s, p) => {
    for (let i = 0; i < 5; i++) {
      const x = 0.22 + i * 0.14;
      const curva = (i % 2 ? 0.05 : -0.04);
      volume(c, s, p, poligono([
        [x - 0.035, 0.9], [x - 0.02 + curva, 0.5], [x + curva, 0.14], [x + 0.03 + curva, 0.5], [x + 0.035, 0.9],
      ]), { textura: 'liso', semBrilho: i % 2 === 0, seed: 12 + i });
    }
    marca(c, s, caixa(0.28, 0.66, 0.44, 0.09, 0.03), COURO.base);
    marca(c, s, caixa(0.28, 0.66, 0.44, 0.03, 0.02), COURO.claro);
  },

  i_po: (c, s, p) => {
    volume(c, s, p, poligono([
      [0.12, 0.8], [0.26, 0.56], [0.42, 0.66], [0.56, 0.5], [0.72, 0.62], [0.88, 0.8],
    ]), { textura: 'crosta', seed: 14 });
    for (const [x, y] of [[0.3, 0.42], [0.62, 0.36], [0.46, 0.28]] as [number, number][]) {
      marca(c, s, elipse(x, y, 0.035, 0.03), p.claro, 0.8);
    }
  },

  // --- Ferramentas e armas ---------------------------------------------------
  i_picareta: (c, s, p, v) => {
    cabo(c, s, 0.45, 0.24, 0.1, 0.66);
    // Cabeça em arco, com as duas pontas.
    volume(c, s, p, poligono([
      [0.06, 0.34], [0.2, 0.14], [0.5, 0.06], [0.8, 0.14], [0.94, 0.34],
      [0.82, 0.34], [0.66, 0.2], [0.34, 0.2], [0.18, 0.34],
    ]), { textura: 'metal', seed: 16 });
    gume(c, s, poligono([[0.08, 0.32], [0.2, 0.17], [0.24, 0.22], [0.14, 0.33]]), p);
    gume(c, s, poligono([[0.92, 0.32], [0.8, 0.17], [0.76, 0.22], [0.86, 0.33]]), p);
    marca(c, s, caixa(0.42, 0.18, 0.16, 0.1, 0.02), p.escuro);
    if (v === 0) {
      // Picareta de pedra: cabeça lascada e amarrada com fibra ao cabo.
      marca(c, s, poligono([[0.34, 0.2], [0.44, 0.26], [0.36, 0.3]]), p.escuro, 0.8);
      marca(c, s, poligono([[0.66, 0.2], [0.58, 0.28], [0.68, 0.3]]), p.escuro, 0.8);
      for (let i = 0; i < 3; i++) {
        marca(c, s, caixa(0.38, 0.24 + i * 0.07, 0.24, 0.035, 0.01), COURO.base);
        marca(c, s, caixa(0.38, 0.24 + i * 0.07, 0.24, 0.014, 0.01), COURO.claro);
      }
    } else {
      // Cabeça forjada: virola de metal e nervura ao centro.
      marca(c, s, caixa(0.4, 0.26, 0.2, 0.05, 0.02), p.claro, 0.6);
      marca(c, s, caixa(0.47, 0.3, 0.06, 0.22, 0.02), p.escuro, 0.7);
    }
  },

  i_espada: (c, s, p) => {
    // Lâmina com nervura central.
    volume(c, s, p, poligono([[0.5, 0.04], [0.6, 0.16], [0.6, 0.6], [0.4, 0.6], [0.4, 0.16]]), {
      textura: 'metal', seed: 17,
    });
    gume(c, s, caixa(0.41, 0.16, 0.03, 0.42, 0), p);
    marca(c, s, caixa(0.485, 0.1, 0.03, 0.46, 0), p.claro, 0.55);
    // Guarda e punho.
    volume(c, s, p, caixa(0.24, 0.6, 0.52, 0.09, 0.03), { textura: 'metal', seed: 18 });
    cabo(c, s, 0.45, 0.68, 0.1, 0.2);
    volume(c, s, p, elipse(0.5, 0.91, 0.08, 0.06), { textura: 'liso' });
  },

  i_machado: (c, s, p) => {
    cabo(c, s, 0.46, 0.2, 0.1, 0.72);
    volume(c, s, p, poligono([[0.46, 0.14], [0.14, 0.2], [0.06, 0.42], [0.2, 0.6], [0.46, 0.56]]), {
      textura: 'metal', seed: 19,
    });
    gume(c, s, poligono([[0.14, 0.2], [0.06, 0.42], [0.12, 0.44], [0.2, 0.24]]), p);
    volume(c, s, p, poligono([[0.54, 0.2], [0.76, 0.26], [0.78, 0.44], [0.54, 0.5]]), { textura: 'metal', seed: 20 });
  },

  i_martelo: (c, s, p) => {
    cabo(c, s, 0.45, 0.32, 0.1, 0.6);
    volume(c, s, p, caixa(0.12, 0.1, 0.76, 0.28, 0.05), { textura: 'metal', seed: 21 });
    marca(c, s, caixa(0.16, 0.14, 0.12, 0.2, 0.03), p.claro, 0.5);
    marca(c, s, caixa(0.72, 0.14, 0.12, 0.2, 0.03), p.escuro, 0.5);
    marca(c, s, caixa(0.4, 0.12, 0.2, 0.06, 0.02), p.acento, 0.5);
  },

  i_lanca: (c, s, p) => {
    cabo(c, s, 0.46, 0.3, 0.08, 0.64);
    volume(c, s, p, poligono([[0.5, 0.02], [0.66, 0.24], [0.56, 0.42], [0.44, 0.42], [0.34, 0.24]]), {
      textura: 'metal', seed: 22,
    });
    gume(c, s, poligono([[0.5, 0.05], [0.42, 0.24], [0.48, 0.34]]), p);
    volume(c, s, p, caixa(0.38, 0.4, 0.24, 0.06, 0.02), { textura: 'metal', seed: 23 });
  },

  i_arco: (c, s, p) => {
    // Braço do arco.
    c.save();
    c.strokeStyle = p.contorno;
    c.lineWidth = Math.max(3, s * 0.13);
    c.beginPath();
    c.arc(0.78 * s, 0.5 * s, 0.42 * s, Math.PI * 0.62, Math.PI * 1.38);
    c.stroke();
    c.strokeStyle = p.base;
    c.lineWidth = Math.max(2, s * 0.08);
    c.beginPath();
    c.arc(0.78 * s, 0.5 * s, 0.42 * s, Math.PI * 0.62, Math.PI * 1.38);
    c.stroke();
    c.strokeStyle = p.claro;
    c.lineWidth = Math.max(1, s * 0.03);
    c.beginPath();
    c.arc(0.79 * s, 0.5 * s, 0.44 * s, Math.PI * 0.7, Math.PI * 1.3);
    c.stroke();
    c.restore();
    // Corda e punho.
    marca(c, s, caixa(0.53, 0.12, 0.02, 0.76, 0), '#d8d2c4');
    volume(c, s, COURO, caixa(0.34, 0.42, 0.1, 0.18, 0.03), { textura: 'pelo', seed: 24, semBrilho: true });
  },

  i_canhao: (c, s, p) => {
    volume(c, s, p, caixa(0.1, 0.36, 0.62, 0.2, 0.05), { textura: 'metal', seed: 25 });
    volume(c, s, p, caixa(0.66, 0.38, 0.26, 0.16, 0.04), { textura: 'metal', seed: 26 });
    marca(c, s, elipse(0.92, 0.46, 0.05, 0.07), p.contorno);
    brilho(c, s, 0.92, 0.46, 0.22, `${p.acento}77`, 0.7);
    volume(c, s, COURO, poligono([[0.2, 0.54], [0.36, 0.54], [0.32, 0.86], [0.18, 0.86]]), {
      textura: 'pelo', seed: 27, semBrilho: true,
    });
    marca(c, s, caixa(0.2, 0.3, 0.26, 0.07, 0.02), p.escuro);
    marca(c, s, caixa(0.14, 0.4, 0.2, 0.04, 0.01), p.acento, 0.6);
  },

  i_carne: (c, s, p) => {
    // Naco com osso à vista: lê-se como carne mesmo em miniatura.
    volume(c, s, p, poligono([
      [0.24, 0.42], [0.42, 0.24], [0.7, 0.22], [0.86, 0.4], [0.82, 0.68], [0.56, 0.82], [0.3, 0.72],
    ]), { textura: 'gosma', seed: 93 });
    marca(c, s, poligono([[0.4, 0.36], [0.62, 0.32], [0.72, 0.48], [0.54, 0.62], [0.38, 0.54]]), p.claro, 0.45);
    marca(c, s, poligono([[0.46, 0.4], [0.6, 0.38], [0.64, 0.5], [0.5, 0.56]]), p.acento, 0.5);
    // Osso a sair pela ponta.
    volume(c, s, rampa('#d9d2be'), poligono([
      [0.22, 0.44], [0.1, 0.36], [0.04, 0.44], [0.12, 0.5], [0.04, 0.58], [0.12, 0.64], [0.24, 0.56],
    ]), { textura: 'osso', seed: 94 });
  },

  // --- Armas com silhueta própria ---------------------------------------------
  // Cada arma tem de se reconhecer pela forma, não pela cor: numa hotbar a
  // escurecer, a cor é a primeira coisa que se perde.

  i_cutelo: (c, s, p) => {
    cabo(c, s, 0.14, 0.52, 0.09, 0.38);
    // Lâmina larga de cutelo, com um golpe arrancado ao gume.
    volume(c, s, p, poligono([
      [0.2, 0.5], [0.3, 0.16], [0.86, 0.1], [0.9, 0.34], [0.74, 0.42], [0.86, 0.5], [0.82, 0.62], [0.24, 0.66],
    ]), { textura: 'metal', seed: 40 });
    gume(c, s, poligono([[0.32, 0.18], [0.84, 0.12], [0.84, 0.19], [0.33, 0.25]]), p);
    marca(c, s, elipse(0.3, 0.56, 0.035, 0.035), p.contorno);
    marca(c, s, elipse(0.44, 0.58, 0.035, 0.035), p.contorno);
    marca(c, s, poligono([[0.4, 0.22], [0.78, 0.18], [0.76, 0.3], [0.42, 0.34]]), p.escuro, 0.4);
  },

  i_picalamina: (c, s, p) => {
    cabo(c, s, 0.44, 0.34, 0.1, 0.6);
    // Meia picareta, meia lâmina: bico de um lado, gume do outro.
    volume(c, s, p, poligono([[0.44, 0.3], [0.3, 0.22], [0.06, 0.28], [0.22, 0.4], [0.44, 0.42]]), {
      textura: 'metal', seed: 41,
    });
    volume(c, s, p, poligono([[0.54, 0.3], [0.62, 0.06], [0.78, 0.1], [0.74, 0.36], [0.54, 0.42]]), {
      textura: 'metal', seed: 42,
    });
    gume(c, s, poligono([[0.64, 0.08], [0.76, 0.11], [0.72, 0.34], [0.66, 0.32]]), p);
    marca(c, s, caixa(0.4, 0.28, 0.18, 0.14, 0.03), p.escuro, 0.7);
  },

  i_presa: (c, s, p) => {
    // Lâmina orgânica: uma presa curva com nervura viva.
    volume(c, s, p, poligono([
      [0.52, 0.04], [0.68, 0.24], [0.66, 0.5], [0.56, 0.64], [0.42, 0.62], [0.4, 0.34],
    ]), { textura: 'osso', seed: 43 });
    gume(c, s, poligono([[0.52, 0.06], [0.42, 0.34], [0.46, 0.5], [0.5, 0.3]]), p);
    brilho(c, s, 0.53, 0.32, 0.26, `${p.acento}55`, 0.6);
    marca(c, s, poligono([[0.54, 0.12], [0.6, 0.3], [0.56, 0.52], [0.52, 0.32]]), p.acento, 0.7);
    // Punho de raiz, com uma folha agarrada.
    cabo(c, s, 0.44, 0.62, 0.11, 0.28);
    volume(c, s, p, poligono([[0.3, 0.62], [0.44, 0.58], [0.42, 0.7], [0.3, 0.72]]), { textura: 'pelo', seed: 44 });
    volume(c, s, p, elipse(0.68, 0.7, 0.08, 0.05), { textura: 'liso', seed: 45 });
  },

  i_sabre: (c, s, p) => {
    // Curva contínua: o sabre lê-se pelo arco, não pelo brilho.
    volume(c, s, p, poligono([
      [0.24, 0.1], [0.42, 0.08], [0.72, 0.3], [0.82, 0.58], [0.72, 0.66], [0.6, 0.4], [0.36, 0.2], [0.24, 0.18],
    ]), { textura: 'metal', seed: 46 });
    gume(c, s, poligono([[0.26, 0.11], [0.42, 0.1], [0.7, 0.32], [0.78, 0.54], [0.72, 0.5], [0.62, 0.34], [0.38, 0.16], [0.26, 0.15]]), p);
    // Guarda em concha e punho.
    volume(c, s, p, poligono([[0.66, 0.6], [0.86, 0.56], [0.9, 0.7], [0.72, 0.76]]), { textura: 'metal', seed: 47 });
    cabo(c, s, 0.5, 0.68, 0.1, 0.26);
    marca(c, s, elipse(0.55, 0.92, 0.07, 0.05), p.acento, 0.8);
  },

  i_alabarda: (c, s, p) => {
    cabo(c, s, 0.46, 0.2, 0.08, 0.76);
    // Crescente Kael numa haste longa.
    volume(c, s, p, poligono([
      [0.5, 0.02], [0.58, 0.14], [0.56, 0.3], [0.48, 0.36], [0.44, 0.18],
    ]), { textura: 'metal', seed: 48 });
    volume(c, s, p, poligono([
      [0.56, 0.1], [0.84, 0.16], [0.9, 0.36], [0.74, 0.3], [0.6, 0.3],
    ]), { textura: 'metal', seed: 49 });
    gume(c, s, poligono([[0.58, 0.12], [0.82, 0.18], [0.86, 0.3], [0.7, 0.24]]), p);
    volume(c, s, p, poligono([[0.24, 0.3], [0.44, 0.26], [0.44, 0.36], [0.28, 0.4]]), { textura: 'metal', seed: 50 });
    marca(c, s, caixa(0.42, 0.34, 0.16, 0.08, 0.02), p.acento, 0.6);
  },

  i_malho: (c, s, p) => {
    cabo(c, s, 0.44, 0.38, 0.12, 0.56);
    // Cabeça enorme de duas faces, com o núcleo de estrela ao centro.
    volume(c, s, p, poligono([
      [0.06, 0.26], [0.2, 0.1], [0.8, 0.1], [0.94, 0.26], [0.94, 0.4], [0.8, 0.54], [0.2, 0.54], [0.06, 0.4],
    ]), { textura: 'metal', seed: 51 });
    marca(c, s, caixa(0.1, 0.18, 0.12, 0.28, 0.03), p.claro, 0.4);
    marca(c, s, caixa(0.78, 0.18, 0.12, 0.28, 0.03), p.escuro, 0.5);
    brilho(c, s, 0.5, 0.32, 0.3, `${p.acento}88`, 0.9);
    marca(c, s, elipse(0.5, 0.32, 0.2, 0.19), '#1a0f04', 0.9);
    marca(c, s, poligono([
      [0.5, 0.12], [0.57, 0.27], [0.72, 0.32], [0.57, 0.37], [0.5, 0.52], [0.43, 0.37], [0.28, 0.32], [0.43, 0.27],
    ]), p.acento);
    marca(c, s, elipse(0.5, 0.32, 0.05, 0.05), '#fff6d8', 0.95);
  },

  i_nullblade: (c, s, p) => {
    // Lâmina que não reflecte: o interior é vazio, só o contorno a define.
    volume(c, s, p, poligono([[0.5, 0.02], [0.62, 0.18], [0.6, 0.62], [0.4, 0.62], [0.38, 0.18]]), {
      textura: 'liso', seed: 52, semBrilho: true,
    });
    marca(c, s, poligono([[0.5, 0.1], [0.57, 0.22], [0.56, 0.58], [0.44, 0.58], [0.43, 0.22]]), '#07060c');
    marca(c, s, caixa(0.487, 0.12, 0.026, 0.46, 0), p.acento, 0.85);
    gume(c, s, poligono([[0.5, 0.04], [0.61, 0.2], [0.6, 0.3], [0.5, 0.12]]), p);
    // Guarda em anel partido.
    volume(c, s, p, poligono([[0.26, 0.6], [0.74, 0.6], [0.7, 0.72], [0.3, 0.72]]), { textura: 'metal', seed: 53 });
    marca(c, s, elipse(0.5, 0.66, 0.06, 0.04), '#07060c');
    cabo(c, s, 0.45, 0.72, 0.1, 0.2);
    brilho(c, s, 0.5, 0.36, 0.34, `${p.acento}44`, 0.6);
  },

  // --- Ferramentas com silhueta própria ---------------------------------------

  i_broca: (c, s, p) => {
    cabo(c, s, 0.2, 0.52, 0.12, 0.34);
    // Corpo com respiradouros e ponta em espiral.
    volume(c, s, p, caixa(0.12, 0.3, 0.44, 0.26, 0.06), { textura: 'metal', seed: 54 });
    for (let i = 0; i < 3; i++) marca(c, s, caixa(0.18 + i * 0.1, 0.34, 0.05, 0.18, 0.02), p.escuro, 0.7);
    brilho(c, s, 0.34, 0.43, 0.22, `${p.acento}66`, 0.7);
    volume(c, s, p, poligono([[0.56, 0.32], [0.92, 0.4], [0.92, 0.47], [0.56, 0.54]]), { textura: 'metal', seed: 55 });
    for (let i = 0; i < 4; i++) {
      marca(c, s, poligono([
        [0.6 + i * 0.08, 0.34], [0.66 + i * 0.08, 0.36], [0.64 + i * 0.08, 0.52], [0.58 + i * 0.08, 0.5],
      ]), i % 2 ? p.claro : p.escuro, 0.6);
    }
  },

  i_perfurador: (c, s, p) => {
    cabo(c, s, 0.16, 0.5, 0.12, 0.36);
    // Verruma de osso: três lâminas helicoidais à volta do eixo.
    volume(c, s, p, caixa(0.1, 0.32, 0.3, 0.24, 0.05), { textura: 'osso', seed: 56 });
    volume(c, s, p, poligono([[0.4, 0.36], [0.96, 0.43], [0.96, 0.48], [0.4, 0.54]]), { textura: 'osso', seed: 57 });
    for (let i = 0; i < 5; i++) {
      const x = 0.44 + i * 0.1;
      marca(c, s, poligono([[x, 0.3], [x + 0.06, 0.4], [x + 0.03, 0.42], [x - 0.03, 0.32]]), p.claro, 0.85);
      marca(c, s, poligono([[x, 0.6], [x + 0.06, 0.5], [x + 0.03, 0.48], [x - 0.03, 0.58]]), p.escuro, 0.85);
    }
    marca(c, s, elipse(0.24, 0.44, 0.05, 0.05), p.acento, 0.8);
  },

  i_laser: (c, s, p) => {
    // Emissor com lente: o foco de atenção é a lente acesa.
    volume(c, s, p, caixa(0.1, 0.34, 0.46, 0.24, 0.06), { textura: 'metal', seed: 58 });
    volume(c, s, p, poligono([[0.56, 0.3], [0.8, 0.36], [0.8, 0.56], [0.56, 0.62]]), { textura: 'metal', seed: 59 });
    for (let i = 0; i < 3; i++) marca(c, s, caixa(0.16 + i * 0.12, 0.26, 0.07, 0.1, 0.02), p.escuro);
    brilho(c, s, 0.86, 0.46, 0.3, `${p.acento}aa`, 1);
    marca(c, s, elipse(0.85, 0.46, 0.09, 0.11), p.contorno);
    marca(c, s, elipse(0.85, 0.46, 0.06, 0.08), p.acento);
    marca(c, s, elipse(0.83, 0.43, 0.025, 0.035), '#ffffff', 0.9);
    volume(c, s, COURO, poligono([[0.2, 0.56], [0.34, 0.56], [0.3, 0.84], [0.18, 0.84]]), {
      textura: 'pelo', seed: 60, semBrilho: true,
    });
  },

  i_extractor: (c, s, p) => {
    // Garra de três dedos com um anel de fase suspenso à frente.
    volume(c, s, p, caixa(0.08, 0.38, 0.34, 0.2, 0.05), { textura: 'metal', seed: 61 });
    volume(c, s, COURO, poligono([[0.16, 0.56], [0.3, 0.56], [0.26, 0.82], [0.14, 0.82]]), {
      textura: 'pelo', seed: 62, semBrilho: true,
    });
    for (const [y0, y1] of [[0.3, 0.2], [0.48, 0.48], [0.66, 0.76]] as [number, number][]) {
      membro(c, s, [[0.42, 0.48], [0.58, y0], [0.72, y1]], 0.07, p, 'base');
    }
    brilho(c, s, 0.76, 0.48, 0.3, `${p.acento}88`, 0.9);
    c.save();
    c.strokeStyle = p.acento;
    c.lineWidth = Math.max(2, s * 0.05);
    c.globalAlpha = 0.85;
    c.beginPath();
    c.ellipse(0.78 * s, 0.48 * s, 0.14 * s, 0.2 * s, 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  },

  i_mao: (c, s, p) => {
    // Manápula dos Architects. O Nullstone não reflecte luz, por isso o corpo
    // é aço escuro e a pedra fica só no sigilo — de outra forma a mão some-se.
    const aco = rampa('#4a4a58');
    brilho(c, s, 0.5, 0.52, 0.6, `${p.acento}33`, 0.6);
    for (let i = 0; i < 4; i++) {
      volume(c, s, aco, caixa(0.24 + i * 0.13, 0.06, 0.1, 0.24, 0.04), { textura: 'metal', seed: 64 + i });
      marca(c, s, caixa(0.25 + i * 0.13, 0.1, 0.08, 0.04, 0.02), p.acento, 0.55);
    }
    volume(c, s, aco, caixa(0.06, 0.38, 0.16, 0.26, 0.05), { textura: 'metal', seed: 68 });
    volume(c, s, aco, poligono([
      [0.26, 0.9], [0.2, 0.48], [0.3, 0.28], [0.7, 0.28], [0.8, 0.48], [0.74, 0.9],
    ]), { textura: 'metal', seed: 63 });
    marca(c, s, caixa(0.24, 0.34, 0.52, 0.04, 0.02), p.acento, 0.5);
    marca(c, s, caixa(0.26, 0.82, 0.48, 0.05, 0.02), '#0a0812', 0.7);
    // Sigilo na palma: o único sítio onde o Nullstone aparece a sério.
    brilho(c, s, 0.5, 0.58, 0.32, `${p.acento}aa`, 1);
    marca(c, s, elipse(0.5, 0.58, 0.15, 0.15), '#08060e');
    marca(c, s, elipse(0.5, 0.58, 0.1, 0.1), p.acento);
    marca(c, s, elipse(0.47, 0.55, 0.035, 0.035), '#ffffff', 0.7);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      marca(c, s, elipse(0.5 + Math.cos(a) * 0.19, 0.58 + Math.sin(a) * 0.19, 0.024, 0.024), p.acento, 0.85);
    }
  },

  // --- Armas à distância ------------------------------------------------------

  i_besta: (c, s, p) => {
    // Coronha larga em baixo, braços grossos em cima: silhueta de besta, não de arco.
    volume(c, s, COURO, poligono([[0.42, 0.36], [0.58, 0.36], [0.62, 0.92], [0.38, 0.92]]), {
      textura: 'pelo', seed: 69, semBrilho: true,
    });
    volume(c, s, COURO, poligono([[0.3, 0.62], [0.42, 0.58], [0.44, 0.74], [0.32, 0.8]]), {
      textura: 'pelo', seed: 70, semBrilho: true,
    });
    // Braços, com espinhos a sair das pontas.
    volume(c, s, p, poligono([[0.04, 0.16], [0.46, 0.32], [0.44, 0.46], [0.06, 0.32]]), { textura: 'liso', seed: 71 });
    volume(c, s, p, poligono([[0.96, 0.16], [0.54, 0.32], [0.56, 0.46], [0.94, 0.32]]), { textura: 'liso', seed: 72 });
    for (const [x, y, dx] of [[0.12, 0.26, -1], [0.88, 0.26, 1]] as [number, number, number][]) {
      volume(c, s, p, poligono([
        [x, y], [x + dx * 0.12, y - 0.16], [x + dx * 0.16, y + 0.02], [x + dx * 0.04, y + 0.06],
      ]), { textura: 'liso', seed: 73 });
    }
    // Corda e virote encaixado no carril.
    marca(c, s, poligono([[0.06, 0.3], [0.5, 0.44], [0.94, 0.3], [0.94, 0.34], [0.5, 0.5], [0.06, 0.34]]), '#e2dbc8');
    marca(c, s, caixa(0.47, 0.18, 0.06, 0.3, 0.01), p.escuro);
    volume(c, s, p, poligono([[0.5, 0.04], [0.58, 0.2], [0.42, 0.2]]), { textura: 'liso', seed: 74 });
    marca(c, s, poligono([[0.44, 0.44], [0.56, 0.44], [0.5, 0.56]]), p.acento, 0.8);
  },

  i_rebitadora: (c, s, p) => {
    // Curta e gorda, com carregador por baixo: lê-se como pistola pesada.
    volume(c, s, p, caixa(0.14, 0.3, 0.56, 0.24, 0.06), { textura: 'metal', seed: 73 });
    volume(c, s, p, caixa(0.7, 0.34, 0.22, 0.16, 0.04), { textura: 'metal', seed: 74 });
    marca(c, s, elipse(0.9, 0.42, 0.04, 0.06), p.contorno);
    volume(c, s, p, caixa(0.3, 0.52, 0.18, 0.3, 0.03), { textura: 'metal', seed: 75 });
    for (let i = 0; i < 3; i++) marca(c, s, caixa(0.32, 0.56 + i * 0.08, 0.14, 0.04, 0.01), p.acento, 0.7);
    volume(c, s, COURO, poligono([[0.16, 0.52], [0.28, 0.52], [0.24, 0.8], [0.12, 0.8]]), {
      textura: 'pelo', seed: 76, semBrilho: true,
    });
    marca(c, s, caixa(0.2, 0.24, 0.3, 0.07, 0.02), p.escuro);
    brilho(c, s, 0.9, 0.42, 0.2, `${p.acento}66`, 0.6);
  },

  i_espingarda: (c, s, p) => {
    // Longa, com coronha e bobinas: silhueta de espingarda a sério.
    volume(c, s, p, caixa(0.28, 0.4, 0.58, 0.13, 0.03), { textura: 'metal', seed: 77 });
    volume(c, s, COURO, poligono([[0.04, 0.44], [0.3, 0.38], [0.3, 0.56], [0.08, 0.64]]), {
      textura: 'pelo', seed: 78, semBrilho: true,
    });
    for (let i = 0; i < 3; i++) {
      volume(c, s, p, caixa(0.46 + i * 0.13, 0.32, 0.08, 0.26, 0.02), { textura: 'metal', seed: 79 + i });
      marca(c, s, caixa(0.47 + i * 0.13, 0.34, 0.06, 0.05, 0.01), p.acento, 0.8);
    }
    marca(c, s, caixa(0.86, 0.42, 0.1, 0.08, 0.02), p.contorno);
    brilho(c, s, 0.92, 0.46, 0.2, `${p.acento}77`, 0.7);
    volume(c, s, p, poligono([[0.34, 0.52], [0.44, 0.52], [0.42, 0.72], [0.34, 0.72]]), { textura: 'metal', seed: 82 });
    marca(c, s, caixa(0.36, 0.34, 0.08, 0.06, 0.02), p.claro, 0.6);
  },

  i_jacto: (c, s, p) => {
    // Lança de pressão: garrafa atrás, bico estreito à frente.
    volume(c, s, p, elipse(0.2, 0.56, 0.16, 0.2), { textura: 'metal', seed: 83 });
    marca(c, s, caixa(0.1, 0.46, 0.2, 0.05, 0.02), p.claro, 0.5);
    marca(c, s, elipse(0.2, 0.56, 0.07, 0.1), p.acento, 0.6);
    volume(c, s, p, caixa(0.3, 0.42, 0.34, 0.16, 0.04), { textura: 'metal', seed: 84 });
    volume(c, s, p, poligono([[0.64, 0.44], [0.9, 0.48], [0.9, 0.53], [0.64, 0.57]]), { textura: 'metal', seed: 85 });
    volume(c, s, p, poligono([[0.88, 0.46], [0.98, 0.5], [0.88, 0.55]]), { textura: 'liso', seed: 86 });
    brilho(c, s, 0.96, 0.5, 0.22, `${p.acento}99`, 0.9);
    volume(c, s, COURO, poligono([[0.38, 0.56], [0.5, 0.56], [0.46, 0.82], [0.34, 0.82]]), {
      textura: 'pelo', seed: 87, semBrilho: true,
    });
    for (let i = 0; i < 3; i++) marca(c, s, caixa(0.34 + i * 0.1, 0.38, 0.06, 0.05, 0.01), p.escuro);
  },

  i_bastao: (c, s, p) => {
    // Bastão: haste longa e uma estrela presa no topo por três garras.
    cabo(c, s, 0.45, 0.32, 0.1, 0.62);
    for (const dx of [-0.13, 0, 0.13]) {
      membro(c, s, [[0.5 + dx * 0.4, 0.34], [0.5 + dx, 0.22], [0.5 + dx * 1.2, 0.12]], 0.06, p, 'base');
    }
    brilho(c, s, 0.5, 0.2, 0.34, `${p.acento}99`, 1);
    volume(c, s, p, poligono([
      [0.5, 0.02], [0.58, 0.16], [0.74, 0.2], [0.58, 0.25], [0.5, 0.4], [0.42, 0.25], [0.26, 0.2], [0.42, 0.16],
    ]), { textura: 'liso', seed: 88 });
    marca(c, s, elipse(0.5, 0.2, 0.05, 0.05), '#fff6d8', 0.9);
    marca(c, s, elipse(0.5, 0.86, 0.07, 0.05), p.acento, 0.7);
  },

  i_chave: (c, s, p) => {
    // Chave dos Architects: geometria, não dentes de serralheiro.
    brilho(c, s, 0.5, 0.5, 0.56, `${p.acento}33`, 0.6);
    brilho(c, s, 0.5, 0.3, 0.32, `${p.acento}77`, 0.8);
    volume(c, s, p, poligono([
      [0.5, 0.06], [0.68, 0.18], [0.68, 0.4], [0.5, 0.52], [0.32, 0.4], [0.32, 0.18],
    ]), { textura: 'metal', seed: 89 });
    marca(c, s, poligono([[0.5, 0.16], [0.6, 0.22], [0.6, 0.36], [0.5, 0.42], [0.4, 0.36], [0.4, 0.22]]), '#0a0812');
    marca(c, s, elipse(0.5, 0.29, 0.06, 0.06), p.acento);
    volume(c, s, p, caixa(0.45, 0.5, 0.1, 0.44, 0.02), { textura: 'metal', seed: 90 });
    volume(c, s, p, caixa(0.55, 0.64, 0.16, 0.08, 0.02), { textura: 'metal', seed: 91 });
    volume(c, s, p, caixa(0.55, 0.8, 0.12, 0.08, 0.02), { textura: 'metal', seed: 92 });
    marca(c, s, caixa(0.47, 0.54, 0.03, 0.36, 0.01), p.claro, 0.4);
  },

  // --- Armaduras -------------------------------------------------------------
  i_elmo: (c, s, p, v) => {
    volume(c, s, p, poligono([
      [0.2, 0.8], [0.16, 0.42], [0.32, 0.16], [0.68, 0.16], [0.84, 0.42], [0.8, 0.8],
    ]), { textura: 'metal', seed: 28 });
    // Fenda dos olhos, com luz lá dentro.
    marca(c, s, caixa(0.24, 0.46, 0.52, 0.14, 0.03), '#0d0a14');
    marca(c, s, caixa(0.28, 0.5, 0.16, 0.06, 0.02), p.acento, 0.8);
    marca(c, s, caixa(0.56, 0.5, 0.16, 0.06, 0.02), p.acento, 0.8);
    // Crista.
    volume(c, s, p, poligono([[0.46, 0.14], [0.5, 0.02], [0.54, 0.14]]), { textura: 'liso' });
    marca(c, s, caixa(0.2, 0.72, 0.6, 0.06, 0.02), p.escuro, 0.6);
    ADORNOS[v % ADORNOS.length]?.elmo(c, s, p);
  },

  i_peitoral: (c, s, p, v) => {
    volume(c, s, p, poligono([
      [0.18, 0.28], [0.36, 0.2], [0.64, 0.2], [0.82, 0.28], [0.78, 0.84], [0.22, 0.84],
    ]), { textura: 'metal', seed: 29 });
    // Ombreiras.
    volume(c, s, p, poligono([[0.1, 0.34], [0.26, 0.24], [0.3, 0.42], [0.14, 0.48]]), { textura: 'metal', seed: 30 });
    volume(c, s, p, poligono([[0.9, 0.34], [0.74, 0.24], [0.7, 0.42], [0.86, 0.48]]), { textura: 'metal', seed: 31 });
    marca(c, s, poligono([[0.4, 0.2], [0.6, 0.2], [0.5, 0.36]]), p.contorno);
    marca(c, s, caixa(0.24, 0.56, 0.52, 0.05, 0.02), p.escuro, 0.7);
    marca(c, s, elipse(0.5, 0.48, 0.07, 0.07), p.acento, 0.7);
    ADORNOS[v % ADORNOS.length]?.peito(c, s, p);
  },

  i_grevas: (c, s, p, v) => {
    volume(c, s, p, caixa(0.2, 0.16, 0.6, 0.18, 0.05), { textura: 'metal', seed: 32 });
    volume(c, s, p, poligono([[0.22, 0.34], [0.44, 0.34], [0.42, 0.86], [0.24, 0.86]]), { textura: 'metal', seed: 33 });
    volume(c, s, p, poligono([[0.56, 0.34], [0.78, 0.34], [0.76, 0.86], [0.58, 0.86]]), { textura: 'metal', seed: 34 });
    marca(c, s, caixa(0.24, 0.5, 0.18, 0.05, 0.02), p.acento, 0.6);
    marca(c, s, caixa(0.58, 0.5, 0.18, 0.05, 0.02), p.acento, 0.6);
    ADORNOS[v % ADORNOS.length]?.pernas(c, s, p);
  },

  // --- Comida ----------------------------------------------------------------
  i_fruto: (c, s, p) => {
    brilho(c, s, 0.5, 0.6, 0.35, `${p.acento}44`, 0.5);
    volume(c, s, p, elipse(0.5, 0.6, 0.3, 0.29), { textura: 'liso', seed: 35 });
    marca(c, s, caixa(0.47, 0.18, 0.06, 0.16, 0.02), MADEIRA.base);
    volume(c, s, rampa('#4f8246'), poligono([[0.53, 0.24], [0.8, 0.16], [0.74, 0.32]]), {
      textura: 'liso', semBrilho: true,
    });
  },

  i_raiz: (c, s, p) => {
    volume(c, s, p, poligono([
      [0.42, 0.9], [0.36, 0.5], [0.44, 0.22], [0.58, 0.22], [0.64, 0.52], [0.58, 0.9],
    ]), { textura: 'pelo', seed: 36 });
    marca(c, s, poligono([[0.36, 0.44], [0.16, 0.36], [0.34, 0.52]]), p.escuro);
    marca(c, s, poligono([[0.64, 0.6], [0.84, 0.54], [0.64, 0.68]]), p.escuro);
    volume(c, s, rampa('#4f8246'), poligono([[0.44, 0.22], [0.36, 0.06], [0.52, 0.16]]), {
      textura: 'liso', semBrilho: true,
    });
    volume(c, s, rampa('#4f8246'), poligono([[0.56, 0.2], [0.68, 0.04], [0.62, 0.2]]), {
      textura: 'liso', semBrilho: true,
    });
  },

  i_bolo: (c, s, p) => {
    volume(c, s, p, caixa(0.14, 0.42, 0.72, 0.36, 0.06), { textura: 'crosta', seed: 37 });
    volume(c, s, p, caixa(0.18, 0.28, 0.64, 0.18, 0.06), { textura: 'liso', seed: 38 });
    marca(c, s, caixa(0.22, 0.34, 0.56, 0.05, 0.02), p.acento, 0.6);
    for (const [x, y] of [[0.3, 0.56], [0.52, 0.62], [0.68, 0.54]] as [number, number][]) {
      marca(c, s, elipse(x, y, 0.04, 0.035), p.escuro);
    }
  },

  i_baga: (c, s, p) => {
    for (const [x, y, r] of [[0.34, 0.62, 0.15], [0.64, 0.56, 0.13], [0.5, 0.78, 0.13]] as [number, number, number][]) {
      volume(c, s, p, elipse(x, y, r, r), { textura: 'liso', seed: 39 });
      marca(c, s, elipse(x - r * 0.3, y - r * 0.35, r * 0.25, r * 0.2), '#ffffff', 0.45);
    }
    marca(c, s, caixa(0.47, 0.22, 0.05, 0.24, 0.02), MADEIRA.base);
    volume(c, s, rampa('#4f8246'), poligono([[0.52, 0.28], [0.76, 0.18], [0.7, 0.34]]), {
      textura: 'liso', semBrilho: true,
    });
  },

  i_alga: (c, s, p) => {
    for (let i = 0; i < 3; i++) {
      const x = 0.28 + i * 0.22;
      volume(c, s, p, poligono([
        [x - 0.06, 0.92], [x - 0.09, 0.6], [x + 0.02, 0.3], [x + 0.1, 0.12],
        [x + 0.12, 0.34], [x + 0.04, 0.62], [x + 0.06, 0.92],
      ]), { textura: 'liso', seed: 40 + i, semBrilho: i !== 1 });
    }
    marca(c, s, elipse(0.38, 0.46, 0.04, 0.04), p.acento, 0.8);
    marca(c, s, elipse(0.62, 0.34, 0.035, 0.035), p.acento, 0.8);
  },

  i_tigela: (c, s, p) => {
    volume(c, s, PEDRA, poligono([[0.14, 0.46], [0.86, 0.46], [0.74, 0.82], [0.26, 0.82]]), {
      textura: 'crosta', seed: 42,
    });
    volume(c, s, p, elipse(0.5, 0.46, 0.36, 0.1), { textura: 'gosma', seed: 43 });
    marca(c, s, elipse(0.38, 0.44, 0.08, 0.03), p.claro, 0.6);
    // Vapor.
    marca(c, s, caixa(0.36, 0.2, 0.04, 0.12, 0.02), '#ffffff', 0.18);
    marca(c, s, caixa(0.56, 0.14, 0.04, 0.16, 0.02), '#ffffff', 0.14);
  },

  i_frasco: (c, s, p) => {
    volume(c, s, MADEIRA, caixa(0.4, 0.06, 0.2, 0.1, 0.03), { textura: 'pelo', seed: 44, semBrilho: true });
    volume(c, s, VIDRO, poligono([
      [0.42, 0.16], [0.58, 0.16], [0.58, 0.32], [0.76, 0.56], [0.72, 0.9], [0.28, 0.9], [0.24, 0.56], [0.42, 0.32],
    ]), { textura: 'liso', seed: 45 });
    // Líquido lá dentro.
    marca(c, s, poligono([[0.28, 0.6], [0.72, 0.6], [0.7, 0.86], [0.3, 0.86]]), p.base);
    marca(c, s, poligono([[0.28, 0.6], [0.72, 0.6], [0.71, 0.66], [0.29, 0.66]]), p.claro);
    brilho(c, s, 0.5, 0.74, 0.3, `${p.acento}55`, 0.6);
    marca(c, s, caixa(0.64, 0.34, 0.04, 0.3, 0.02), '#ffffff', 0.3);
  },

  i_estrela: (c, s, p) => {
    const pontos: [number, number][] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const raio = i % 2 === 0 ? 0.44 : 0.18;
      pontos.push([0.5 + Math.cos(a) * raio, 0.5 + Math.sin(a) * raio]);
    }
    brilho(c, s, 0.5, 0.5, 0.5, `${p.acento}77`, 0.8);
    volume(c, s, p, poligono(pontos), { textura: 'liso', seed: 46 });
    marca(c, s, elipse(0.44, 0.42, 0.07, 0.06), '#ffffff', 0.5);
  },

  i_cogumelo: (c, s, p) => {
    volume(c, s, rampa('#e8dcc8'), poligono([[0.42, 0.88], [0.4, 0.5], [0.6, 0.5], [0.58, 0.88]]), {
      textura: 'liso', seed: 47,
    });
    volume(c, s, p, poligono([
      [0.08, 0.5], [0.2, 0.24], [0.5, 0.12], [0.8, 0.24], [0.92, 0.5], [0.5, 0.58],
    ]), { textura: 'liso', seed: 48 });
    for (const [x, y, r] of [[0.32, 0.34, 0.06], [0.56, 0.28, 0.05], [0.7, 0.4, 0.045]] as [number, number, number][]) {
      marca(c, s, elipse(x, y, r, r * 0.85), p.acento);
      marca(c, s, elipse(x - r * 0.25, y - r * 0.25, r * 0.35, r * 0.3), '#ffffff', 0.45);
    }
    // Lamelas.
    for (let i = 0; i < 7; i++) marca(c, s, caixa(0.16 + i * 0.1, 0.5, 0.02, 0.06, 0), p.contorno, 0.5);
  },
};

const cache = new Map<string, HTMLCanvasElement>();

/** Ícone de um item, pintado uma vez e reutilizado. */
export function spriteItem(
  chave: string,
  p: Paleta,
  tamanho = TAMANHO_ITEM,
  variante = 0,
): HTMLCanvasElement {
  const k = `${chave}|${p.base}${p.acento}|${tamanho}|${variante}`;
  const existente = cache.get(k);
  if (existente) return existente;

  const canvas = document.createElement('canvas');
  canvas.width = tamanho;
  canvas.height = tamanho;
  const c = canvas.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  const pintor = PINTORES[chave];
  if (pintor) pintor(c, tamanho, p, variante);
  cache.set(k, canvas);
  return canvas;
}

export function temPintorItem(chave: string): boolean {
  return chave in PINTORES;
}

export function limparCacheItens(): void {
  cache.clear();
}
