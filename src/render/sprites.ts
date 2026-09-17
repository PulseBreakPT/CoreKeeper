/**
 * Motor de arte de The Hollow Star.
 *
 * Tudo é desenhado em código, a 32x32, com cinco tons por material:
 * contorno, sombra, base, luz e acento. Cada tile leva várias camadas de
 * ruído, fissuras, bisel e oclusão nos cantos — é isso que dá densidade.
 */

import { mulberry32 } from '../core/rng';
import { MINERAL, ORGANICO, paleta, ROCHA, type Paleta } from './paleta';

export const TILE = 32;

export type Pincel = (ctx: CanvasRenderingContext2D, v: number, p: Paleta) => void;

const NEUTRO = paleta('#15151c', '#3a3a48', '#5c5c70', '#8181a0', '#c9c9e8');
const cache = new Map<string, HTMLCanvasElement>();

// --- Primitivas --------------------------------------------------------------

function px(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cor: string): void {
  c.fillStyle = cor;
  c.fillRect(x, y, w, h);
}

/** Ruído granulado: a base da textura de pedra. */
function ruido(c: CanvasRenderingContext2D, seed: number, cores: string[], n: number, tam = 1, area = TILE): void {
  const r = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const t = tam === 1 ? (r() > 0.8 ? 2 : 1) : tam;
    px(c, Math.floor(r() * area), Math.floor(r() * area), t, t, cores[Math.floor(r() * cores.length)]);
  }
}

/** Bisel interno: luz em cima/esquerda, sombra em baixo/direita. */
function bisel(c: CanvasRenderingContext2D, p: Paleta, espessura = 3): void {
  px(c, 0, 0, TILE, espessura, p.claro);
  px(c, 0, 0, espessura, TILE, p.claro);
  px(c, 0, TILE - espessura, TILE, espessura, p.escuro);
  px(c, TILE - espessura, 0, espessura, TILE, p.escuro);
  // Canto oposto ao bisel fica mais escuro, como oclusão.
  px(c, TILE - espessura - 2, TILE - espessura - 2, 2, 2, p.contorno);
}

function contorno(c: CanvasRenderingContext2D, cor: string, esp = 1): void {
  px(c, 0, 0, TILE, esp, cor);
  px(c, 0, TILE - esp, TILE, esp, cor);
  px(c, 0, 0, esp, TILE, cor);
  px(c, TILE - esp, 0, esp, TILE, cor);
}

/** Fissuras: linhas quebradas que atravessam a rocha. */
function fissuras(c: CanvasRenderingContext2D, seed: number, cor: string, n = 2): void {
  const r = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    let x = 4 + Math.floor(r() * 24);
    let y = 3 + Math.floor(r() * 6);
    const passos = 5 + Math.floor(r() * 6);
    for (let s = 0; s < passos; s++) {
      px(c, x, y, 1, 2, cor);
      x += r() > 0.5 ? 1 : -1;
      y += 2;
      if (y > TILE - 4) break;
    }
  }
}

/** Riscos finos, para metal e vidro. */
function riscos(c: CanvasRenderingContext2D, seed: number, cor: string, n = 6): void {
  const r = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * TILE);
    const y = Math.floor(r() * TILE);
    const comp = 3 + Math.floor(r() * 8);
    if (r() > 0.5) px(c, x, y, comp, 1, cor);
    else px(c, x, y, 1, comp, cor);
  }
}

function rebites(c: CanvasRenderingContext2D, p: Paleta, margem = 4): void {
  for (const [x, y] of [
    [margem, margem],
    [TILE - margem - 2, margem],
    [margem, TILE - margem - 2],
    [TILE - margem - 2, TILE - margem - 2],
  ]) {
    px(c, x, y, 2, 2, p.contorno);
    px(c, x, y, 1, 1, p.acento);
  }
}

/** Cristais de minério encravados na rocha, com contorno e brilho especular. */
function gemas(c: CanvasRenderingContext2D, seed: number, p: Paleta, n = 4, tamanho = 5): void {
  const r = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const x = 4 + Math.floor(r() * (TILE - tamanho - 8));
    const y = 5 + Math.floor(r() * (TILE - tamanho - 10));
    const t = tamanho + (r() > 0.6 ? 1 : 0);
    // Contorno em losango.
    px(c, x + 1, y - 1, t - 2, 1, p.contorno);
    px(c, x - 1, y, t + 2, t, p.contorno);
    px(c, x + 1, y + t, t - 2, 1, p.contorno);
    // Corpo com dois tons + especular.
    px(c, x, y, t, t, p.escuro);
    px(c, x, y, t - 1, t - 2, p.base);
    px(c, x + 1, y + 1, Math.max(1, t - 3), Math.max(1, t - 4), p.claro);
    px(c, x + 1, y + 1, 1, 1, p.acento);
  }
}

/** Musgo pendurado no rebordo superior de um bloco. */
function musgoTopo(c: CanvasRenderingContext2D, seed: number, p: Paleta): void {
  const r = mulberry32(seed);
  for (let x = 0; x < TILE; x += 2) {
    if (r() > 0.55) continue;
    const h = 2 + Math.floor(r() * 5);
    px(c, x, 0, 2, h, p.base);
    px(c, x, 0, 1, Math.max(1, h - 1), p.claro);
    if (r() > 0.7) px(c, x, h, 1, 2, p.acento);
  }
}

/** Escurece progressivamente do centro para as bordas (oclusão falsa). */
function oclusao(c: CanvasRenderingContext2D, forca = 0.35): void {
  const g = c.createRadialGradient(TILE / 2, TILE / 2, TILE * 0.2, TILE / 2, TILE / 2, TILE * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${forca})`);
  c.fillStyle = g;
  c.fillRect(0, 0, TILE, TILE);
}

/** Brilho suave por cima de fontes de luz. */
function halo(c: CanvasRenderingContext2D, x: number, y: number, raio: number, cor: string): void {
  const g = c.createRadialGradient(x, y, 0, x, y, raio);
  g.addColorStop(0, cor);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(x - raio, y - raio, raio * 2, raio * 2);
}

// --- Arquétipos de parede ----------------------------------------------------

interface OpcoesRocha {
  musgo?: Paleta;
  veios?: Paleta;
  fissurasN?: number;
  grao?: number;
}

function rocha(p: Paleta, op: OpcoesRocha = {}): Pincel {
  return (c, v) => {
    px(c, 0, 0, TILE, TILE, p.base);
    ruido(c, 7001 + v * 131, [p.escuro, p.claro], op.grao ?? 120, 1);
    ruido(c, 7301 + v * 57, [p.escuro], 26, 2);
    ruido(c, 7601 + v * 89, [p.claro], 18, 2);
    if (op.veios) {
      const r = mulberry32(7901 + v * 17);
      for (let i = 0; i < 3; i++) {
        let x = Math.floor(r() * TILE);
        let y = Math.floor(r() * TILE);
        for (let s = 0; s < 10; s++) {
          px(c, x, y, 2, 1, op.veios.escuro);
          px(c, x, y, 1, 1, op.veios.base);
          x += r() > 0.5 ? 2 : -1;
          y += r() > 0.6 ? 1 : 0;
        }
      }
    }
    fissuras(c, 8101 + v * 43, p.contorno, op.fissurasN ?? 2);
    bisel(c, p, 3);
    if (op.musgo) musgoTopo(c, 8401 + v * 29, op.musgo);
    oclusao(c, 0.28);
    contorno(c, p.contorno, 1);
  };
}

function tijolo(p: Paleta, alturaTijolo = 8): Pincel {
  return (c, v) => {
    px(c, 0, 0, TILE, TILE, p.escuro);
    let linha = 0;
    for (let y = 0; y < TILE; y += alturaTijolo) {
      const desvio = linha % 2 === 0 ? 0 : 8;
      for (let x = -desvio; x < TILE; x += 16) {
        px(c, x + 1, y + 1, 14, alturaTijolo - 2, p.base);
        px(c, x + 1, y + 1, 14, 2, p.claro);
        px(c, x + 1, y + alturaTijolo - 3, 14, 1, p.escuro);
        ruido(c, 9001 + v * 31 + x * 7 + y * 13, [p.escuro, p.claro], 10);
      }
      linha++;
    }
    fissuras(c, 9301 + v * 11, p.contorno, 1);
    oclusao(c, 0.3);
    contorno(c, p.contorno, 1);
  };
}

function placaMetal(p: Paleta, op: { luz?: string; painel?: boolean } = {}): Pincel {
  return (c, v) => {
    px(c, 0, 0, TILE, TILE, p.base);
    // Gradiente vertical feito por bandas, para manter o look pixel.
    for (let y = 0; y < TILE; y += 2) {
      const t = y / TILE;
      px(c, 0, y, TILE, 2, t < 0.4 ? p.claro : t > 0.75 ? p.escuro : p.base);
    }
    riscos(c, 9601 + v * 23, p.claro, 10);
    riscos(c, 9701 + v * 37, p.escuro, 8);
    if (op.painel !== false) {
      px(c, 3, 3, TILE - 6, 1, p.escuro);
      px(c, 3, TILE - 4, TILE - 6, 1, p.escuro);
      px(c, 3, 3, 1, TILE - 6, p.escuro);
      px(c, TILE - 4, 3, 1, TILE - 6, p.escuro);
    }
    rebites(c, p, 5);
    if (op.luz) {
      px(c, 12, 14, 8, 3, op.luz);
      halo(c, 16, 15, 12, `${op.luz}55`);
    }
    oclusao(c, 0.32);
    contorno(c, p.contorno, 1);
  };
}

function vidro(p: Paleta, op: { brilho?: string } = {}): Pincel {
  return (c, v) => {
    px(c, 0, 0, TILE, TILE, p.escuro);
    px(c, 2, 2, TILE - 4, TILE - 4, p.base);
    // Reflexos diagonais.
    const r = mulberry32(9901 + v * 19);
    for (let i = 0; i < 3; i++) {
      const x = 2 + Math.floor(r() * 20);
      const comp = 6 + Math.floor(r() * 10);
      for (let s = 0; s < comp; s++) {
        px(c, x + s, 4 + s, 2, 1, p.claro);
      }
    }
    px(c, 4, 4, 6, 2, op.brilho ?? p.acento);
    px(c, 4, 4, 2, 8, op.brilho ?? p.acento);
    ruido(c, 10201 + v * 13, [p.claro, p.escuro], 20);
    oclusao(c, 0.22);
    contorno(c, p.contorno, 2);
  };
}

function osso(p: Paleta): Pincel {
  return (c, v) => {
    px(c, 0, 0, TILE, TILE, p.base);
    // Estrias verticais, como osso fossilizado.
    const r = mulberry32(10501 + v * 41);
    for (let x = 0; x < TILE; x += 3) {
      const tom = r() > 0.5 ? p.claro : p.escuro;
      px(c, x, 0, 2, TILE, tom);
    }
    ruido(c, 10801 + v * 23, [p.escuro, p.claro], 90);
    // Poros.
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(r() * (TILE - 4)) + 2;
      const y = Math.floor(r() * (TILE - 4)) + 2;
      px(c, x, y, 2, 2, p.contorno);
      px(c, x, y, 1, 1, p.escuro);
    }
    fissuras(c, 11101 + v * 7, p.contorno, 2);
    bisel(c, p, 2);
    oclusao(c, 0.3);
    contorno(c, p.contorno, 1);
  };
}

function organico(p: Paleta, op: { luz?: Paleta } = {}): Pincel {
  return (c, v) => {
    px(c, 0, 0, TILE, TILE, p.escuro);
    const r = mulberry32(11401 + v * 53);
    // Fibras entrelaçadas.
    for (let i = 0; i < 7; i++) {
      let x = Math.floor(r() * TILE);
      const largura = 2 + Math.floor(r() * 3);
      for (let y = 0; y < TILE; y += 2) {
        px(c, x, y, largura, 2, r() > 0.6 ? p.claro : p.base);
        x += r() > 0.5 ? 1 : -1;
        if (x < 0) x = 0;
        if (x > TILE - largura) x = TILE - largura;
      }
    }
    // Nós.
    for (let i = 0; i < 3; i++) {
      const x = 4 + Math.floor(r() * 22);
      const y = 4 + Math.floor(r() * 22);
      px(c, x, y, 5, 4, p.escuro);
      px(c, x + 1, y + 1, 3, 2, p.claro);
    }
    if (op.luz) {
      for (let i = 0; i < 4; i++) {
        const x = 3 + Math.floor(r() * 26);
        const y = 3 + Math.floor(r() * 26);
        px(c, x, y, 2, 2, op.luz.acento);
        halo(c, x + 1, y + 1, 7, `${op.luz.acento}44`);
      }
    }
    oclusao(c, 0.34);
    contorno(c, p.contorno, 1);
  };
}

function cristalBloco(p: Paleta): Pincel {
  return (c, v) => {
    px(c, 0, 0, TILE, TILE, ROCHA.slate.escuro);
    ruido(c, 11701 + v * 17, [ROCHA.slate.base, ROCHA.slate.contorno], 60);
    const r = mulberry32(11901 + v * 29);
    for (let i = 0; i < 5; i++) {
      const x = 3 + Math.floor(r() * 22);
      const alt = 8 + Math.floor(r() * 14);
      const larg = 3 + Math.floor(r() * 3);
      const y = TILE - alt - Math.floor(r() * 6);
      px(c, x - 1, y, larg + 2, alt, p.contorno);
      px(c, x, y + 1, larg, alt - 1, p.base);
      px(c, x, y + 1, 1, alt - 2, p.claro);
      px(c, x, y + 1, larg, 2, p.claro);
      px(c, x + 1, y + 2, 1, 2, p.acento);
      halo(c, x + larg / 2, y + alt / 2, 12, `${p.acento}33`);
    }
    contorno(c, p.contorno, 1);
  };
}

function minerio(base: Pincel, gema: Paleta, brilhante = false): Pincel {
  return (c, v, p) => {
    base(c, v, p);
    gemas(c, 12201 + v * 61, gema, 4 + (v % 2), 5);
    if (brilhante) {
      const r = mulberry32(12501 + v * 13);
      for (let i = 0; i < 2; i++) {
        halo(c, 6 + r() * 20, 6 + r() * 20, 11, `${gema.acento}3a`);
      }
    }
  };
}

// --- Chãos -------------------------------------------------------------------

function chaoRocha(p: Paleta, op: { pedras?: boolean; musgo?: Paleta } = {}): Pincel {
  return (c, v) => {
    px(c, 0, 0, TILE, TILE, p.escuro);
    ruido(c, 13001 + v * 71, [p.base, p.contorno], 150, 1);
    ruido(c, 13301 + v * 37, [p.base], 40, 2);
    if (op.pedras !== false) {
      const r = mulberry32(13601 + v * 19);
      for (let i = 0; i < 5; i++) {
        const x = Math.floor(r() * 26) + 2;
        const y = Math.floor(r() * 26) + 2;
        const t = 2 + Math.floor(r() * 3);
        px(c, x, y, t, t, p.contorno);
        px(c, x, y, t - 1, t - 1, p.base);
        px(c, x, y, 1, 1, p.claro);
      }
    }
    if (op.musgo) {
      const r = mulberry32(13901 + v * 11);
      for (let i = 0; i < 8; i++) {
        const x = Math.floor(r() * 28);
        const y = Math.floor(r() * 28);
        px(c, x, y, 3, 2, op.musgo.escuro);
        px(c, x, y, 2, 1, op.musgo.base);
      }
    }
  };
}

function chaoGrelha(p: Paleta): Pincel {
  return (c, v) => {
    px(c, 0, 0, TILE, TILE, p.escuro);
    const desvio = (v % 2) * 4;
    for (let y = -desvio; y < TILE; y += 8) {
      for (let x = -desvio; x < TILE; x += 8) {
        px(c, x, y, 7, 7, p.base);
        px(c, x, y, 7, 1, p.claro);
        px(c, x + 2, y + 2, 3, 3, p.contorno);
      }
    }
    riscos(c, 14201 + v * 23, p.claro, 6);
    ruido(c, 14501 + v * 17, [p.escuro], 30);
  };
}

function chaoAreia(p: Paleta): Pincel {
  return (c, v) => {
    px(c, 0, 0, TILE, TILE, p.base);
    ruido(c, 14801 + v * 43, [p.escuro, p.claro], 170, 1);
    // Ondulações.
    const r = mulberry32(15101 + v * 29);
    for (let i = 0; i < 4; i++) {
      let y = Math.floor(r() * TILE);
      for (let x = 0; x < TILE; x += 2) {
        px(c, x, y, 2, 1, p.claro);
        px(c, x, y + 1, 2, 1, p.escuro);
        if (r() > 0.7) y += r() > 0.5 ? 1 : -1;
      }
    }
  };
}

function chaoVidro(p: Paleta): Pincel {
  return (c, v) => {
    px(c, 0, 0, TILE, TILE, p.escuro);
    const r = mulberry32(15401 + v * 31);
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(r() * 26);
      const y = Math.floor(r() * 26);
      const w = 4 + Math.floor(r() * 7);
      const h = 3 + Math.floor(r() * 6);
      px(c, x, y, w, h, p.base);
      px(c, x, y, w, 1, p.claro);
      px(c, x, y, 1, h, p.claro);
    }
    riscos(c, 15701 + v * 13, p.acento, 5);
  };
}

function chaoLiquido(p: Paleta, espuma: string): Pincel {
  return (c, v) => {
    px(c, 0, 0, TILE, TILE, p.base);
    for (let y = 0; y < TILE; y += 2) {
      px(c, 0, y, TILE, 1, y % 8 < 4 ? p.escuro : p.base);
    }
    const desl = v * 6;
    for (let i = 0; i < 3; i++) {
      const y = (i * 11 + desl) % TILE;
      px(c, (i * 9 + desl) % TILE, y, 10, 2, p.claro);
      px(c, (i * 13 + desl * 2) % TILE, (y + 6) % TILE, 6, 1, espuma);
    }
    oclusao(c, 0.25);
  };
}

/**
 * Chão de placas metálicas. Só desenha costura em dois lados e muda o detalhe
 * por variante, para não aparecer uma grelha repetida no ecrã.
 */
function chaoPlacas(p: Paleta, op: { luz?: string } = {}): Pincel {
  return (c, v) => {
    px(c, 0, 0, TILE, TILE, p.base);
    // Sem gradiente por tile: era isso que fazia aparecer um xadrez no ecrã.
    riscos(c, 16001 + v * 19, p.claro, 6);
    riscos(c, 16301 + v * 7, p.escuro, 5);
    ruido(c, 16601 + v * 13, [p.escuro, p.claro], 45);

    // Costura só ocasional: as placas parecem grandes e contínuas.
    if (v === 0) px(c, 0, 0, TILE, 1, p.escuro);
    if (v === 2) px(c, 0, 0, 1, TILE, p.escuro);
    if (v === 1) {
      px(c, 0, 16, TILE, 1, p.escuro);
      rebites(c, p, 5);
    }
    if (op.luz && v % 4 === 2) {
      px(c, 5, TILE - 7, TILE - 10, 2, op.luz);
      halo(c, TILE / 2, TILE - 6, 15, `${op.luz}33`);
    }
  };
}

function chaoVeil(p: Paleta): Pincel {
  return (c, v) => {
    px(c, 0, 0, TILE, TILE, p.escuro);
    const r = mulberry32(16301 + v * 41);
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(r() * TILE);
      const y = Math.floor(r() * TILE);
      px(c, x, y, 2, 2, r() > 0.6 ? p.base : p.claro);
    }
    // Glifos dos Architects.
    for (let i = 0; i < 2; i++) {
      const x = 5 + Math.floor(r() * 18);
      const y = 5 + Math.floor(r() * 18);
      px(c, x, y, 7, 1, p.acento);
      px(c, x + 3, y, 1, 7, p.acento);
      px(c, x, y + 6, 4, 1, p.acento);
      halo(c, x + 3, y + 3, 10, `${p.acento}28`);
    }
    oclusao(c, 0.3);
  };
}

// --- Registo de blocos e chãos ----------------------------------------------

const DESENHOS: Record<string, Pincel> = {
  // Chãos
  g_po: chaoRocha(ROCHA.duststone, { musgo: ROCHA.rootmass }),
  g_ardosia: chaoRocha(ROCHA.slate),
  g_esporo: chaoRocha(ROCHA.rootmass, { musgo: ROCHA.lumibark }),
  g_micelio: chaoRocha(ROCHA.micelio, { musgo: ROCHA.micelio }),
  g_grelha: chaoGrelha(ROCHA.maquina),
  g_cinza: chaoRocha(ROCHA.slag, { pedras: true }),
  g_areia: chaoAreia(ROCHA.areia),
  g_vidro: chaoVidro(ROCHA.vidro),
  g_mare: chaoRocha(ROCHA.mare, { musgo: ROCHA.coral }),
  g_agua: chaoLiquido(ROCHA.mare, '#9fe4ff'),
  g_fundido: chaoLiquido(paleta('#2a0a04', '#7a1c06', '#c43b0c', '#ff7a1c', '#ffd27a'), '#ffe9a8'),
  g_fossil: chaoRocha(ROCHA.osso),
  g_kael: chaoPlacas(ROCHA.kael, { luz: '#6de0ff' }),
  g_veu: chaoVeil(ROCHA.veil),
  g_lajes: chaoPlacas(ROCHA.slate),
  g_rele: chaoPlacas(ROCHA.nulo, { luz: '#c9a227' }),

  // Paredes naturais
  b_duststone: rocha(ROCHA.duststone, { musgo: ROCHA.rootmass, grao: 130 }),
  b_slate: rocha(ROCHA.slate, { fissurasN: 3 }),
  b_argila: rocha(ROCHA.argila, { grao: 90 }),
  b_ironroot: organico(ROCHA.raiz),
  b_rootmass: organico(ROCHA.rootmass, { luz: ROCHA.lumibark }),
  b_lumibark: organico(ROCHA.lumibark, { luz: ROCHA.lumibark }),
  b_micelio: organico(ROCHA.micelio, { luz: ROCHA.micelio }),
  b_forgebrick: tijolo(ROCHA.forgebrick),
  b_slagstone: rocha(ROCHA.slag, { veios: MINERAL.emberiron }),
  b_machineplate: placaMetal(ROCHA.maquina, { luz: '#6de0ff' }),
  b_shatterglass: vidro(ROCHA.vidro),
  b_stormsand: rocha(ROCHA.areia, { veios: MINERAL.stormglass, grao: 150 }),
  b_mirrorstone: vidro(ROCHA.espelho, { brilho: '#ffffff' }),
  b_tidebrick: tijolo(ROCHA.mare),
  b_coralstone: rocha(ROCHA.coral, { musgo: ROCHA.coral }),
  b_pressureglass: vidro(ROCHA.mare, { brilho: '#b6ffff' }),
  b_bonewall: osso(ROCHA.osso),
  b_marrowstone: osso(ROCHA.medula),
  b_nervecrystal: cristalBloco(MINERAL.abysspearl),
  b_kaelwall: placaMetal(ROCHA.kael, { luz: '#6de0ff' }),
  b_kaelglass: vidro(ROCHA.kael, { brilho: '#6de0ff' }),
  b_veilstone: rocha(ROCHA.veil, { veios: MINERAL.veilstone, fissurasN: 3 }),
  b_phaseglass: vidro(ROCHA.veil, { brilho: '#d5a8ff' }),
  b_echoblock: placaMetal(ROCHA.veil, { luz: '#b79bff', painel: true }),
  b_nullstone: rocha(ROCHA.nulo, { fissurasN: 1, grao: 60 }),

  // Minérios
  b_ferrite: minerio(rocha(ROCHA.duststone), MINERAL.ferrite),
  b_tinshade: minerio(rocha(ROCHA.duststone), MINERAL.tinshade),
  b_verdglass: minerio(rocha(ROCHA.rootmass), MINERAL.verdglass, true),
  b_emberiron: minerio(rocha(ROCHA.slag), MINERAL.emberiron, true),
  b_kaelite: minerio(rocha(ROCHA.maquina), MINERAL.kaelite, true),
  b_palesilver: minerio(rocha(ROCHA.slate), MINERAL.palesilver),
  b_stormglass: minerio(rocha(ROCHA.areia), MINERAL.stormglass, true),
  b_abysspearl: minerio(rocha(ROCHA.mare), MINERAL.abysspearl, true),
  b_ossium: minerio(osso(ROCHA.osso), MINERAL.ossium),
  b_veilstoneore: minerio(rocha(ROCHA.veil), MINERAL.veilstone, true),
  b_starshard: minerio(rocha(ROCHA.veil), MINERAL.starshard, true),
  b_nullstoneore: minerio(rocha(ROCHA.nulo), MINERAL.nullstone),
  b_livingcrystal: cristalBloco(MINERAL.cristal),
};

// --- Flora e objectos --------------------------------------------------------

DESENHOS.b_glowmoss = (c, v) => {
  const p = ROCHA.lumibark;
  const r = mulberry32(17001 + v * 13);
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(r() * 28);
    const y = 12 + Math.floor(r() * 18);
    const h = 3 + Math.floor(r() * 6);
    px(c, x, y, 2, h, p.base);
    px(c, x, y, 1, h - 1, p.claro);
    px(c, x, y - 1, 2, 1, p.acento);
  }
  halo(c, 16, 22, 16, '#7ce0a833');
};

DESENHOS.b_sporecap = (c, v) => {
  const p = ORGANICO.spore;
  px(c, 14, 18, 4, 12, '#e8dcc8');
  px(c, 14, 18, 2, 11, '#fff4e2');
  px(c, 7, 9, 18, 9, p.contorno);
  px(c, 8, 10, 16, 7, p.base);
  px(c, 9, 10, 14, 3, p.claro);
  px(c, 12, 12, 3, 2, p.acento);
  px(c, 18, 14, 2, 2, p.acento);
  if (v % 2) {
    px(c, 22, 22, 3, 8, '#e8dcc8');
    px(c, 19, 17, 9, 5, p.base);
  }
  halo(c, 16, 14, 14, `${p.acento}30`);
};

DESENHOS.b_thornvine = (c, v) => {
  const p = ROCHA.rootmass;
  const r = mulberry32(17301 + v * 19);
  for (let i = 0; i < 5; i++) {
    let x = 3 + Math.floor(r() * 26);
    for (let y = TILE - 1; y > 6; y -= 2) {
      px(c, x, y, 2, 2, r() > 0.5 ? p.base : p.claro);
      x += r() > 0.5 ? 1 : -1;
    }
    px(c, x, 5, 2, 3, p.acento);
  }
};

DESENHOS.b_ambersap = (c, v) => {
  const p = ORGANICO.seiva;
  px(c, 0, 0, TILE, TILE, ROCHA.raiz.base);
  ruido(c, 17601 + v * 7, [ROCHA.raiz.escuro, ROCHA.raiz.claro], 80);
  px(c, 9, 7, 14, 18, p.contorno);
  px(c, 10, 8, 12, 16, p.base);
  px(c, 11, 9, 6, 8, p.claro);
  px(c, 12, 10, 2, 3, p.acento);
  halo(c, 16, 16, 14, `${p.acento}33`);
  contorno(c, ROCHA.raiz.contorno, 1);
};

DESENHOS.b_torch = (c, v) => {
  px(c, 14, 14, 4, 18, ROCHA.raiz.base);
  px(c, 14, 14, 2, 17, ROCHA.raiz.claro);
  const osc = (v % 3) - 1;
  px(c, 11 + osc, 6, 10, 10, '#ff7a1c');
  px(c, 13 + osc, 2, 6, 8, '#ffb347');
  px(c, 14 + osc, 4, 4, 5, '#ffe9a8');
  px(c, 15 + osc, 5, 2, 3, '#ffffff');
  halo(c, 16 + osc, 9, 20, '#ff9c3c55');
};

DESENHOS.b_glowlamp = (c, v) => {
  const p = ROCHA.lumibark;
  px(c, 8, 20, 16, 10, ROCHA.maquina.escuro);
  px(c, 9, 21, 14, 8, ROCHA.maquina.base);
  px(c, 10, 8, 12, 14, p.contorno);
  px(c, 11, 9, 10, 12, p.base);
  px(c, 12, 10, 8, 9, p.acento);
  px(c, 13, 11, 3, 4, '#ffffff');
  halo(c, 16, 15, 18, `#7ce0a8${v % 2 ? '55' : '44'}`);
};

DESENHOS.b_stormlamp = (c, v) => {
  const p = MINERAL.stormglass;
  px(c, 11, 24, 10, 6, ROCHA.maquina.base);
  px(c, 9, 6, 14, 20, ROCHA.maquina.escuro);
  px(c, 11, 8, 10, 16, p.base);
  px(c, 12, 9, 8, 14, p.claro);
  if (v % 2) px(c, 14, 10, 3, 12, p.acento);
  else px(c, 16, 12, 2, 10, p.acento);
  rebites(c, ROCHA.maquina, 6);
  halo(c, 16, 16, 20, `${p.acento}4a`);
};

DESENHOS.b_starbeacon = (c, v) => {
  const p = MINERAL.starshard;
  px(c, 8, 22, 16, 8, ROCHA.nulo.base);
  px(c, 9, 23, 14, 6, ROCHA.nulo.claro);
  px(c, 13, 10, 6, 14, p.escuro);
  px(c, 14, 6, 4, 18, p.base);
  px(c, 15, 4 - (v % 2), 2, 20, p.claro);
  px(c, 15, 8, 2, 4, '#ffffff');
  halo(c, 16, 12, 24, `${p.acento}55`);
};

DESENHOS.b_workbench = (c) => {
  const m = ROCHA.raiz;
  px(c, 2, 10, 28, 16, m.escuro);
  px(c, 2, 10, 28, 4, m.claro);
  px(c, 3, 14, 26, 10, m.base);
  for (let x = 4; x < 30; x += 6) px(c, x, 14, 1, 10, m.escuro);
  px(c, 4, 26, 5, 5, m.escuro);
  px(c, 23, 26, 5, 5, m.escuro);
  // Ferramentas em cima.
  px(c, 6, 11, 10, 2, MINERAL.ferrite.base);
  px(c, 6, 10, 3, 4, MINERAL.ferrite.claro);
  px(c, 19, 10, 2, 5, ROCHA.raiz.claro);
  px(c, 17, 9, 7, 2, MINERAL.tinshade.base);
  contorno(c, m.contorno, 1);
};

DESENHOS.b_forge = (c, v) => {
  const m = ROCHA.forgebrick;
  px(c, 1, 4, 30, 27, m.escuro);
  px(c, 2, 5, 28, 6, m.claro);
  px(c, 3, 11, 26, 18, m.base);
  for (let y = 11; y < 29; y += 6) px(c, 3, y, 26, 1, m.escuro);
  // Boca da forja.
  px(c, 9, 14, 14, 14, ROCHA.nulo.contorno);
  px(c, 10, 17, 12, 11, v % 2 ? '#ff7a1c' : '#e0620f');
  px(c, 12, 21, 8, 7, '#ffb347');
  px(c, 14, 24, 4, 4, '#ffe9a8');
  halo(c, 16, 23, 18, '#ff8a2455');
  // Chaminé.
  px(c, 6, 1, 6, 5, ROCHA.maquina.base);
  contorno(c, m.contorno, 1);
};

DESENHOS.b_foundry = (c, v) => {
  const m = ROCHA.maquina;
  px(c, 3, 12, 26, 9, m.escuro);
  px(c, 2, 10, 28, 4, m.claro);
  px(c, 5, 21, 6, 10, m.base);
  px(c, 21, 21, 6, 10, m.base);
  px(c, 11, 21, 10, 4, m.escuro);
  // Arco eléctrico.
  const p = MINERAL.stormglass;
  px(c, 8, 8, 16, 2, p.base);
  if (v % 2) {
    px(c, 12, 5, 2, 5, p.acento);
    px(c, 18, 6, 2, 4, p.claro);
  } else {
    px(c, 15, 4, 2, 6, p.acento);
  }
  halo(c, 16, 8, 16, `${p.acento}44`);
  rebites(c, m, 5);
  contorno(c, m.contorno, 1);
};

DESENHOS.b_hearth = (c, v) => {
  const m = ROCHA.slate;
  px(c, 2, 12, 28, 19, m.escuro);
  px(c, 3, 13, 26, 5, m.claro);
  px(c, 4, 18, 24, 12, m.base);
  px(c, 8, 20, 16, 10, ROCHA.nulo.contorno);
  px(c, 10, 24, 12, 6, v % 2 ? '#ff8a24' : '#e8700f');
  px(c, 12, 26, 8, 4, '#ffd27a');
  // Panela.
  px(c, 10, 8, 12, 8, ROCHA.maquina.escuro);
  px(c, 9, 7, 14, 3, ROCHA.maquina.claro);
  px(c, 11, 10, 10, 4, ORGANICO.caldo.base);
  px(c, 13, 4 - (v % 2), 3, 3, '#ffffff22');
  halo(c, 16, 25, 16, '#ff8a2444');
};

DESENHOS.b_fabricator = (c, v) => {
  const m = ROCHA.kael;
  px(c, 1, 6, 30, 25, m.escuro);
  px(c, 2, 7, 28, 5, m.claro);
  px(c, 3, 13, 26, 15, m.base);
  // Ecrã.
  px(c, 6, 15, 20, 11, ROCHA.nulo.contorno);
  const r = mulberry32(18001 + v * 7);
  for (let i = 0; i < 7; i++) {
    const y = 16 + Math.floor(r() * 9);
    px(c, 7, y, 2 + Math.floor(r() * 16), 1, m.acento);
  }
  px(c, 7, 17 + (v % 4) * 2, 18, 1, '#ffffff');
  halo(c, 16, 20, 18, `${m.acento}3a`);
  // Braço robótico.
  px(c, 24, 3, 3, 10, ROCHA.maquina.base);
  px(c, 20, 3, 8, 3, ROCHA.maquina.claro);
  rebites(c, m, 4);
  contorno(c, m.contorno, 1);
};

DESENHOS.b_cot = (c) => {
  const m = ROCHA.maquina;
  px(c, 2, 8, 28, 20, m.escuro);
  px(c, 3, 9, 26, 18, m.base);
  px(c, 4, 10, 24, 10, MINERAL.kaelite.escuro);
  px(c, 5, 11, 22, 8, MINERAL.kaelite.base);
  px(c, 6, 12, 8, 6, MINERAL.kaelite.claro);
  px(c, 4, 21, 24, 6, ROCHA.vidro.escuro);
  px(c, 5, 22, 22, 4, ROCHA.vidro.base);
  px(c, 6, 22, 8, 2, ROCHA.vidro.acento);
  rebites(c, m, 4);
  contorno(c, m.contorno, 1);
};

DESENHOS.b_relay = (c, v) => {
  // O Relé dos Architects: anel negro com um coração dourado.
  px(c, 0, 0, TILE, TILE, ROCHA.nulo.contorno);
  px(c, 2, 2, 28, 28, ROCHA.nulo.base);
  px(c, 4, 4, 24, 24, ROCHA.nulo.escuro);
  const p = MINERAL.starshard;
  // Anel exterior com glifos.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + v * 0.05;
    const x = 16 + Math.cos(a) * 11 - 1;
    const y = 16 + Math.sin(a) * 11 - 1;
    px(c, x, y, 2, 2, i % 2 ? p.base : p.escuro);
  }
  px(c, 11, 11, 10, 10, p.contorno);
  px(c, 12, 12, 8, 8, p.escuro);
  px(c, 13, 13, 6, 6, p.base);
  px(c, 14, 14, 4, 4, p.claro);
  px(c, 15, 15, 2, 2, '#ffffff');
  halo(c, 16, 16, 20, `${p.acento}66`);
};

DESENHOS.b_relaypillar = (c, v) => {
  px(c, 4, 0, 24, TILE, ROCHA.nulo.contorno);
  px(c, 6, 0, 20, TILE, ROCHA.nulo.base);
  px(c, 8, 2, 16, 28, ROCHA.nulo.claro);
  px(c, 12, 4, 8, 24, ROCHA.nulo.escuro);
  const p = MINERAL.starshard;
  px(c, 14, 6, 4, 20, p.escuro);
  px(c, 15, 7 + (v % 2), 2, 17, p.base);
  px(c, 15, 10, 2, 5, p.acento);
  halo(c, 16, 16, 15, `${p.acento}33`);
  contorno(c, ROCHA.nulo.contorno, 1);
};

DESENHOS.b_plankwall = (c, v) => {
  const m = ROCHA.lumibark;
  px(c, 0, 0, TILE, TILE, m.escuro);
  for (let x = 0; x < TILE; x += 8) {
    px(c, x + 1, 0, 6, TILE, m.base);
    px(c, x + 1, 0, 6, 2, m.claro);
    ruido(c, 18301 + v * 11 + x, [m.escuro, m.claro], 14);
  }
  for (let x = 6; x < TILE; x += 8) px(c, x, 0, 2, TILE, m.contorno);
  px(c, 0, 14, TILE, 2, m.contorno);
  oclusao(c, 0.25);
  contorno(c, m.contorno, 1);
};

DESENHOS.b_brickwall = tijolo(ROCHA.forgebrick, 8);

// --- Rebordos e coroas de rocha ----------------------------------------------
// Pequenos acrescentos que quebram a linha recta entre rocha e chão.

DESENHOS.r_pendente = (c, v, p) => {
  const r = mulberry32(61000 + v * 131);
  for (let x = 0; x < TILE; x += 2) {
    if (r() > 0.6) continue;
    const h = 2 + Math.floor(r() * 6);
    px(c, x, 0, 2, h, p.escuro);
    px(c, x, 0, 1, Math.max(1, h - 1), p.base);
    if (r() > 0.75) px(c, x, h, 1, 2, p.claro);
  }
};

DESENHOS.r_coroa = (c, v, p) => {
  const r = mulberry32(62000 + v * 197);
  // Pedras soltas e tufos assentes no topo da rocha.
  for (let i = 0; i < 3; i++) {
    const x = 3 + Math.floor(r() * 24);
    const t = 3 + Math.floor(r() * 4);
    px(c, x, TILE - t - 1, t + 1, t + 1, p.contorno);
    px(c, x, TILE - t - 1, t, t, p.claro);
    px(c, x, TILE - t - 1, 1, 1, p.acento);
  }
};

// --- Glifos de interface -----------------------------------------------------
// Os botões usam ícones desenhados em vez de palavras: lê-se num relance e
// não depende da língua.

DESENHOS.ui_picareta = (c, _v, p) => {
  // Cabo na diagonal com cabeça de picareta.
  c.save();
  c.translate(16, 16);
  c.rotate(-0.35);
  px(c, -2, -4, 4, 20, p.escuro);
  px(c, -2, -4, 2, 20, p.base);
  c.restore();
  c.strokeStyle = p.claro;
  c.lineWidth = 4;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(4, 12);
  c.quadraticCurveTo(16, 3, 28, 12);
  c.stroke();
  c.strokeStyle = p.acento;
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(6, 11);
  c.quadraticCurveTo(16, 4, 26, 11);
  c.stroke();
};

DESENHOS.ui_bloco = (c, _v, p) => {
  // Cubo em perspectiva com um sinal de mais.
  c.fillStyle = p.escuro;
  c.beginPath();
  c.moveTo(16, 5);
  c.lineTo(28, 11);
  c.lineTo(28, 23);
  c.lineTo(16, 29);
  c.lineTo(4, 23);
  c.lineTo(4, 11);
  c.closePath();
  c.fill();
  c.fillStyle = p.base;
  c.beginPath();
  c.moveTo(16, 5);
  c.lineTo(28, 11);
  c.lineTo(16, 17);
  c.lineTo(4, 11);
  c.closePath();
  c.fill();
  c.fillStyle = p.claro;
  c.beginPath();
  c.moveTo(16, 17);
  c.lineTo(28, 11);
  c.lineTo(28, 23);
  c.lineTo(16, 29);
  c.closePath();
  c.fill();
  px(c, 14, 19, 4, 1, p.acento);
  px(c, 15, 18, 2, 3, p.acento);
};

DESENHOS.ui_mao = (c, _v, p) => {
  // Mão aberta, de frente.
  px(c, 9, 13, 14, 13, p.escuro);
  px(c, 10, 14, 12, 11, p.base);
  for (let i = 0; i < 4; i++) {
    const x = 9 + i * 4;
    const alt = i === 0 || i === 3 ? 7 : 10;
    px(c, x, 13 - alt, 3, alt + 2, p.escuro);
    px(c, x, 14 - alt, 2, alt, p.claro);
  }
  px(c, 5, 16, 5, 7, p.escuro);
  px(c, 6, 17, 3, 5, p.claro);
  px(c, 12, 18, 6, 2, p.acento);
};

DESENHOS.ui_mochila = (c, _v, p) => {
  px(c, 8, 4, 16, 5, p.escuro);
  px(c, 10, 2, 12, 4, p.base);
  px(c, 5, 8, 22, 21, p.escuro);
  px(c, 6, 9, 20, 19, p.base);
  px(c, 6, 9, 20, 5, p.claro);
  px(c, 9, 16, 14, 9, p.escuro);
  px(c, 10, 17, 12, 7, p.claro);
  px(c, 14, 19, 4, 3, p.acento);
  px(c, 3, 12, 3, 12, p.escuro);
  px(c, 26, 12, 3, 12, p.escuro);
};

// --- Decalques de chão -------------------------------------------------------
// Pequenos detalhes espalhados pelo chão. Vivem no buffer de terreno, por isso
// custam praticamente nada e são o que tira o ar de "azulejo repetido".

function decalque(desenho: (c: CanvasRenderingContext2D, r: () => number, p: Paleta) => void): Pincel {
  return (c, v, p) => desenho(c, mulberry32(52000 + v * 733), p);
}

DESENHOS.d_pedras = decalque((c, r, p) => {
  for (let i = 0; i < 4 + Math.floor(r() * 4); i++) {
    const x = 2 + Math.floor(r() * 26);
    const y = 2 + Math.floor(r() * 26);
    const t = 2 + Math.floor(r() * 3);
    px(c, x, y + 1, t + 1, t, p.contorno);
    px(c, x, y, t, t - 1, p.claro);
    px(c, x, y, 1, 1, p.acento);
  }
});

DESENHOS.d_fissura = decalque((c, r, p) => {
  let x = 3 + Math.floor(r() * 10);
  let y = 2;
  while (y < TILE - 2) {
    const comp = 2 + Math.floor(r() * 3);
    px(c, x, y, 1, comp, p.contorno);
    px(c, x + 1, y, 1, Math.max(1, comp - 1), '#00000044');
    x += r() > 0.5 ? 1 : -1;
    y += comp;
    if (r() > 0.78) {
      px(c, x, y, 4 + Math.floor(r() * 5), 1, p.contorno);
    }
  }
});

DESENHOS.d_ossos = decalque((c, r, p) => {
  const x = 4 + Math.floor(r() * 14);
  const y = 8 + Math.floor(r() * 14);
  px(c, x, y, 13, 3, p.contorno);
  px(c, x + 1, y, 11, 2, '#d8cdb4');
  px(c, x - 1, y - 1, 3, 5, p.contorno);
  px(c, x, y - 1, 2, 4, '#e8ddc4');
  px(c, x + 12, y - 1, 3, 5, p.contorno);
  px(c, x + 12, y - 1, 2, 4, '#e8ddc4');
  if (r() > 0.5) {
    px(c, x + 3, y + 7, 8, 2, p.contorno);
    px(c, x + 4, y + 7, 6, 1, '#cfc3a8');
  }
});

DESENHOS.d_sucata = decalque((c, r, p) => {
  for (let i = 0; i < 3; i++) {
    const x = 3 + Math.floor(r() * 22);
    const y = 3 + Math.floor(r() * 22);
    if (r() > 0.5) {
      px(c, x, y, 7, 3, p.contorno);
      px(c, x, y, 6, 2, p.claro);
      px(c, x + 1, y, 2, 1, p.acento);
    } else {
      px(c, x, y, 4, 4, p.contorno);
      px(c, x + 1, y + 1, 2, 2, p.base);
    }
  }
});

DESENHOS.d_musgo = decalque((c, r, p) => {
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(r() * TILE);
    const y = Math.floor(r() * TILE);
    const t = 2 + Math.floor(r() * 3);
    px(c, x, y, t, t, r() > 0.5 ? p.escuro : p.base);
    if (r() > 0.7) px(c, x, y, 1, 1, p.acento);
  }
});

DESENHOS.d_poca = decalque((c, r, p) => {
  const x = 5 + Math.floor(r() * 10);
  const y = 7 + Math.floor(r() * 10);
  const w = 10 + Math.floor(r() * 9);
  const h = 5 + Math.floor(r() * 5);
  c.fillStyle = '#00000055';
  c.beginPath();
  c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = p.escuro;
  c.beginPath();
  c.ellipse(x + w / 2, y + h / 2, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2);
  c.fill();
  px(c, x + 3, y + 1, 4, 1, p.acento);
});

DESENHOS.d_cristais = decalque((c, r, p) => {
  for (let i = 0; i < 3; i++) {
    const x = 5 + Math.floor(r() * 20);
    const y = 10 + Math.floor(r() * 14);
    const alt = 4 + Math.floor(r() * 5);
    px(c, x - 1, y - alt, 4, alt + 2, p.contorno);
    px(c, x, y - alt + 1, 2, alt, p.base);
    px(c, x, y - alt + 1, 1, 2, p.acento);
  }
});

DESENHOS.d_raizes = decalque((c, r, p) => {
  for (let i = 0; i < 3; i++) {
    let x = Math.floor(r() * TILE);
    let y = Math.floor(r() * 6);
    for (let k = 0; k < 10; k++) {
      px(c, x, y, 2, 2, r() > 0.6 ? p.claro : p.base);
      x += r() > 0.5 ? 1 : -1;
      y += 3;
      if (y > TILE) break;
    }
  }
});

DESENHOS.d_glifo = decalque((c, r, p) => {
  // Marca circular gravada na placa, não um símbolo de texto: o objectivo é
  // parecer que alguém carimbou o chão há mil anos.
  const cx = 10 + Math.floor(r() * 12);
  const cy = 10 + Math.floor(r() * 12);
  const raio = 5 + Math.floor(r() * 2);
  c.globalAlpha = 0.5;
  c.strokeStyle = p.acento;
  c.lineWidth = 1;
  c.beginPath();
  c.arc(cx + 0.5, cy + 0.5, raio, 0, Math.PI * 2);
  c.stroke();
  c.globalAlpha = 0.32;
  c.beginPath();
  c.arc(cx + 0.5, cy + 0.5, raio - 2.5, 0, Math.PI * 2);
  c.stroke();
  // Quatro traços radiais, um deles em falta — desgaste.
  c.globalAlpha = 0.45;
  const falta = Math.floor(r() * 4);
  for (let i = 0; i < 4; i++) {
    if (i === falta) continue;
    const a = (i / 4) * Math.PI * 2 + 0.4;
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * (raio - 2), cy + Math.sin(a) * (raio - 2));
    c.lineTo(cx + Math.cos(a) * (raio + 2), cy + Math.sin(a) * (raio + 2));
    c.stroke();
  }
  c.globalAlpha = 1;
  halo(c, cx, cy, 12, `${p.acento}18`);
});

// --- Itens -------------------------------------------------------------------
// Os itens usam a paleta passada em runtime, por isso o mesmo desenho serve
// para todos os materiais da progressão.

DESENHOS.i_minerio = (c, _v, p) => {
  px(c, 8, 6, 16, 4, ROCHA.slate.contorno);
  px(c, 5, 10, 22, 14, ROCHA.slate.contorno);
  px(c, 9, 24, 14, 3, ROCHA.slate.contorno);
  px(c, 7, 11, 18, 12, ROCHA.slate.base);
  px(c, 9, 8, 14, 3, ROCHA.slate.claro);
  px(c, 7, 20, 18, 3, ROCHA.slate.escuro);
  gemas(c, 4242, p, 3, 5);
};

DESENHOS.i_lingote = (c, _v, p) => {
  px(c, 4, 12, 24, 12, p.contorno);
  px(c, 6, 13, 20, 10, p.escuro);
  px(c, 7, 14, 18, 7, p.base);
  px(c, 8, 14, 16, 3, p.claro);
  px(c, 9, 15, 5, 1, p.acento);
  px(c, 6, 10, 20, 3, p.contorno);
  px(c, 7, 11, 18, 2, p.base);
};

DESENHOS.i_fragmento = (c, _v, p) => {
  px(c, 13, 3, 6, 4, p.contorno);
  px(c, 9, 7, 14, 16, p.contorno);
  px(c, 12, 23, 8, 6, p.contorno);
  px(c, 11, 8, 10, 14, p.escuro);
  px(c, 12, 9, 7, 11, p.base);
  px(c, 13, 10, 3, 7, p.claro);
  px(c, 14, 11, 2, 3, '#ffffff');
  halo(c, 16, 15, 14, `${p.acento}55`);
};

DESENHOS.i_cristal = (c, _v, p) => {
  px(c, 12, 2, 8, 28, p.contorno);
  px(c, 7, 12, 6, 16, p.contorno);
  px(c, 19, 9, 6, 19, p.contorno);
  px(c, 13, 4, 6, 25, p.base);
  px(c, 8, 14, 4, 13, p.escuro);
  px(c, 20, 11, 4, 16, p.escuro);
  px(c, 14, 5, 2, 18, p.claro);
  px(c, 14, 6, 2, 4, '#ffffff');
  halo(c, 16, 16, 16, `${p.acento}44`);
};

DESENHOS.i_placa = (c, _v, p) => {
  px(c, 4, 7, 24, 18, p.contorno);
  px(c, 5, 8, 22, 16, p.base);
  px(c, 5, 8, 22, 4, p.claro);
  px(c, 5, 21, 22, 3, p.escuro);
  riscos(c, 4343, p.claro, 5);
  for (const [x, y] of [[7, 10], [24, 10], [7, 21], [24, 21]]) {
    px(c, x, y, 2, 2, p.contorno);
    px(c, x, y, 1, 1, p.acento);
  }
};

DESENHOS.i_madeira = (c, _v, p) => {
  px(c, 3, 10, 26, 13, p.contorno);
  px(c, 4, 11, 24, 11, p.base);
  px(c, 4, 11, 24, 3, p.claro);
  px(c, 4, 19, 24, 3, p.escuro);
  px(c, 9, 13, 2, 7, p.escuro);
  px(c, 18, 13, 2, 7, p.escuro);
  px(c, 22, 12, 1, 9, p.claro);
};

DESENHOS.i_fibra = (c, _v, p) => {
  const r = mulberry32(5150);
  for (let i = 0; i < 6; i++) {
    let x = 6 + Math.floor(r() * 20);
    for (let y = 28; y > 5; y -= 2) {
      px(c, x, y, 2, 2, r() > 0.5 ? p.base : p.claro);
      x += r() > 0.5 ? 1 : -1;
    }
    px(c, x, 4, 2, 3, p.acento);
  }
};

DESENHOS.i_po = (c, _v, p) => {
  px(c, 6, 16, 20, 10, p.contorno);
  px(c, 7, 17, 18, 8, p.escuro);
  px(c, 8, 18, 16, 5, p.base);
  px(c, 10, 19, 6, 2, p.claro);
  const r = mulberry32(5555);
  for (let i = 0; i < 12; i++) px(c, 6 + Math.floor(r() * 20), 8 + Math.floor(r() * 10), 2, 2, p.acento);
};

// Ferramentas e armas: cabo comum + cabeça da cor do material.
function cabo(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const m = ROCHA.raiz;
  px(c, x - 1, y, w + 2, h, m.contorno);
  px(c, x, y, w, h, m.base);
  px(c, x, y, 1, h, m.claro);
  px(c, x, y + h - 4, w, 3, m.escuro);
}

DESENHOS.i_picareta = (c, _v, p) => {
  cabo(c, 15, 10, 4, 20);
  px(c, 4, 6, 24, 3, p.contorno);
  px(c, 2, 8, 6, 5, p.contorno);
  px(c, 24, 8, 6, 5, p.contorno);
  px(c, 5, 7, 22, 3, p.base);
  px(c, 3, 9, 5, 3, p.base);
  px(c, 25, 9, 5, 3, p.base);
  px(c, 6, 7, 20, 1, p.claro);
  px(c, 12, 8, 8, 4, p.escuro);
  px(c, 13, 9, 3, 1, p.acento);
};

DESENHOS.i_espada = (c, _v, p) => {
  px(c, 13, 2, 6, 20, p.contorno);
  px(c, 14, 3, 4, 19, p.base);
  px(c, 14, 4, 2, 17, p.claro);
  px(c, 15, 5, 1, 6, p.acento);
  px(c, 8, 21, 16, 4, ROCHA.maquina.contorno);
  px(c, 9, 22, 14, 2, p.escuro);
  cabo(c, 14, 24, 4, 7);
  px(c, 12, 29, 8, 3, p.escuro);
};

DESENHOS.i_machado = (c, _v, p) => {
  cabo(c, 14, 6, 4, 25);
  px(c, 3, 5, 14, 14, p.contorno);
  px(c, 5, 6, 12, 12, p.base);
  px(c, 5, 6, 8, 4, p.claro);
  px(c, 4, 9, 3, 7, p.escuro);
  px(c, 17, 7, 8, 10, p.contorno);
  px(c, 17, 8, 7, 8, p.escuro);
};

DESENHOS.i_martelo = (c, _v, p) => {
  cabo(c, 14, 10, 4, 21);
  px(c, 4, 4, 24, 12, p.contorno);
  px(c, 6, 5, 20, 10, p.base);
  px(c, 6, 5, 20, 3, p.claro);
  px(c, 6, 12, 20, 3, p.escuro);
  px(c, 8, 7, 4, 3, p.acento);
};

DESENHOS.i_lanca = (c, _v, p) => {
  cabo(c, 15, 10, 3, 22);
  px(c, 12, 1, 8, 12, p.contorno);
  px(c, 14, 2, 4, 11, p.base);
  px(c, 14, 3, 2, 8, p.claro);
  px(c, 11, 12, 10, 3, p.escuro);
  px(c, 15, 4, 1, 4, p.acento);
};

DESENHOS.i_arco = (c, _v, p) => {
  px(c, 8, 3, 5, 26, p.contorno);
  px(c, 9, 4, 3, 24, p.base);
  px(c, 9, 6, 1, 20, p.claro);
  px(c, 6, 2, 8, 4, p.escuro);
  px(c, 6, 26, 8, 4, p.escuro);
  px(c, 20, 4, 1, 24, '#d8d2c4');
  px(c, 13, 15, 10, 2, p.acento);
};

DESENHOS.i_canhao = (c, _v, p) => {
  px(c, 3, 11, 26, 9, p.contorno);
  px(c, 4, 12, 24, 7, p.base);
  px(c, 4, 12, 24, 2, p.claro);
  px(c, 26, 13, 5, 5, p.escuro);
  px(c, 8, 19, 8, 9, ROCHA.maquina.contorno);
  px(c, 9, 20, 6, 7, ROCHA.raiz.base);
  px(c, 17, 9, 6, 3, p.escuro);
  px(c, 6, 14, 6, 3, p.acento);
  halo(c, 29, 15, 8, `${p.acento}44`);
};

DESENHOS.i_elmo = (c, _v, p) => {
  px(c, 6, 5, 20, 22, p.contorno);
  px(c, 7, 6, 18, 20, p.base);
  px(c, 8, 6, 16, 5, p.claro);
  px(c, 9, 14, 14, 7, ROCHA.nulo.contorno);
  px(c, 10, 16, 4, 3, p.acento);
  px(c, 18, 16, 4, 3, p.acento);
  px(c, 7, 24, 18, 3, p.escuro);
  px(c, 15, 2, 3, 5, p.claro);
};

DESENHOS.i_peitoral = (c, _v, p) => {
  px(c, 4, 5, 24, 23, p.contorno);
  px(c, 5, 6, 22, 21, p.base);
  px(c, 6, 6, 20, 5, p.claro);
  px(c, 12, 5, 8, 6, ROCHA.nulo.contorno);
  px(c, 5, 6, 5, 9, p.claro);
  px(c, 22, 6, 5, 9, p.claro);
  px(c, 6, 18, 20, 2, p.escuro);
  px(c, 14, 14, 4, 6, p.acento);
};

DESENHOS.i_grevas = (c, _v, p) => {
  px(c, 5, 4, 22, 9, p.contorno);
  px(c, 6, 5, 20, 7, p.base);
  px(c, 6, 5, 20, 2, p.claro);
  px(c, 6, 13, 8, 16, p.contorno);
  px(c, 18, 13, 8, 16, p.contorno);
  px(c, 7, 14, 6, 14, p.base);
  px(c, 19, 14, 6, 14, p.base);
  px(c, 7, 14, 2, 12, p.claro);
  px(c, 19, 14, 2, 12, p.claro);
  px(c, 8, 24, 5, 3, p.acento);
};

DESENHOS.i_fruto = (c, _v, p) => {
  px(c, 8, 9, 16, 18, p.contorno);
  px(c, 9, 10, 14, 16, p.base);
  px(c, 10, 11, 6, 7, p.claro);
  px(c, 11, 12, 3, 3, '#ffffff');
  px(c, 14, 4, 3, 6, ROCHA.rootmass.base);
  px(c, 17, 5, 6, 3, ROCHA.rootmass.claro);
  halo(c, 16, 18, 13, `${p.acento}30`);
};

DESENHOS.i_cogumelo = (c, _v, p) => {
  // Pé.
  px(c, 13, 16, 7, 13, '#3a3020');
  px(c, 14, 17, 5, 11, '#e8dcc8');
  px(c, 14, 17, 2, 10, '#fff4e2');
  px(c, 13, 27, 7, 2, '#c4b79c');
  // Chapéu.
  px(c, 5, 8, 22, 9, p.contorno);
  px(c, 7, 6, 18, 3, p.contorno);
  px(c, 6, 9, 20, 7, p.base);
  px(c, 8, 7, 16, 3, p.claro);
  px(c, 10, 10, 4, 3, p.acento);
  px(c, 18, 12, 3, 2, p.acento);
  px(c, 15, 8, 2, 2, p.acento);
  px(c, 6, 16, 20, 2, p.escuro);
  halo(c, 16, 12, 15, `${p.acento}33`);
};

DESENHOS.i_raiz = (c, _v, p) => {
  px(c, 12, 6, 8, 20, p.contorno);
  px(c, 13, 7, 6, 18, p.base);
  px(c, 13, 8, 2, 14, p.claro);
  px(c, 8, 10, 5, 3, p.escuro);
  px(c, 19, 15, 5, 3, p.escuro);
  px(c, 13, 24, 6, 5, p.acento);
  px(c, 10, 3, 4, 5, ROCHA.rootmass.base);
  px(c, 17, 2, 4, 6, ROCHA.rootmass.claro);
};

DESENHOS.i_bolo = (c, _v, p) => {
  px(c, 5, 12, 22, 14, p.contorno);
  px(c, 6, 13, 20, 12, p.base);
  px(c, 6, 13, 20, 4, p.claro);
  px(c, 8, 9, 16, 5, p.escuro);
  px(c, 9, 10, 14, 3, p.acento);
  px(c, 11, 18, 3, 3, p.escuro);
  px(c, 18, 20, 3, 3, p.escuro);
};

DESENHOS.i_baga = (c, _v, p) => {
  for (const [x, y, r] of [[10, 16, 6], [20, 14, 5], [15, 22, 5]]) {
    px(c, x - r, y - r, r * 2, r * 2, p.contorno);
    px(c, x - r + 1, y - r + 1, r * 2 - 2, r * 2 - 2, p.base);
    px(c, x - r + 2, y - r + 2, 3, 3, p.claro);
  }
  px(c, 14, 6, 3, 8, ROCHA.rootmass.base);
  px(c, 17, 5, 6, 3, ROCHA.rootmass.claro);
  halo(c, 16, 18, 14, `${p.acento}2a`);
};

DESENHOS.i_alga = (c, _v, p) => {
  const r = mulberry32(6161);
  for (let i = 0; i < 4; i++) {
    let x = 8 + i * 5;
    for (let y = 29; y > 4; y -= 3) {
      px(c, x, y, 4, 3, i % 2 ? p.base : p.escuro);
      px(c, x, y, 1, 3, p.claro);
      x += r() > 0.5 ? 1 : -1;
    }
  }
  px(c, 12, 12, 3, 3, p.acento);
};

DESENHOS.i_tigela = (c, _v, p) => {
  px(c, 4, 14, 24, 12, ROCHA.slate.contorno);
  px(c, 5, 15, 22, 10, ROCHA.slate.base);
  px(c, 5, 22, 22, 3, ROCHA.slate.escuro);
  px(c, 6, 13, 20, 4, p.contorno);
  px(c, 7, 14, 18, 3, p.base);
  px(c, 8, 14, 7, 1, p.claro);
  px(c, 13, 8, 3, 4, '#ffffff22');
  px(c, 18, 7, 3, 5, '#ffffff18');
};

DESENHOS.i_frasco = (c, _v, p) => {
  px(c, 12, 2, 8, 5, ROCHA.raiz.base);
  px(c, 12, 2, 8, 2, ROCHA.raiz.claro);
  px(c, 8, 7, 16, 23, ROCHA.vidro.contorno);
  px(c, 9, 8, 14, 21, ROCHA.vidro.escuro);
  px(c, 10, 14, 12, 14, p.base);
  px(c, 10, 14, 12, 3, p.claro);
  px(c, 11, 18, 3, 6, p.acento);
  px(c, 20, 10, 2, 12, '#ffffff33');
  halo(c, 16, 21, 14, `${p.acento}30`);
};

DESENHOS.i_estrela = (c, _v, p) => {
  const pontos: [number, number][] = [
    [16, 2], [19, 12], [29, 15], [19, 19], [16, 30], [13, 19], [3, 15], [13, 12],
  ];
  c.fillStyle = p.contorno;
  c.beginPath();
  pontos.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
  c.closePath();
  c.fill();
  c.fillStyle = p.base;
  c.beginPath();
  pontos.forEach(([x, y], i) => {
    const cx = 16 + (x - 16) * 0.78;
    const cy = 16 + (y - 16) * 0.78;
    return i === 0 ? c.moveTo(cx, cy) : c.lineTo(cx, cy);
  });
  c.closePath();
  c.fill();
  px(c, 14, 10, 4, 8, p.claro);
  px(c, 15, 12, 2, 3, '#ffffff');
  halo(c, 16, 16, 18, `${p.acento}55`);
};

// --- API ---------------------------------------------------------------------

function novoCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TILE;
  c.height = TILE;
  return c;
}

/** Devolve (e memoriza) o canvas de um sprite, já pintado com a paleta pedida. */
export function sprite(chave: string, variante = 0, p: Paleta = NEUTRO): HTMLCanvasElement {
  const k = `${chave}|${variante}|${p.base}${p.acento}`;
  const existente = cache.get(k);
  if (existente) return existente;

  const canvas = novoCanvas();
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const desenho = DESENHOS[chave];
  if (desenho) desenho(ctx, variante, p);
  else {
    px(ctx, 0, 0, TILE, TILE, '#ff00ff');
    px(ctx, 4, 4, TILE - 8, TILE - 8, '#000000');
  }
  cache.set(k, canvas);
  return canvas;
}

/**
 * Cache rápida por "dono" (uma definição de bloco, chão ou item).
 * Evita construir a chave de texto da cache a cada drawImage — com ~900
 * chamadas por quadro, isso era lixo suficiente para se notar.
 */
const memoriaDono = new WeakMap<object, HTMLCanvasElement[]>();

export function spriteDe(dono: object, chave: string, variante: number, p: Paleta): HTMLCanvasElement {
  let lista = memoriaDono.get(dono);
  if (lista === undefined) {
    lista = [];
    memoriaDono.set(dono, lista);
  }
  let canvas = lista[variante];
  if (canvas === undefined) {
    canvas = sprite(chave, variante, p);
    lista[variante] = canvas;
  }
  return canvas;
}

/** Halos pré-desenhados, um por cor. Pintar gradientes por fonte de luz era caro. */
const brilhos = new Map<string, HTMLCanvasElement>();

export function brilhoRedondo(cor: string, tamanho = 96): HTMLCanvasElement {
  const chave = `${cor}|${tamanho}`;
  const existente = brilhos.get(chave);
  if (existente) return existente;
  const canvas = document.createElement('canvas');
  canvas.width = tamanho;
  canvas.height = tamanho;
  const c = canvas.getContext('2d')!;
  const g = c.createRadialGradient(tamanho / 2, tamanho / 2, 0, tamanho / 2, tamanho / 2, tamanho / 2);
  g.addColorStop(0, cor);
  g.addColorStop(0.45, cor.replace(/[\d.]+\)$/, '0.35)'));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, tamanho, tamanho);
  brilhos.set(chave, canvas);
  return canvas;
}

export function spriteExiste(chave: string): boolean {
  return chave in DESENHOS;
}

export function chavesSprite(): string[] {
  return Object.keys(DESENHOS);
}

export function limparCacheSprites(): void {
  cache.clear();
}
