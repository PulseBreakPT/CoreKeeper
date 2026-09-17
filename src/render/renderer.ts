/**
 * Pipeline de desenho de The Hollow Star.
 *
 *   1. cena     — chão, oclusão, rocha com auto-tiling, entidades, efeitos
 *   2. luz      — mapa de luz colorido, multiplicado por cima da cena
 *   3. emissivo — halos das fontes de luz, desfocados e somados (bloom)
 *   4. final    — color grading do bioma, vinheta, grão e aberração cromática
 */

import { cellRandom, hash2d } from '../core/rng';
import type { Inimigo } from '../entities/enemies';
import type { Player } from '../entities/player';
import { itemDef } from '../game/items';
import type { Particula, Projetil, Queda, TextoFlutuante } from '../game/tipos';
import type { Lighting } from '../world/lighting';
import { ROCHA, type Paleta } from './paleta';
import { blockDef, groundDef, type BlockDef, type GroundDef } from '../world/tiles';
import type { InfoBioma } from '../world/worldgen';
import type { World } from '../world/world';
import { arestaParede, oclusaoChao, transicaoChao, E, N, NE, NO, O, S, SE, SO } from './autotile';
import { Camera } from './camera';
import { desenharGolpe, desenharInimigo, desenharJogador } from './criaturas';
import { brilhoRedondo, spriteDe } from './sprites';
import { spriteItem, temPintorItem } from './itens';

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

/**
 * Que material pende de uma parede. Nem toda a rocha pende — só a que tem
 * vegetação ou raízes por perto.
 */
function grupoPendente(def: { paleta: Paleta; sprite: string }): Paleta | null {
  switch (def.sprite) {
    case 'b_duststone':
    case 'b_argila':
      return ROCHA.rootmass;
    case 'b_rootmass':
    case 'b_lumibark':
    case 'b_ironroot':
      return ROCHA.lumibark;
    case 'b_micelio':
      return ROCHA.micelio;
    case 'b_coralstone':
    case 'b_tidebrick':
      return ROCHA.coral;
    case 'b_bonewall':
    case 'b_marrowstone':
      return ROCHA.osso;
    default:
      return null;
  }
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

  /**
   * Não há canvas intermédio: copiar a cena para o ecrã custava uma passagem
   * por todos os píxeis sem nada em troca.
   */
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
  private mundoZoom = -1;
  /** Blocos com animação própria: ficam fora do buffer e desenham-se a cada quadro. */
  private animados: { x: number; y: number; def: BlockDef }[] = [];
  /**
   * Fontes de luz visíveis, recolhidas quando o terreno é repintado. Percorrer
   * o mundo todo a cada quadro só para encontrar tochas era desperdício.
   */
  private fontes: { x: number; y: number; luz: number; cor: string; tremula: boolean }[] = [];
  /** Chãos líquidos visíveis: animam-se por cima do buffer, sem o invalidar. */
  private liquidos: { x: number; y: number; def: GroundDef }[] = [];
  private emissivoBorrado = document.createElement('canvas');
  private grao = document.createElement('canvas');
  private padraoGrao: CanvasPattern | null = null;
  /** Deslocamento fixo do grão: animá-lo a cada quadro fazia o ecrã cintilar. */
  private graoX = 0;
  private graoY = 0;
  /** Força da vinheta. É aplicada dentro do mapa de luz, não por cima do ecrã. */
  private forcaVinheta = 0.6;
  private sombraParede = document.createElement('canvas');
  private pontoLuz = document.createElement('canvas');
  private luzImg: ImageData | null = null;
  private dpr = 1;
  /** Píxeis reais por píxel de CSS (inclui a redução dinâmica de resolução). */
  private escalaPixel = 1;
  private motes: Mote[] = [];
  /** Qualidade dos efeitos: desce sozinha se o telemóvel não aguentar. */
  // Começa em média: num telemóvel, os primeiros segundos em alta davam uma
  // péssima primeira impressão antes de o ajuste automático reagir.
  qualidade: 'alta' | 'media' | 'baixa' = 'media';
  /** 'auto' deixa o jogo decidir; os outros valores fixam a qualidade. */
  modoQualidade: 'auto' | 'alta' | 'media' | 'baixa' = 'auto';
  private mediaMs = 16.7;
  private trocaQualidade = 0;
  /** Cada subida falhada torna a próxima tentativa mais lenta a chegar. */
  private tentativasSubida = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D indisponível neste dispositivo.');
    this.ctx = ctx;
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

  /**
   * Píxeis de desenho por píxel de CSS. Isto não segue o DPR do aparelho de
   * propósito: num telemóvel 1080p, desenhar a 2x é quatro vezes mais trabalho
   * para arte feita de quadrados. O que manda aqui é a taxa de preenchimento.
   */
  private escalaQualidade(): number {
    return this.qualidade === 'alta' ? 1.3 : this.qualidade === 'media' ? 1 : 0.72;
  }

  redimensionar(): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.escalaPixel = Math.min(this.dpr, this.escalaQualidade());
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    const pw = Math.max(1, Math.round(w * this.escalaPixel));
    const ph = Math.max(1, Math.round(h * this.escalaPixel));
    this.canvas.width = pw;
    this.canvas.height = ph;
    this.emissivo.width = Math.max(1, Math.round(pw / 4));
    this.emissivo.height = Math.max(1, Math.round(ph / 4));
    this.emissivoBorrado.width = this.emissivo.width;
    this.emissivoBorrado.height = this.emissivo.height;
    this.camera.redimensionar(w, h);

    const z = this.camera.zoom;
    this.mundoCols = Math.ceil(w / z) + 3;
    this.mundoLinhas = Math.ceil(h / z) + 3;
    this.mundo.width = Math.max(1, Math.round(this.mundoCols * z * this.escalaPixel));
    this.mundo.height = Math.max(1, Math.round(this.mundoLinhas * z * this.escalaPixel));
    this.mundoOrigemX = Number.NaN;
  }

  desenhar(cena: Cena, dtMs = 16): void {
    // A qualidade é decidida antes de desenhar. Se for decidida no fim, o
    // redimensionamento do canvas deixa-o em branco até ao quadro seguinte —
    // o que se vê como um flash preto de cada vez que a resolução muda.
    this.ajustarQualidade(dtMs);
    this.desenharCena(cena);
    this.aplicarLuz(cena.lighting, cena.bioma.grading);
    if (this.qualidade !== 'baixa') this.desenharEmissivo(cena);
    this.composicaoFinal(cena);
  }

  /**
   * Ajusta resolução e efeitos pelo intervalo real entre quadros.
   *
   * Cronometrar o meu próprio código não chega: grande parte do custo está na
   * composição do canvas pelo browser, que acontece depois de eu largar o
   * controlo e não aparece em nenhum `performance.now()` meu. O que o jogador
   * sente são os quadros por segundo, e é isso que se mede aqui.
   */
  private ajustarQualidade(dtMs: number): void {
    this.mediaMs = this.mediaMs * 0.92 + Math.min(200, dtMs) * 0.08;
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

    // Abaixo de ~38 quadros por segundo desce já: mais vale perder nitidez do
    // que jogar aos solavancos.
    if (desde > 1500) {
      if (this.mediaMs > 26 && this.qualidade === 'alta') {
        this.qualidade = 'media';
        this.tentativasSubida++;
      } else if (this.mediaMs > 30 && this.qualidade === 'media') {
        this.qualidade = 'baixa';
        this.tentativasSubida++;
      }
    }

    // Subir só com o ecrã praticamente cheio de quadros e depois de uma espera
    // que cresce a cada tentativa falhada, para a imagem não pulsar.
    const esperaSubida = 6000 * Math.min(8, this.tentativasSubida + 1);
    if (antes === this.qualidade && desde > esperaSubida && this.mediaMs < 17.6) {
      if (this.qualidade === 'baixa') this.qualidade = 'media';
      else if (this.qualidade === 'media') this.qualidade = 'alta';
    }

    if (antes !== this.qualidade) {
      this.trocaQualidade = agora;
      this.redimensionar();
    }
  }

  // --- 1. Cena ---------------------------------------------------------------

  private desenharCena(cena: Cena): void {
    const c = this.ctx;
    const cam = this.camera;
    c.setTransform(this.escalaPixel, 0, 0, this.escalaPixel, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#05040a';
    c.fillRect(0, 0, cam.larguraPx, cam.alturaPx);

    const area = cam.areaVisivel(1);
    const z = cam.zoom;

    // --- Terreno (chão, oclusão, sombras e rocha) ---
    this.atualizarMundo(cena);
    this.varrerVisiveis(cena);
    c.drawImage(
      this.mundo,
      Math.round(cam.paraEcraX(this.mundoOrigemX)),
      Math.round(cam.paraEcraY(this.mundoOrigemY)),
      this.mundoCols * z,
      this.mundoLinhas * z,
    );

    // Líquidos animados por cima do buffer: assim a água mexe-se sem obrigar
    // a repintar o terreno todo.
    if (this.liquidos.length > 0) {
      const quadro = Math.floor(cena.tempo * 4) & 3;
      for (const l of this.liquidos) {
        c.drawImage(
          spriteDe(l.def, l.def.sprite, quadro, l.def.paleta),
          Math.floor(cam.paraEcraX(l.x)),
          Math.floor(cam.paraEcraY(l.y)),
          z + 1,
          z + 1,
        );
      }
    }

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
      const arte = temPintorItem(def.sprite)
        ? spriteItem(def.sprite, def.paleta, undefined, def.variante ?? 0)
        : spriteDe(def, def.sprite, 0, def.paleta);
      c.drawImage(arte, px - z * 0.3, py - z * 0.34 + flut, z * 0.6, z * 0.6);
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
   * Mantém a camada de terreno actualizada.
   *
   * Quando a vista anda, o buffer é deslocado sobre si próprio e só se pintam
   * as tiras que entraram — pintar o ecrã todo a cada passo limitava a riqueza
   * que se podia pôr em cada tile.
   */
  private atualizarMundo(cena: Cena): void {
    const cam = this.camera;
    const z = cam.zoom;
    const origemX = Math.floor(cam.x - cam.larguraPx / 2 / z) - 1;
    const origemY = Math.floor(cam.y - cam.alturaPx / 2 / z) - 1;
    const mudouMundo = this.mundoVersao !== cena.world.versao;
    const mudouZoom = this.mundoZoom !== z;

    if (!mudouMundo && !mudouZoom && origemX === this.mundoOrigemX && origemY === this.mundoOrigemY) return;

    const dx = origemX - this.mundoOrigemX;
    const dy = origemY - this.mundoOrigemY;
    const podeDeslocar =
      !mudouMundo &&
      !mudouZoom &&
      Number.isFinite(dx) &&
      Number.isFinite(dy) &&
      Math.abs(dx) < this.mundoCols &&
      Math.abs(dy) < this.mundoLinhas;

    const c = this.mundoCtx;
    c.setTransform(this.escalaPixel, 0, 0, this.escalaPixel, 0, 0);
    c.imageSmoothingEnabled = false;

    this.mundoOrigemX = origemX;
    this.mundoOrigemY = origemY;
    this.mundoVersao = cena.world.versao;
    this.mundoZoom = z;

    if (!podeDeslocar) {
      c.clearRect(0, 0, this.mundoCols * z, this.mundoLinhas * z);
      this.pintarRegiao(cena, 0, 0, this.mundoCols - 1, this.mundoLinhas - 1);
      return;
    }
    if (dx === 0 && dy === 0) return;

    // Desloca o que já está pintado.
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'copy';
    c.drawImage(this.mundo, -dx * z * this.escalaPixel, -dy * z * this.escalaPixel);
    c.restore();
    c.setTransform(this.escalaPixel, 0, 0, this.escalaPixel, 0, 0);

    // E pinta só as tiras novas, com um tile de folga para as sombras e as
    // paredes erguidas não ficarem cortadas na costura.
    const folga = 2;
    if (dx > 0) this.pintarRegiao(cena, this.mundoCols - dx - folga, 0, this.mundoCols - 1, this.mundoLinhas - 1);
    else if (dx < 0) this.pintarRegiao(cena, 0, 0, -dx + folga, this.mundoLinhas - 1);
    if (dy > 0) this.pintarRegiao(cena, 0, this.mundoLinhas - dy - folga, this.mundoCols - 1, this.mundoLinhas - 1);
    else if (dy < 0) this.pintarRegiao(cena, 0, 0, this.mundoCols - 1, -dy + folga);
  }

  /** Pinta uma zona do buffer, em coordenadas locais de tile. */
  private pintarRegiao(cena: Cena, lx0: number, ly0: number, lx1: number, ly1: number): void {
    const c = this.mundoCtx;
    const world = cena.world;
    const seed = world.seed;
    const z = this.camera.zoom;
    const origemX = this.mundoOrigemX;
    const origemY = this.mundoOrigemY;

    lx0 = Math.max(0, lx0);
    ly0 = Math.max(0, ly0);
    lx1 = Math.min(this.mundoCols - 1, lx1);
    ly1 = Math.min(this.mundoLinhas - 1, ly1);
    if (lx1 < lx0 || ly1 < ly0) return;

    c.clearRect(lx0 * z, ly0 * z, (lx1 - lx0 + 1) * z, (ly1 - ly0 + 1) * z);

    // --- Chão, orlas entre materiais, decalques e oclusão ---
    for (let ly = ly0; ly <= ly1; ly++) {
      for (let lx = lx0; lx <= lx1; lx++) {
        const x = origemX + lx;
        const y = origemY + ly;
        const sx = lx * z;
        const sy = ly * z;
        const g = groundDef(world.chao(x, y));
        const v = hash2d(x, y, seed) & 7;
        c.drawImage(spriteDe(g, g.sprite, v & 3, g.paleta), sx, sy, z + 1, z + 1);

        // O chão vizinho invade este, com uma orla irregular.
        const lados = [
          [0, world.chao(x, y - 1)],
          [1, world.chao(x, y + 1)],
          [2, world.chao(x + 1, y)],
          [3, world.chao(x - 1, y)],
        ] as const;
        for (const [lado, idVizinho] of lados) {
          if (idVizinho === g.id) continue;
          const vizinho = groundDef(idVizinho);
          if (vizinho.liquido) continue;
          c.drawImage(transicaoChao(lado, vizinho.paleta), sx, sy, z + 1, z + 1);
        }

        // Detalhe espalhado: pedras, fissuras, ossos, sucata.
        const dec = g.decalques;
        if (dec && cellRandom(x, y, seed + 7717) < dec.hipotese) {
          const qual = dec.chaves[hash2d(x, y, seed + 31) % dec.chaves.length];
          c.drawImage(spriteDe(dec, qual, v & 3, g.paleta), sx, sy, z + 1, z + 1);
        }

        if (world.solido(x, y)) continue;
        const ao = oclusaoChao(this.mascara(world, x, y));
        if (ao) c.drawImage(ao, sx, sy, z + 1, z + 1);
      }
    }

    // --- Sombras projectadas pela rocha ---
    for (let ly = ly0; ly <= ly1; ly++) {
      for (let lx = lx0; lx <= lx1; lx++) {
        const x = origemX + lx;
        const y = origemY + ly;
        const def = blockDef(world.bloco(x, y));
        if (!def.parede || !def.solido || world.solido(x, y + 1)) continue;
        c.drawImage(this.sombraParede, lx * z - z * 0.08, (ly + 1) * z, z * 1.16, z * 0.55);
      }
    }

    // --- Rocha, com silhueta arredondada onde está exposta ---
    // Face frontal alta: é o que faz a rocha parecer um volume e não um azulejo.
    const altura = Math.round(z * 0.26);
    for (let ly = ly0; ly <= ly1; ly++) {
      for (let lx = lx0; lx <= lx1; lx++) {
        const x = origemX + lx;
        const y = origemY + ly;
        const id = world.bloco(x, y);
        if (id === 0) continue;
        const def = blockDef(id);
        if (def.anima) continue;

        const v = hash2d(x, y, seed + 9) & 3;
        const sx = lx * z;
        const sy = ly * z;
        const img = spriteDe(def, def.sprite, v, def.paleta);
        const sobe = def.parede ? altura : 0;
        const m = def.parede ? this.mascaraParede(world, x, y) : 0;

        c.save();
        if (def.parede && m) {
          // Cantos arredondados só onde os dois lados estão livres: é o que
          // dá à rocha um contorno orgânico em vez de um quadrado perfeito.
          const r = z * 0.28;
          const cima = (m & N) !== 0;
          const baixo = (m & S) !== 0;
          const dir = (m & E) !== 0;
          const esq = (m & O) !== 0;
          this.caminhoRocha(
            c, sx, sy - sobe, z, z + sobe,
            cima && esq ? r : 0,
            cima && dir ? r : 0,
            baixo && dir ? r : 0,
            baixo && esq ? r : 0,
          );
          c.clip();
        }

        const exposta = def.parede && !world.solido(x, y + 1);
        if (exposta) {
          // A face usa a faixa de baixo do sprite, esticada e escurecida, com
          // um degrau de luz em cima e sombra de contacto no fundo.
          c.drawImage(img, 0, 20, 32, 12, sx, sy + z - altura, z + 1, altura + 1);
          c.fillStyle = 'rgba(0,0,0,0.45)';
          c.fillRect(sx, sy + z - altura, z + 1, altura + 1);
          c.fillStyle = def.paleta.escuro;
          c.globalAlpha = 0.6;
          c.fillRect(sx, sy + z - altura, z + 1, 2);
          c.globalAlpha = 1;
          c.fillStyle = 'rgba(0,0,0,0.5)';
          c.fillRect(sx, sy + z - 2, z + 1, 2);
          c.fillStyle = def.paleta.contorno;
          c.fillRect(sx, sy + z, z + 1, 1);
        }

        c.drawImage(img, sx, sy - sobe, z + 1, z + 1);
        if (m) c.drawImage(arestaParede(m, def.paleta), sx, sy - sobe, z + 1, z + 1);

        // Coroa no topo: pedras assentes no rebordo iluminado.
        if (def.parede && (m & N) && cellRandom(x, y, seed + 991) < 0.3) {
          c.drawImage(spriteDe(def, 'r_coroa', v, def.paleta), sx, sy - sobe - z, z + 1, z + 1);
        }
        c.restore();

        // Vegetação e raízes a pender da rocha para o chão de baixo.
        if (exposta && def.paleta !== undefined && cellRandom(x, y, seed + 1777) < 0.34) {
          const pendura = grupoPendente(def);
          if (pendura) c.drawImage(spriteDe(pendura, 'r_pendente', v, pendura), sx, sy + z, z + 1, z + 1);
        }
      }
    }
  }

  /** Rectângulo com raio próprio em cada canto. */
  private caminhoRocha(
    c: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    rNO: number, rNE: number, rSE: number, rSO: number,
  ): void {
    c.beginPath();
    c.moveTo(x + rNO, y);
    c.lineTo(x + w - rNE, y);
    if (rNE) c.quadraticCurveTo(x + w, y, x + w, y + rNE);
    c.lineTo(x + w, y + h - rSE);
    if (rSE) c.quadraticCurveTo(x + w, y + h, x + w - rSE, y + h);
    c.lineTo(x + rSO, y + h);
    if (rSO) c.quadraticCurveTo(x, y + h, x, y + h - rSO);
    c.lineTo(x, y + rNO);
    if (rNO) c.quadraticCurveTo(x, y, x + rNO, y);
    c.closePath();
  }

  /**
   * Percorre a área visível e recolhe o que se desenha ao vivo por cima do
   * buffer: líquidos, objectos com chama e fontes de luz.
   */
  private varrerVisiveis(cena: Cena): void {
    const cam = this.camera;
    const area = cam.areaVisivel(1);
    const world = cena.world;
    this.animados.length = 0;
    this.fontes.length = 0;
    this.liquidos.length = 0;

    for (let y = area.y0; y <= area.y1; y++) {
      for (let x = area.x0; x <= area.x1; x++) {
        const g = groundDef(world.chao(x, y));
        if (g.anima) this.liquidos.push({ x, y, def: g });
        if (g.luz && g.luz > 0.2) {
          const [r, gg, b] = g.corLuz ?? [1, 0.85, 0.6];
          this.fontes.push({ x, y, luz: g.luz, cor: corLuz(r, gg, b), tremula: true });
        }
        const id = world.bloco(x, y);
        if (id === 0) continue;
        const def = blockDef(id);
        if (def.anima) this.animados.push({ x, y, def });
        if (def.luz && def.luz > 0.2) {
          const [r, gg, b] = def.corLuz ?? [1, 0.85, 0.6];
          this.fontes.push({ x, y, luz: def.luz, cor: corLuz(r, gg, b), tremula: def.anima === true });
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
    const cam = this.camera;
    const w = luz.w;
    const h = luz.h;
    if (w === 0 || h === 0) return;
    if (this.luzCanvas.width !== w || this.luzCanvas.height !== h) {
      this.luzCanvas.width = w;
      this.luzCanvas.height = h;
      this.luzImg = this.luzCtx.createImageData(w, h);
    }
    if (!this.luzImg) return;
    // A vinheta entra aqui, numa imagem de umas centenas de píxeis, em vez de
    // ser mais uma passagem por cima do ecrã inteiro.
    luz.escreverImagem(this.luzImg, grading, {
      centroX: cam.x - luz.x + 0.5,
      centroY: cam.y - luz.y + 0.5,
      raio: (Math.max(cam.larguraPx, cam.alturaPx) / cam.zoom) * 0.62,
      forca: this.forcaVinheta,
    });
    this.luzCtx.putImageData(this.luzImg, 0, 0);

    const c = this.ctx;
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

  /**
   * O que sobra depois da luz: brilho somado, grão opcional e os avisos de dano.
   * Cada uma destas linhas passa por todos os píxeis do ecrã, por isso são
   * poucas e quase todas condicionais.
   */
  private composicaoFinal(cena: Cena): void {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;

    const pw = this.canvas.width;
    const ph = this.canvas.height;

    // Brilho: já vem desfocado pela própria ampliação do buffer pequeno.
    if (this.qualidade !== 'baixa') {
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.imageSmoothingEnabled = true;
      c.globalAlpha = 0.9;
      c.drawImage(this.emissivo, 0, 0, pw, ph);
      c.restore();
    }

    // Grão de filme: textura fixa, só no nível alto.
    if (this.qualidade === 'alta' && this.padraoGrao) {
      c.save();
      c.globalAlpha = 0.26;
      c.translate(this.graoX, this.graoY);
      c.fillStyle = this.padraoGrao;
      c.fillRect(0, 0, pw + 128, ph + 128);
      c.restore();
    }

    // Avisos de dano: só custam quando estás mesmo a levar porrada.
    if (cena.dor > 0.01) {
      c.fillStyle = `rgba(150,20,20,${(0.4 * cena.dor).toFixed(3)})`;
      c.fillRect(0, 0, pw, ph);
    }
    const p = cena.player;
    const fraco = 1 - Math.min(1, p.vida / (p.vidaMax * 0.3));
    if (fraco > 0.01 && !p.morto) {
      const pulso = 0.22 + Math.sin(cena.tempo * 5) * 0.12;
      c.fillStyle = `rgba(140,10,10,${(fraco * pulso).toFixed(3)})`;
      c.fillRect(0, 0, pw, ph);
    }
  }

}
