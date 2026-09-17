/**
 * Pipeline de desenho de The Hollow Star.
 *
 *   1. cena     — chão, oclusão, rocha com auto-tiling, entidades, efeitos
 *   2. luz      — mapa de luz colorido, multiplicado por cima da cena
 *   3. emissivo — halos das fontes de luz, desfocados e somados (bloom)
 *   4. final    — color grading do bioma, vinheta, grão e aberração cromática
 */

import { hash2d } from '../core/rng';
import type { Inimigo } from '../entities/enemies';
import type { Player } from '../entities/player';
import { itemDef } from '../game/items';
import type { Particula, Projetil, Queda, TextoFlutuante } from '../game/tipos';
import type { Lighting } from '../world/lighting';
import { blockDef, groundDef, type BlockDef } from '../world/tiles';
import type { InfoBioma } from '../world/worldgen';
import type { World } from '../world/world';
import { arestaParede, oclusaoChao, E, N, NE, NO, O, S, SE, SO } from './autotile';
import { Camera } from './camera';
import { desenharGolpe, desenharInimigo, desenharJogador } from './criaturas';
import { brilhoRedondo, spriteDe } from './sprites';

export interface Cena {
  world: World;
  player: Player;
  inimigos: Inimigo[];
  quedas: Queda[];
  particulas: Particula[];
  projeteis: Projetil[];
  textos: TextoFlutuante[];
  lighting: Lighting;
  alvo: [number, number] | null;
  alvoValido: boolean;
  progressoAlvo: number;
  corArmadura: string | null;
  corElmo: string | null;
  iconeMao: HTMLCanvasElement | null;
  bioma: InfoBioma;
  tempo: number;
  /** 0..1 — intensidade do flash vermelho quando o Portador é atingido. */
  dor: number;
}

/** Cores memorizadas, para não construir strings rgba a cada quadro. */
const corLuzCache = new Map<number, string>();

function corLuz(r: number, g: number, b: number): string {
  const chave = ((r * 255) | 0) * 65536 + ((g * 255) | 0) * 256 + ((b * 255) | 0);
  let cor = corLuzCache.get(chave);
  if (cor === undefined) {
    cor = `rgba(${(r * 255) | 0},${(g * 255) | 0},${(b * 255) | 0},0.85)`;
    corLuzCache.set(chave, cor);
  }
  return cor;
}

interface Mote {
  x: number;
  y: number;
  z: number;
  fase: number;
}

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly camera = new Camera();
  private ctx: CanvasRenderingContext2D;

  private cena = document.createElement('canvas');
  private cenaCtx: CanvasRenderingContext2D;
  private emissivo = document.createElement('canvas');
  private emissivoCtx: CanvasRenderingContext2D;
  private luzCanvas = document.createElement('canvas');
  private luzCtx: CanvasRenderingContext2D;
  /** Camada de terreno memorizada: só se repinta quando o mundo ou a vista mudam. */
  private mundo = document.createElement('canvas');
  private mundoCtx: CanvasRenderingContext2D;
  private mundoOrigemX = Number.NaN;
  private mundoOrigemY = Number.NaN;
  private mundoCols = 0;
  private mundoLinhas = 0;
  private mundoVersao = -1;
  private mundoAnim = -1;
  private mundoZoom = -1;
  /** Blocos com animação própria: ficam fora do buffer e desenham-se a cada quadro. */
  private animados: { x: number; y: number; def: BlockDef }[] = [];
  /**
   * Fontes de luz visíveis, recolhidas quando o terreno é repintado. Percorrer
   * o mundo todo a cada quadro só para encontrar tochas era desperdício.
   */
  private fontes: { x: number; y: number; luz: number; cor: string; tremula: boolean }[] = [];
  private emissivoBorrado = document.createElement('canvas');
  private grao = document.createElement('canvas');
  private padraoGrao: CanvasPattern | null = null;
  /** Deslocamento fixo do grão: animá-lo a cada quadro fazia o ecrã cintilar. */
  private graoX = 0;
  private graoY = 0;
  private vinheta = document.createElement('canvas');
  private sombraParede = document.createElement('canvas');
  private pontoLuz = document.createElement('canvas');
  private luzImg: ImageData | null = null;
  private dpr = 1;
  /** Píxeis reais por píxel de CSS (inclui a redução dinâmica de resolução). */
  private escalaPixel = 1;
  private motes: Mote[] = [];
  /** Qualidade dos efeitos: desce sozinha se o telemóvel não aguentar. */
  qualidade: 'alta' | 'media' | 'baixa' = 'alta';
  /** 'auto' deixa o jogo decidir; os outros valores fixam a qualidade. */
  modoQualidade: 'auto' | 'alta' | 'media' | 'baixa' = 'auto';
  private mediaMs = 8;
  private trocaQualidade = 0;
  /** Cada subida falhada torna a próxima tentativa mais lenta a chegar. */
  private tentativasSubida = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D indisponível neste dispositivo.');
    this.ctx = ctx;
    this.cenaCtx = this.cena.getContext('2d', { alpha: false })!;
    this.mundoCtx = this.mundo.getContext('2d')!;
    this.emissivoCtx = this.emissivo.getContext('2d')!;
    this.luzCtx = this.luzCanvas.getContext('2d', { willReadFrequently: true })!;
    this.gerarGrao();
    this.gerarSombraParede();
    this.gerarPontoLuz();
    for (let i = 0; i < 70; i++) {
      this.motes.push({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.7, fase: Math.random() * 6.3 });
    }
  }

  /** Textura de grão fixa, deslocada a cada frame — muito mais barata que gerar ruído. */
  private gerarGrao(): void {
    const tam = 128;
    this.grao.width = tam;
    this.grao.height = tam;
    const c = this.grao.getContext('2d')!;
    const img = c.createImageData(tam, tam);
    for (let i = 0; i < tam * tam; i++) {
      const v = 120 + Math.random() * 135;
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 26;
    }
    c.putImageData(img, 0, 0);
    this.padraoGrao = c.createPattern(this.grao, 'repeat');
    this.graoX = -Math.floor(Math.random() * 128);
    this.graoY = -Math.floor(Math.random() * 128);
  }

  /** Faixa de sombra projectada pelas paredes, desenhada uma única vez. */
  private gerarSombraParede(): void {
    this.sombraParede.width = 8;
    this.sombraParede.height = 32;
    const c = this.sombraParede.getContext('2d')!;
    const g = c.createLinearGradient(0, 0, 0, 32);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 8, 32);
  }

  /** Ponto luminoso usado pela poeira suspensa. */
  private gerarPontoLuz(): void {
    const t = 16;
    this.pontoLuz.width = t;
    this.pontoLuz.height = t;
    const c = this.pontoLuz.getContext('2d')!;
    const g = c.createRadialGradient(t / 2, t / 2, 0, t / 2, t / 2, t / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, t, t);
  }

  /** Vinheta pré-desenhada: pintá-la por gradiente a cada quadro era desperdício. */
  private gerarVinheta(pw: number, ph: number): void {
    this.vinheta.width = pw;
    this.vinheta.height = ph;
    const c = this.vinheta.getContext('2d')!;
    const g = c.createRadialGradient(
      pw / 2, ph / 2, Math.min(pw, ph) * 0.35,
      pw / 2, ph / 2, Math.max(pw, ph) * 0.72,
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.62)');
    c.fillStyle = g;
    c.fillRect(0, 0, pw, ph);
  }

  /** Resolução de desenho por nível de qualidade. */
  private escalaQualidade(): number {
    return this.qualidade === 'alta' ? 1 : this.qualidade === 'media' ? 0.82 : 0.66;
  }

  redimensionar(): void {
    // 1.75x chega e sobra para pixel art; 2x só queima taxa de preenchimento.
    this.dpr = Math.min(1.75, window.devicePixelRatio || 1);
    this.escalaPixel = this.dpr * this.escalaQualidade();
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    const pw = Math.max(1, Math.round(w * this.escalaPixel));
    const ph = Math.max(1, Math.round(h * this.escalaPixel));
    this.canvas.width = pw;
    this.canvas.height = ph;
    this.cena.width = pw;
    this.cena.height = ph;
    this.emissivo.width = Math.max(1, Math.round(pw / 3));
    this.emissivo.height = Math.max(1, Math.round(ph / 3));
    this.emissivoBorrado.width = this.emissivo.width;
    this.emissivoBorrado.height = this.emissivo.height;
    this.gerarVinheta(pw, ph);
    this.camera.redimensionar(w, h);

    const z = this.camera.zoom;
    this.mundoCols = Math.ceil(w / z) + 3;
    this.mundoLinhas = Math.ceil(h / z) + 3;
    this.mundo.width = Math.max(1, Math.round(this.mundoCols * z * this.escalaPixel));
    this.mundo.height = Math.max(1, Math.round(this.mundoLinhas * z * this.escalaPixel));
    this.mundoOrigemX = Number.NaN;
  }

  desenhar(cena: Cena, _dtMs = 16): void {
    const inicio = performance.now();
    this.desenharCena(cena);
    this.aplicarLuz(cena.lighting, cena.bioma.grading);
    if (this.qualidade !== 'baixa') this.desenharEmissivo(cena);
    this.composicaoFinal(cena);
    // A decisão de qualidade usa o tempo de desenho, não o intervalo entre
    // quadros: com v-sync, o intervalo é sempre 16.7 ms e não diz nada.
    this.ajustarQualidade(performance.now() - inicio);
  }

  /**
   * Baixa a qualidade (e a resolução) quando o desenho passa a demorar demasiado
   * do orçamento de 16.7 ms, e volta a subir quando houver folga. Nunca troca
   * mais de uma vez por segundo, para não ficar a oscilar.
   */
  private ajustarQualidade(msDesenho: number): void {
    this.mediaMs = this.mediaMs * 0.9 + Math.min(100, msDesenho) * 0.1;
    if (this.modoQualidade !== 'auto') {
      if (this.qualidade !== this.modoQualidade) {
        this.qualidade = this.modoQualidade;
        this.redimensionar();
      }
      return;
    }
    const agora = performance.now();
    const desde = agora - this.trocaQualidade;
    const antes = this.qualidade;

    // Descer é imediato: mais vale perder nitidez do que engasgar.
    if (desde > 1200) {
      if (this.mediaMs > 11 && this.qualidade === 'alta') {
        this.qualidade = 'media';
        this.tentativasSubida++;
      } else if (this.mediaMs > 13 && this.qualidade === 'media') {
        this.qualidade = 'baixa';
        this.tentativasSubida++;
      }
    }

    // Subir exige folga confortável e espera cada vez maior, para a imagem
    // não ficar a pulsar entre duas resoluções.
    const esperaSubida = 5000 * Math.min(8, this.tentativasSubida + 1);
    if (antes === this.qualidade && desde > esperaSubida) {
      if (this.mediaMs < 5 && this.qualidade === 'media') this.qualidade = 'alta';
      else if (this.mediaMs < 6 && this.qualidade === 'baixa') this.qualidade = 'media';
    }

    if (antes !== this.qualidade) {
      this.trocaQualidade = agora;
      this.redimensionar();
    }
  }

  // --- 1. Cena ---------------------------------------------------------------

  private desenharCena(cena: Cena): void {
    const c = this.cenaCtx;
    const cam = this.camera;
    c.setTransform(this.escalaPixel, 0, 0, this.escalaPixel, 0, 0);
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#05040a';
    c.fillRect(0, 0, cam.larguraPx, cam.alturaPx);

    const area = cam.areaVisivel(1);
    const z = cam.zoom;

    // --- Terreno (chão, oclusão, sombras e rocha) ---
    this.atualizarMundo(cena);
    c.drawImage(
      this.mundo,
      Math.round(cam.paraEcraX(this.mundoOrigemX)),
      Math.round(cam.paraEcraY(this.mundoOrigemY)),
      this.mundoCols * z,
      this.mundoLinhas * z,
    );

    // Blocos com animação própria, por cima do terreno memorizado.
    if (this.animados.length > 0) {
      const quadro = Math.floor(cena.tempo * 6) & 3;
      const altura = Math.round(z * 0.17);
      for (const a of this.animados) {
        const img = spriteDe(a.def, a.def.sprite, quadro, a.def.paleta);
        const sx = Math.floor(cam.paraEcraX(a.x));
        const sy = Math.floor(cam.paraEcraY(a.y));
        const sobe = a.def.parede ? altura : 0;
        if (a.def.parede && !cena.world.solido(a.x, a.y + 1)) {
          c.drawImage(img, 0, 22, 32, 10, sx, sy + z - altura, z + 1, altura + 1);
          c.fillStyle = 'rgba(0,0,0,0.42)';
          c.fillRect(sx, sy + z - altura, z + 1, altura + 1);
        }
        c.drawImage(img, sx, sy - sobe, z + 1, z + 1);
        if (a.def.parede) {
          const m = this.mascaraParede(cena.world, a.x, a.y);
          if (m) c.drawImage(arestaParede(m, a.def.paleta), sx, sy - sobe, z + 1, z + 1);
        }
      }
    }

    // Fendas de mineração ficam de fora do buffer: mudam a cada golpe.
    if (cena.alvo) {
      const [tx, ty] = cena.alvo;
      const progresso = cena.world.progressoMina(tx, ty);
      if (progresso > 0) {
        const def = blockDef(cena.world.bloco(tx, ty));
        this.desenharFendas(
          c,
          Math.floor(cam.paraEcraX(tx)),
          Math.floor(cam.paraEcraY(ty)) - (def.parede ? Math.round(z * 0.17) : 0),
          z,
          progresso,
        );
      }
    }

    // --- Tile alvo ---
    if (cena.alvo) this.desenharAlvo(c, cena, z);

    // --- Itens no chão ---
    for (const q of cena.quedas) {
      const def = itemDef(q.item);
      if (!def) continue;
      const flut = Math.sin(q.t * 3.4) * z * 0.07;
      const px = cam.paraEcraX(q.x);
      const py = cam.paraEcraY(q.y);
      c.globalAlpha = 0.35;
      c.fillStyle = '#000';
      c.beginPath();
      c.ellipse(px, py + z * 0.2, z * 0.2, z * 0.08, 0, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
      c.drawImage(spriteDe(def, def.sprite, 0, def.paleta), px - z * 0.3, py - z * 0.34 + flut, z * 0.6, z * 0.6);
    }

    // --- Entidades por profundidade ---
    const fila: { y: number; fn: () => void }[] = [];
    for (const e of cena.inimigos) {
      if (e.x < area.x0 - 3 || e.x > area.x1 + 3 || e.y < area.y0 - 3 || e.y > area.y1 + 3) continue;
      fila.push({
        y: e.y,
        fn: () => {
          c.save();
          c.translate(cam.paraEcraX(e.x), cam.paraEcraY(e.y));
          desenharInimigo(c, e, z);
          c.restore();
        },
      });
    }
    const p = cena.player;
    if (!p.morto) {
      fila.push({
        y: p.y,
        fn: () => {
          c.save();
          c.translate(cam.paraEcraX(p.x), cam.paraEcraY(p.y));
          desenharJogador(c, p, z, cena.corArmadura, cena.corElmo);
          if (p.golpe > 0) desenharGolpe(c, p, z, 1 - p.golpe / 0.25, cena.iconeMao);
          c.restore();
        },
      });
    }
    fila.sort((a, b) => a.y - b.y);
    for (const d of fila) d.fn();

    // --- Projécteis ---
    for (const pr of cena.projeteis) {
      const sx = cam.paraEcraX(pr.x);
      const sy = cam.paraEcraY(pr.y);
      const ang = Math.atan2(pr.vy, pr.vx);
      c.save();
      c.translate(sx, sy);
      c.rotate(ang);
      c.globalAlpha = 0.35;
      c.fillStyle = pr.cor;
      c.fillRect(-z * 0.5, -pr.raio * z * 0.5, z * 0.5, pr.raio * z);
      c.globalAlpha = 1;
      c.beginPath();
      c.ellipse(0, 0, pr.raio * z * 1.5, pr.raio * z, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.ellipse(pr.raio * z * 0.3, 0, pr.raio * z * 0.5, pr.raio * z * 0.35, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    // --- Partículas ---
    for (const pa of cena.particulas) {
      const a = Math.max(0, pa.vida / pa.vidaMax);
      c.globalAlpha = a;
      c.fillStyle = pa.cor;
      const t = pa.tam * z * (0.4 + a * 0.8);
      c.fillRect(cam.paraEcraX(pa.x) - t / 2, cam.paraEcraY(pa.y) - t / 2, t, t);
    }
    c.globalAlpha = 1;

    // --- Poeira suspensa (profundidade de campo falsa) ---
    this.desenharMotes(c, cena);
  }

  /**
   * Repinta a camada de terreno se alguma coisa mudou: a vista andou um tile,
   * o mundo foi alterado, ou o quadro de animação dos líquidos avançou.
   * Entre repinturas, o terreno todo custa um único drawImage.
   */
  private atualizarMundo(cena: Cena): void {
    const cam = this.camera;
    const z = cam.zoom;
    const origemX = Math.floor(cam.x - cam.larguraPx / 2 / z) - 1;
    const origemY = Math.floor(cam.y - cam.alturaPx / 2 / z) - 1;
    // Só a animação dos líquidos obriga a repintar o terreno, e a 3 Hz.
    const anim = Math.floor(cena.tempo * 3) & 3;

    if (
      origemX === this.mundoOrigemX &&
      origemY === this.mundoOrigemY &&
      this.mundoVersao === cena.world.versao &&
      this.mundoAnim === anim &&
      this.mundoZoom === z
    ) {
      return;
    }

    this.mundoOrigemX = origemX;
    this.mundoOrigemY = origemY;
    this.mundoVersao = cena.world.versao;
    this.mundoAnim = anim;
    this.mundoZoom = z;

    const c = this.mundoCtx;
    const world = cena.world;
    const seed = world.seed;
    this.fontes.length = 0;
    c.setTransform(this.escalaPixel, 0, 0, this.escalaPixel, 0, 0);
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, this.mundoCols * z, this.mundoLinhas * z);

    // Chão + oclusão ambiente.
    for (let ly = 0; ly < this.mundoLinhas; ly++) {
      for (let lx = 0; lx < this.mundoCols; lx++) {
        const x = origemX + lx;
        const y = origemY + ly;
        const g = groundDef(world.chao(x, y));
        const v = hash2d(x, y, seed) & 3;
        const sx = lx * z;
        const sy = ly * z;
        c.drawImage(spriteDe(g, g.sprite, g.anima ? (v + anim) & 3 : v, g.paleta), sx, sy, z + 1, z + 1);
        if (g.luz && g.luz > 0.2) {
          const [r, gg, b] = g.corLuz ?? [1, 0.85, 0.6];
          this.fontes.push({ x, y, luz: g.luz, cor: corLuz(r, gg, b), tremula: true });
        }
        if (world.solido(x, y)) continue;
        const ao = oclusaoChao(this.mascara(world, x, y));
        if (ao) c.drawImage(ao, sx, sy, z + 1, z + 1);
      }
    }

    // Sombras projectadas pela rocha.
    for (let ly = 0; ly < this.mundoLinhas; ly++) {
      for (let lx = 0; lx < this.mundoCols; lx++) {
        const x = origemX + lx;
        const y = origemY + ly;
        const def = blockDef(world.bloco(x, y));
        if (!def.parede || !def.solido || world.solido(x, y + 1)) continue;
        c.drawImage(this.sombraParede, lx * z - z * 0.08, (ly + 1) * z, z * 1.16, z * 0.55);
      }
    }

    // Rocha e objectos, erguidos para mostrarem a face frontal.
    const altura = Math.round(z * 0.17);
    this.animados.length = 0;
    for (let ly = 0; ly < this.mundoLinhas; ly++) {
      for (let lx = 0; lx < this.mundoCols; lx++) {
        const x = origemX + lx;
        const y = origemY + ly;
        const id = world.bloco(x, y);
        if (id === 0) continue;
        const def = blockDef(id);
        if (def.luz && def.luz > 0.2) {
          const [r, gg, b] = def.corLuz ?? [1, 0.85, 0.6];
          // Só as chamas tremem; um veio de minério brilha parado.
          this.fontes.push({ x, y, luz: def.luz, cor: corLuz(r, gg, b), tremula: def.anima === true });
        }
        if (def.anima) {
          // Tochas, forjas e o Relé desenham-se por cima, a cada quadro.
          this.animados.push({ x, y, def });
          continue;
        }
        const v = hash2d(x, y, seed + 9) & 3;
        const sx = lx * z;
        const sy = ly * z;
        const img = spriteDe(def, def.sprite, v, def.paleta);
        const sobe = def.parede ? altura : 0;

        if (def.parede && !world.solido(x, y + 1)) {
          c.drawImage(img, 0, 22, 32, 10, sx, sy + z - altura, z + 1, altura + 1);
          c.fillStyle = 'rgba(0,0,0,0.42)';
          c.fillRect(sx, sy + z - altura, z + 1, altura + 1);
          c.fillStyle = def.paleta.contorno;
          c.fillRect(sx, sy + z, z + 1, 1);
        }

        c.drawImage(img, sx, sy - sobe, z + 1, z + 1);

        if (def.parede) {
          const m = this.mascaraParede(world, x, y);
          if (m) c.drawImage(arestaParede(m, def.paleta), sx, sy - sobe, z + 1, z + 1);
        }
      }
    }
  }

  /** Vizinhança sólida de um tile, em bitmask. */
  private mascara(world: World, x: number, y: number): number {
    let m = 0;
    if (world.solido(x, y - 1)) m |= N;
    if (world.solido(x, y + 1)) m |= S;
    if (world.solido(x + 1, y)) m |= E;
    if (world.solido(x - 1, y)) m |= O;
    if (world.solido(x + 1, y - 1)) m |= NE;
    if (world.solido(x - 1, y - 1)) m |= NO;
    if (world.solido(x + 1, y + 1)) m |= SE;
    if (world.solido(x - 1, y + 1)) m |= SO;
    return m;
  }

  /** Para a rocha, interessa o inverso: onde é que ela está exposta. */
  private mascaraParede(world: World, x: number, y: number): number {
    let m = 0;
    if (!world.solido(x, y - 1)) m |= N;
    if (!world.solido(x, y + 1)) m |= S;
    if (!world.solido(x + 1, y)) m |= E;
    if (!world.solido(x - 1, y)) m |= O;
    if (!world.solido(x + 1, y - 1)) m |= NE;
    if (!world.solido(x - 1, y - 1)) m |= NO;
    if (!world.solido(x + 1, y + 1)) m |= SE;
    if (!world.solido(x - 1, y + 1)) m |= SO;
    return m;
  }

  private desenharAlvo(c: CanvasRenderingContext2D, cena: Cena, z: number): void {
    const [tx, ty] = cena.alvo!;
    const def = blockDef(cena.world.bloco(tx, ty));
    const sx = Math.floor(this.camera.paraEcraX(tx));
    const sy = Math.floor(this.camera.paraEcraY(ty)) - (def.parede ? Math.round(z * 0.17) : 0);
    const cor = cena.alvoValido ? 'rgba(255,240,200,0.85)' : 'rgba(255,90,90,0.8)';
    c.save();
    c.strokeStyle = cor;
    c.lineWidth = Math.max(1.5, z * 0.04);
    const canto = z * 0.28;
    const margem = z * 0.06;
    // Só os cantos: fica mais limpo e mais "equipamento técnico".
    for (const [dx, dy, ex, ey] of [
      [0, 0, 1, 1], [1, 0, -1, 1], [0, 1, 1, -1], [1, 1, -1, -1],
    ]) {
      const x = sx + dx * z + (dx ? -margem : margem);
      const y = sy + dy * z + (dy ? -margem : margem);
      c.beginPath();
      c.moveTo(x + ex * canto, y);
      c.lineTo(x, y);
      c.lineTo(x, y + ey * canto);
      c.stroke();
    }
    if (cena.progressoAlvo > 0) {
      c.fillStyle = 'rgba(255,220,150,0.18)';
      c.fillRect(sx, sy + z * (1 - cena.progressoAlvo), z, z * cena.progressoAlvo);
    }
    c.restore();
  }

  private desenharFendas(c: CanvasRenderingContext2D, sx: number, sy: number, z: number, progresso: number): void {
    c.save();
    c.globalAlpha = 0.3 + progresso * 0.55;
    c.strokeStyle = '#05040a';
    c.lineWidth = Math.max(1, z * 0.05);
    const n = 1 + Math.floor(progresso * 4);
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / (n + 1);
      c.beginPath();
      c.moveTo(sx + z * t, sy + z * 0.08);
      c.lineTo(sx + z * (t - 0.14), sy + z * 0.48);
      c.lineTo(sx + z * (t + 0.12), sy + z * 0.92);
      c.stroke();
    }
    c.restore();
  }

  /** Partículas de ambiente que flutuam no ar, com paralaxe. */
  private desenharMotes(c: CanvasRenderingContext2D, cena: Cena): void {
    const cam = this.camera;
    const info = cena.bioma.poeira;
    const n = Math.round(this.motes.length * info.densidade * (this.qualidade === 'baixa' ? 0.4 : 1));
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = info.cor;
    for (let i = 0; i < n; i++) {
      const m = this.motes[i];
      // Paralaxe: os mais próximos deslocam-se mais com a câmara.
      const px = ((m.x * cam.larguraPx - cam.x * cam.zoom * m.z * 0.15 + cena.tempo * info.deriva * 24 * m.z) % cam.larguraPx + cam.larguraPx) % cam.larguraPx;
      const py = ((m.y * cam.alturaPx - cam.y * cam.zoom * m.z * 0.15 + Math.sin(cena.tempo * 0.4 + m.fase) * 14) % cam.alturaPx + cam.alturaPx) % cam.alturaPx;
      const tam = m.z * cam.zoom * 0.14;
      c.globalAlpha = 0.1 + m.z * 0.22 + Math.sin(cena.tempo * 1.6 + m.fase) * 0.06;
      c.drawImage(this.pontoLuz, px - tam / 2, py - tam / 2, tam, tam);
    }
    c.restore();
  }

  // --- 2. Luz ----------------------------------------------------------------

  private aplicarLuz(luz: Lighting, grading: [number, number, number]): void {
    const w = luz.w;
    const h = luz.h;
    if (w === 0 || h === 0) return;
    if (this.luzCanvas.width !== w || this.luzCanvas.height !== h) {
      this.luzCanvas.width = w;
      this.luzCanvas.height = h;
      this.luzImg = this.luzCtx.createImageData(w, h);
    }
    if (!this.luzImg) return;
    luz.escreverImagem(this.luzImg, grading);
    this.luzCtx.putImageData(this.luzImg, 0, 0);

    const c = this.cenaCtx;
    const cam = this.camera;
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.imageSmoothingEnabled = true;
    c.drawImage(this.luzCanvas, cam.paraEcraX(luz.x - 0.5), cam.paraEcraY(luz.y - 0.5), w * cam.zoom, h * cam.zoom);
    c.restore();
  }

  // --- 3. Bloom --------------------------------------------------------------

  private desenharEmissivo(cena: Cena): void {
    const c = this.emissivoCtx;
    const cam = this.camera;
    const escala = this.emissivo.width / cam.larguraPx;
    c.setTransform(escala, 0, 0, escala, 0, 0);
    c.clearRect(0, 0, cam.larguraPx, cam.alturaPx);
    c.globalCompositeOperation = 'lighter';

    // Os halos são imagens memorizadas por cor: criar gradientes por fonte de
    // luz, a cada quadro, era um dos maiores custos do desenho.
    const halo = (x: number, y: number, raio: number, cor: string, forca: number) => {
      c.globalAlpha = forca;
      c.drawImage(brilhoRedondo(cor), x - raio, y - raio, raio * 2, raio * 2);
    };

    const z = cam.zoom;
    for (const f of this.fontes) {
      const tremor = f.tremula ? 0.82 + Math.sin(cena.tempo * 7 + f.x * 3.7 + f.y * 2.3) * 0.18 : 1;
      halo(cam.paraEcraX(f.x + 0.5), cam.paraEcraY(f.y + 0.5), z * (1 + f.luz * 2.4), f.cor, f.luz * 0.5 * tremor);
    }
    for (const pr of cena.projeteis) {
      halo(cam.paraEcraX(pr.x), cam.paraEcraY(pr.y), z * 1.1, pr.cor, 0.7);
    }
    if (!cena.player.morto) {
      halo(cam.paraEcraX(cena.player.x), cam.paraEcraY(cena.player.y), z * 2.2, 'rgba(255,214,160,0.7)', 0.32);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }

  // --- 4. Composição final ---------------------------------------------------

  private composicaoFinal(cena: Cena): void {
    const c = this.ctx;
    const cam = this.camera;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.imageSmoothingEnabled = false;

    c.drawImage(this.cena, 0, 0);

    // Bloom: o desfoque é feito no buffer pequeno (1/3) e só depois ampliado.
    // Aplicar o filtro já em tamanho de ecrã custava vários milissegundos.
    if (this.qualidade !== 'baixa') {
      const bc = this.emissivoBorrado.getContext('2d')!;
      bc.setTransform(1, 0, 0, 1, 0, 0);
      bc.clearRect(0, 0, this.emissivoBorrado.width, this.emissivoBorrado.height);
      bc.filter = this.qualidade === 'alta' ? 'blur(3px)' : 'blur(2px)';
      bc.drawImage(this.emissivo, 0, 0);
      bc.filter = 'none';

      c.save();
      c.globalCompositeOperation = 'lighter';
      c.imageSmoothingEnabled = true;
      c.globalAlpha = 0.85;
      c.drawImage(this.emissivoBorrado, 0, 0, this.canvas.width, this.canvas.height);
      c.restore();
    }

    const pw = this.canvas.width;
    const ph = this.canvas.height;

    // Vinheta (imagem pronta).
    c.drawImage(this.vinheta, 0, 0);

    // Grão de filme, parado. É textura de lente, não ruído de televisão:
    // re-sortear o deslocamento a cada quadro punha o ecrã inteiro a cintilar.
    if (this.qualidade === 'alta' && this.padraoGrao) {
      c.save();
      c.globalAlpha = 0.3;
      c.translate(this.graoX, this.graoY);
      c.fillStyle = this.padraoGrao;
      c.fillRect(0, 0, pw + 128, ph + 128);
      c.restore();
    }

    // Flash de dor.
    if (cena.dor > 0) {
      const dg = c.createRadialGradient(pw / 2, ph / 2, Math.min(pw, ph) * 0.2, pw / 2, ph / 2, Math.max(pw, ph) * 0.7);
      dg.addColorStop(0, 'rgba(180,20,20,0)');
      dg.addColorStop(1, `rgba(190,25,25,${0.75 * cena.dor})`);
      c.fillStyle = dg;
      c.fillRect(0, 0, pw, ph);
    }

    // Vida baixa: pulsar vermelho nas bordas.
    const p = cena.player;
    const fraco = 1 - Math.min(1, p.vida / (p.vidaMax * 0.3));
    if (fraco > 0 && !p.morto) {
      const pulso = 0.35 + Math.sin(cena.tempo * 5) * 0.2;
      const lg = c.createRadialGradient(pw / 2, ph / 2, Math.min(pw, ph) * 0.3, pw / 2, ph / 2, Math.max(pw, ph) * 0.7);
      lg.addColorStop(0, 'rgba(120,0,0,0)');
      lg.addColorStop(1, `rgba(150,10,10,${fraco * pulso})`);
      c.fillStyle = lg;
      c.fillRect(0, 0, pw, ph);
    }

    void cam;
  }
}
