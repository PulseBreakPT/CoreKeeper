/**
 * O bestiário, desenhado como pixel art.
 *
 * Cada criatura é pintada uma vez por quadro de animação para um canvas e
 * depois é só copiada — sai mais barato que desenhar vectores a cada frame e,
 * sobretudo, permite pôr detalhe a sério: contorno fechado, quatro tons,
 * textura de material, olhos com brilho e peças próprias de cada espécie.
 */

import { mulberry32 } from '../core/rng';
import type { Paleta } from './paleta';
import { MINERAL, ROCHA } from './paleta';
import {
  brilho, caixa, dentes, elipse, marca, membro, olho, olhos, poligono, volume,
  type Caminho, type Ctx,
} from './pixel';

export type Pintor = (c: Ctx, s: number, p: Paleta, q: number) => void;

/** Deslocamento de passo para o quadro `q` (0..3). */
function passo(q: number, amplitude: number): number {
  return [0, amplitude, 0, -amplitude][q & 3];
}

/** Sobe e desce, meio quadro fora de fase com o passo. */
function balanco(q: number, amplitude: number): number {
  return [amplitude, 0, amplitude, 0][q & 3];
}

// --- Larvas ------------------------------------------------------------------

const larva: Pintor = (c, s, p, q) => {
  const onda = (i: number) => Math.sin((q / 4) * Math.PI * 2 + i * 0.9) * 0.035;

  // Segmentos de trás para a frente, cada um com o seu par de patas.
  for (let i = 4; i >= 1; i--) {
    const f = i / 4;
    const y = 0.42 + f * 0.36;
    const raio = 0.3 - f * 0.1;
    const dx = onda(i);
    membro(c, s, [[0.5 + dx - raio, y], [0.5 + dx - raio - 0.07, y + 0.07]], 0.035, p);
    membro(c, s, [[0.5 + dx + raio, y], [0.5 + dx + raio + 0.07, y + 0.07]], 0.035, p);
    volume(c, s, p, elipse(0.5 + dx, y, raio, raio * 0.82), {
      textura: 'placas', seed: 10 + i, luz: 0.34,
    });
  }

  // Cabeça, maior e mais clara.
  const dxCabeca = onda(0);
  volume(c, s, p, elipse(0.5 + dxCabeca, 0.36, 0.34, 0.3), { textura: 'placas', seed: 3, luz: 0.4 });

  // Antenas com ponta luminosa.
  for (const lado of [-1, 1]) {
    membro(
      c, s,
      [[0.5 + dxCabeca + lado * 0.12, 0.2], [0.5 + dxCabeca + lado * 0.24, 0.1], [0.5 + dxCabeca + lado * 0.2, 0.03]],
      0.03, p, 'claro',
    );
    brilho(c, s, 0.5 + dxCabeca + lado * 0.2, 0.03, 0.12, `${p.acento}88`, 0.7);
    c.fillStyle = p.acento;
    c.beginPath();
    c.arc((0.5 + dxCabeca + lado * 0.2) * s, 0.03 * s, Math.max(1, s * 0.03), 0, Math.PI * 2);
    c.fill();
  }

  olhos(c, s, 0.5 + dxCabeca, 0.32, 0.13, 0.055, '#1b1020');

  // Mandíbulas que abrem e fecham.
  const abre = [0.02, 0.05, 0.02, 0][q & 3];
  for (const lado of [-1, 1]) {
    marca(
      c, s,
      poligono([
        [0.5 + dxCabeca + lado * 0.16, 0.5],
        [0.5 + dxCabeca + lado * (0.3 + abre), 0.56],
        [0.5 + dxCabeca + lado * 0.14, 0.6],
      ]),
      p.contorno,
    );
  }
  // Boca com dentes pequenos.
  dentes(c, s, 0.4 + dxCabeca, 0.6 + dxCabeca, 0.5, 0.05, 5, '#e8d8c0');
};

// --- Limos -------------------------------------------------------------------

const limo: Pintor = (c, s, p, q) => {
  const esmaga = balanco(q, 0.03);
  // Silhueta com lascas a espetar: um círculo não se distingue de nada.
  const corpo = poligono([
    [0.1, 0.62 + esmaga], [0.16, 0.4 + esmaga], [0.26, 0.46 + esmaga], [0.3, 0.24 + esmaga],
    [0.42, 0.38 + esmaga], [0.52, 0.18 + esmaga], [0.6, 0.4 + esmaga], [0.72, 0.3 + esmaga],
    [0.76, 0.5 + esmaga], [0.9, 0.58 + esmaga], [0.86, 0.86], [0.14, 0.86],
  ]);

  volume(c, s, p, corpo, { textura: 'crosta', seed: 11, luz: 0.36 });

  // Placas de crosta soltas por cima, com sombra própria.
  const r = mulberry32(4242);
  c.save();
  corpo(c, s);
  c.clip();
  for (let i = 0; i < 5; i++) {
    const x = 0.14 + r() * 0.7;
    const y = 0.32 + r() * 0.42;
    const w = 0.1 + r() * 0.14;
    const h = 0.07 + r() * 0.1;
    marca(c, s, caixa(x, y + esmaga, w, h, 0.02), p.claro);
    marca(c, s, caixa(x, y + h + esmaga, w, 0.015, 0), p.contorno, 0.6);
  }
  c.restore();

  // Núcleo quente a espreitar por uma fenda.
  brilho(c, s, 0.5, 0.62 + esmaga, 0.2, '#ffae5caa', 0.7);
  marca(c, s, elipse(0.5, 0.62 + esmaga, 0.08, 0.06), '#ffbe6a');
  marca(c, s, elipse(0.5, 0.62 + esmaga, 0.04, 0.03), '#fff0c8');

  olhos(c, s, 0.5, 0.5 + esmaga, 0.14, 0.055, '#150f12');
};

// --- Verme (Goruun) ----------------------------------------------------------

const verme: Pintor = (c, s, p, q) => {
  // Cauda em anéis, a sair pelo fundo.
  for (let i = 5; i >= 1; i--) {
    const f = i / 5;
    const dx = Math.sin((q / 4) * Math.PI * 2 + i * 0.7) * 0.05;
    volume(c, s, p, elipse(0.5 + dx, 0.5 + f * 0.42, 0.4 - f * 0.12, 0.2), {
      textura: 'placas', seed: 20 + i, luz: 0.3,
    });
  }

  // Presas curvas a sair do anel: dão-lhe silhueta em vez de uma bola.
  for (const lado of [-1, 1]) {
    marca(c, s, poligono([
      [0.5 + lado * 0.3, 0.3], [0.5 + lado * 0.62, 0.02], [0.5 + lado * 0.5, 0.26],
    ]), p.contorno);
    marca(c, s, poligono([
      [0.5 + lado * 0.32, 0.3], [0.5 + lado * 0.58, 0.07], [0.5 + lado * 0.48, 0.26],
    ]), '#e8dcc0');
    marca(c, s, poligono([
      [0.5 + lado * 0.26, 0.72], [0.5 + lado * 0.56, 0.9], [0.5 + lado * 0.44, 0.72],
    ]), p.escuro);
  }

  // Corpo principal.
  volume(c, s, p, elipse(0.5, 0.46, 0.46, 0.42), { textura: 'placas', seed: 5, luz: 0.36 });

  // Boca circular: anel escuro, garganta e dentes em roda.
  marca(c, s, elipse(0.5, 0.44, 0.3, 0.28), p.contorno);
  marca(c, s, elipse(0.5, 0.44, 0.26, 0.24), '#20111a');
  brilho(c, s, 0.5, 0.44, 0.24, '#ff6a6a33', 0.5);
  marca(c, s, elipse(0.5, 0.46, 0.12, 0.1), '#7a2230');

  const giro = (q / 4) * 0.4;
  c.fillStyle = '#efe0c8';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + giro;
    const bx = 0.5 + Math.cos(a) * 0.27;
    const by = 0.44 + Math.sin(a) * 0.25;
    const ix = 0.5 + Math.cos(a) * 0.15;
    const iy = 0.44 + Math.sin(a) * 0.14;
    c.beginPath();
    c.moveTo((bx + Math.cos(a + 1.4) * 0.05) * s, (by + Math.sin(a + 1.4) * 0.05) * s);
    c.lineTo(ix * s, iy * s);
    c.lineTo((bx + Math.cos(a - 1.4) * 0.05) * s, (by + Math.sin(a - 1.4) * 0.05) * s);
    c.closePath();
    c.fill();
  }

  // Pequenos olhos em cima da boca.
  olhos(c, s, 0.5, 0.14, 0.16, 0.045, p.acento);
};

// --- Besouros ----------------------------------------------------------------

function besouro(detalhe: string): Pintor {
  return (c, s, p, q) => {
    const pa = passo(q, 0.035);

    // Seis patas, três de cada lado, em contratempo.
    for (const lado of [-1, 1]) {
      for (let j = 0; j < 3; j++) {
        const y = 0.42 + j * 0.16;
        const desvio = (j % 2 === 0 ? pa : -pa) * lado;
        membro(
          c, s,
          [[0.5 + lado * 0.28, y], [0.5 + lado * 0.44, y + 0.04 + desvio], [0.5 + lado * 0.5, y + 0.16 + desvio]],
          0.04, p,
        );
      }
    }

    // Tórax e carapaça.
    volume(c, s, p, elipse(0.5, 0.56, 0.4, 0.36), { textura: 'placas', seed: 8, luz: 0.34 });
    // Linha que separa os élitros.
    marca(c, s, caixa(0.49, 0.24, 0.02, 0.66, 0), p.contorno, 0.8);
    marca(c, s, caixa(0.5, 0.24, 0.012, 0.66, 0), p.claro, 0.35);

    // Cabeça e corno.
    volume(c, s, p, elipse(0.5, 0.26, 0.2, 0.15), { textura: 'liso', seed: 9, luz: 0.4, semBrilho: true });
    marca(c, s, poligono([[0.46, 0.2], [0.5, 0.05], [0.54, 0.2]]), p.claro);
    marca(c, s, poligono([[0.475, 0.19], [0.5, 0.09], [0.525, 0.19]]), p.acento, 0.6);

    // Antenas.
    for (const lado of [-1, 1]) {
      membro(c, s, [[0.5 + lado * 0.1, 0.2], [0.5 + lado * 0.24, 0.12], [0.5 + lado * 0.3, 0.05]], 0.025, p, 'claro');
    }

    olhos(c, s, 0.5, 0.26, 0.11, 0.04, detalhe === 'lanterna' ? p.acento : '#140d16');

    if (detalhe === 'tempestade') {
      // Arcos eléctricos presos ao casco.
      c.strokeStyle = p.acento;
      c.lineWidth = Math.max(1, s * 0.025);
      c.globalAlpha = [0.9, 0.35, 0.7, 0.2][q & 3];
      for (let i = 0; i < 2; i++) {
        const a = i * 2.2 + (q / 4) * 3;
        c.beginPath();
        c.moveTo((0.5 + Math.cos(a) * 0.32) * s, (0.56 + Math.sin(a) * 0.28) * s);
        c.lineTo((0.5 + Math.cos(a + 0.9) * 0.14) * s, (0.56 + Math.sin(a + 0.9) * 0.12) * s);
        c.lineTo((0.5 + Math.cos(a + 1.9) * 0.34) * s, (0.56 + Math.sin(a + 1.9) * 0.3) * s);
        c.stroke();
      }
      c.globalAlpha = 1;
      brilho(c, s, 0.5, 0.56, 0.6, `${p.acento}55`, 0.6);
    } else if (detalhe === 'placas') {
      // Placas minerais sobrepostas à frente, como um escudo.
      for (let i = 0; i < 3; i++) {
        const y = 0.34 + i * 0.16;
        volume(c, s, p, elipse(0.5, y, 0.38 - i * 0.04, 0.08), { textura: 'liso', luz: 0.5, semBrilho: true });
      }
    } else if (detalhe === 'lanterna') {
      brilho(c, s, 0.5, 0.72, 0.5, `${p.acento}88`, 0.8);
      marca(c, s, elipse(0.5, 0.74, 0.12, 0.1), p.acento);
      marca(c, s, elipse(0.5, 0.73, 0.06, 0.05), '#ffffff');
    }
  };
}

// --- Aracnídeos --------------------------------------------------------------

function aracnideo(detalhe: string): Pintor {
  return (c, s, p, q) => {
    const pa = passo(q, 0.05);

    // Oito patas com joelho alto.
    for (const lado of [-1, 1]) {
      for (let j = 0; j < 4; j++) {
        const base = 0.36 + j * 0.06;
        const alcance = 0.3 + j * 0.06;
        const desvio = (j % 2 === 0 ? pa : -pa) * lado;
        membro(
          c, s,
          [
            [0.5 + lado * 0.1, base],
            [0.5 + lado * (alcance + 0.08), base - 0.16 + desvio],
            [0.5 + lado * (alcance + 0.2), base + 0.34 + desvio],
          ],
          0.035, p,
        );
      }
    }

    // Abdómen atrás, cefalotórax à frente.
    volume(c, s, p, elipse(0.5, 0.66, 0.33, 0.28), { textura: detalhe === 'vidro' ? 'gosma' : 'pelo', seed: 13 });
    volume(c, s, p, elipse(0.5, 0.38, 0.26, 0.22), { textura: 'liso', luz: 0.4 });

    // Quelíceras.
    for (const lado of [-1, 1]) {
      marca(c, s, poligono([[0.5 + lado * 0.06, 0.48], [0.5 + lado * 0.16, 0.6], [0.5 + lado * 0.02, 0.56]]), p.contorno);
    }

    // Oito olhos: dois grandes à frente, seis pequenos.
    olhos(c, s, 0.5, 0.34, 0.09, 0.045, p.acento);
    olhos(c, s, 0.5, 0.42, 0.14, 0.025, '#16101a');
    olhos(c, s, 0.5, 0.42, 0.05, 0.022, '#16101a');

    if (detalhe === 'tecelao') {
      // Placas de osso presas ao abdómen, como armadura improvisada.
      const r = mulberry32(777);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        const x = 0.5 + Math.cos(a) * 0.22;
        const y = 0.66 + Math.sin(a) * 0.2;
        c.save();
        c.translate(x * s, y * s);
        c.rotate(a);
        marca(c, s, caixa(-0.07, -0.025, 0.14, 0.05, 0.01), '#e4d9bf');
        marca(c, s, caixa(-0.07, 0.01, 0.14, 0.015, 0), '#9a8e74');
        c.restore();
        void r;
      }
    } else if (detalhe === 'vidro') {
      brilho(c, s, 0.5, 0.66, 0.4, `${p.acento}55`, 0.5);
    }
  };
}

// --- Humanoides --------------------------------------------------------------

function humanoide(detalhe: string): Pintor {
  return (c, s, p, q) => {
    const pa = passo(q, 0.04);
    const sobe = balanco(q, 0.012);
    const magro = detalhe === 'osso';
    const largo = detalhe === 'cavaleiro' || detalhe === 'raiz';
    const larg = magro ? 0.26 : largo ? 0.42 : 0.34;

    // Pernas.
    volume(c, s, p, caixa(0.5 - larg * 0.5, 0.66 + pa, larg * 0.36, 0.28, 0.03), { textura: 'liso', semBrilho: true });
    volume(c, s, p, caixa(0.5 + larg * 0.14, 0.66 - pa, larg * 0.36, 0.28, 0.03), { textura: 'liso', semBrilho: true });

    // Tronco.
    const textura = detalhe === 'osso' ? 'osso' : detalhe === 'raiz' ? 'pelo' : detalhe === 'cavaleiro' ? 'metal' : 'liso';
    volume(c, s, p, caixa(0.5 - larg / 2, 0.36 - sobe, larg, 0.34, 0.06), { textura, seed: 17, luz: 0.34 });

    // Braços.
    volume(c, s, p, caixa(0.5 - larg / 2 - 0.09, 0.38 + pa * 0.6 - sobe, 0.09, 0.28, 0.03), {
      textura: 'liso', semBrilho: true, luz: 0.3,
    });
    volume(c, s, p, caixa(0.5 + larg / 2, 0.38 - pa * 0.6 - sobe, 0.09, 0.28, 0.03), {
      textura: 'liso', semBrilho: true, luz: 0.3,
    });

    switch (detalhe) {
      case 'fungo': {
        volume(c, s, p, elipse(0.5, 0.3 - sobe, 0.12, 0.11), { textura: 'liso', luz: 0.45 });
        olhos(c, s, 0.5, 0.3 - sobe, 0.06, 0.03, '#120a18');
        // Chapéu com lamelas por baixo e pintas em cima.
        volume(c, s, p, poligono([
          [0.08, 0.3 - sobe], [0.2, 0.12 - sobe], [0.5, 0.02 - sobe], [0.8, 0.12 - sobe], [0.92, 0.3 - sobe],
        ]), { textura: 'liso', luz: 0.5 });
        // Lamelas por baixo do chapéu.
        c.fillStyle = p.escuro;
        for (let i = 0; i < 9; i++) c.fillRect((0.1 + i * 0.09) * s, (0.28 - sobe) * s, s * 0.02, s * 0.04);
        marca(c, s, caixa(0.08, 0.28 - sobe, 0.84, 0.03, 0.01), p.contorno, 0.7);
        for (const [dx, dy, rr] of [[-0.16, 0.19, 0.035], [0.04, 0.15, 0.045], [0.2, 0.21, 0.03]]) {
          marca(c, s, elipse(0.5 + dx, dy - sobe, rr, rr * 0.8), p.acento);
          marca(c, s, elipse(0.5 + dx - rr * 0.3, dy - sobe - rr * 0.3, rr * 0.35, rr * 0.3), '#ffffff', 0.5);
        }
        // Esporos a subir.
        c.globalAlpha = 0.45;
        c.fillStyle = p.acento;
        for (let i = 0; i < 3; i++) {
          const y = 0.06 - ((q / 4 + i * 0.33) % 1) * 0.08;
          c.beginPath();
          c.arc((0.34 + i * 0.16) * s, y * s, Math.max(1, s * 0.018), 0, Math.PI * 2);
          c.fill();
        }
        c.globalAlpha = 1;
        break;
      }
      case 'espinho': {
        volume(c, s, p, elipse(0.5, 0.3 - sobe, 0.11, 0.12), { textura: 'liso', luz: 0.4 });
        olhos(c, s, 0.5, 0.3 - sobe, 0.05, 0.025, p.acento);
        // Folhas presas ao corpo.
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.5;
          c.save();
          c.translate((0.5 + Math.cos(a) * 0.18) * s, (0.5 + Math.sin(a) * 0.18 - sobe) * s);
          c.rotate(a);
          marca(c, s, elipse(0, 0, 0.1, 0.035), p.escuro);
          marca(c, s, elipse(-0.01, -0.005, 0.07, 0.02), p.claro);
          c.restore();
        }
        // Braços em lâmina.
        for (const lado of [-1, 1]) {
          marca(
            c, s,
            poligono([
              [0.5 + lado * (larg / 2 + 0.04), 0.5],
              [0.5 + lado * (larg / 2 + 0.22), 0.8],
              [0.5 + lado * (larg / 2 + 0.02), 0.68],
            ]),
            p.claro,
          );
        }
        break;
      }
      case 'raiz': {
        // Sem cabeça: um emaranhado de raízes com luz por dentro.
        for (let i = 0; i < 5; i++) {
          const dx = (i - 2) * 0.09;
          membro(c, s, [[0.5, 0.4], [0.5 + dx * 1.6, 0.2], [0.5 + dx * 2.2, 0.06]], 0.035, p, 'escuro');
        }
        volume(c, s, p, elipse(0.5, 0.32 - sobe, 0.16, 0.13), { textura: 'pelo', seed: 21, luz: 0.4 });
        brilho(c, s, 0.5, 0.32, 0.26, `${p.acento}66`, 0.6);
        olhos(c, s, 0.5, 0.32 - sobe, 0.07, 0.03, p.acento);
        break;
      }
      case 'osso': {
        // Costelas à vista e crânio.
        marca(c, s, caixa(0.5 - larg / 2, 0.38 - sobe, larg, 0.3, 0.02), p.contorno, 0.85);
        for (let i = 0; i < 4; i++) {
          marca(c, s, caixa(0.5 - larg * 0.44, 0.4 + i * 0.07 - sobe, larg * 0.88, 0.035, 0.015), p.claro);
        }
        marca(c, s, caixa(0.5 - 0.02, 0.38 - sobe, 0.04, 0.3, 0), p.base);
        volume(c, s, p, elipse(0.5, 0.26 - sobe, 0.15, 0.16), { textura: 'osso', seed: 4, luz: 0.42 });
        // Órbitas fundas.
        marca(c, s, elipse(0.44, 0.25 - sobe, 0.045, 0.055), '#100c0a');
        marca(c, s, elipse(0.56, 0.25 - sobe, 0.045, 0.055), '#100c0a');
        c.globalAlpha = 0.8;
        olhos(c, s, 0.5, 0.25 - sobe, 0.06, 0.018, p.acento);
        c.globalAlpha = 1;
        dentes(c, s, 0.43, 0.57, 0.33 - sobe, 0.035, 5);
        break;
      }
      default: {
        // Cavaleiro: ombreiras, elmo fechado e penacho.
        volume(c, s, p, caixa(0.5 - larg / 2 - 0.06, 0.34 - sobe, larg + 0.12, 0.1, 0.04), {
          textura: 'metal', seed: 6, luz: 0.45,
        });
        volume(c, s, p, elipse(0.5, 0.24 - sobe, 0.15, 0.16), { textura: 'metal', seed: 12, luz: 0.4 });
        marca(c, s, caixa(0.38, 0.22 - sobe, 0.24, 0.06, 0.01), '#0d0a10');
        marca(c, s, caixa(0.4, 0.235 - sobe, 0.07, 0.03, 0), p.acento);
        marca(c, s, caixa(0.53, 0.235 - sobe, 0.07, 0.03, 0), p.acento);
        marca(c, s, poligono([[0.47, 0.1 - sobe], [0.5, 0.0 - sobe], [0.53, 0.1 - sobe]]), p.claro);
        marca(c, s, caixa(0.48, 0.44 - sobe, 0.04, 0.24, 0), p.acento, 0.7);
        break;
      }
    }
  };
}

export const PINTORES: Record<string, Pintor> = {
  'larva:': larva,
  'limo:': limo,
  'verme:': verme,
  'besouro:placas': besouro('placas'),
  'besouro:tempestade': besouro('tempestade'),
  'besouro:lanterna': besouro('lanterna'),
  'besouro:': besouro(''),
  'aracnideo:vidro': aracnideo('vidro'),
  'aracnideo:medula': aracnideo('medula'),
  'aracnideo:tecelao': aracnideo('tecelao'),
  'aracnideo:': aracnideo(''),
  'humanoide:fungo': humanoide('fungo'),
  'humanoide:espinho': humanoide('espinho'),
  'humanoide:raiz': humanoide('raiz'),
  'humanoide:osso': humanoide('osso'),
  'humanoide:cavaleiro': humanoide('cavaleiro'),
  'humanoide:': humanoide('cavaleiro'),
};


// --- Máquinas ----------------------------------------------------------------

function maquina(detalhe: string): Pintor {
  return (c, s, p, q) => {
    if (detalhe === 'drone') {
      // Flutua: rotor por cima, casco redondo, um olho só.
      const flutua = balanco(q, 0.02);
      c.strokeStyle = p.claro;
      c.lineWidth = Math.max(1, s * 0.03);
      c.globalAlpha = [0.9, 0.3, 0.9, 0.3][q & 3];
      c.beginPath();
      c.ellipse(0.5 * s, (0.18 + flutua) * s, 0.42 * s, 0.05 * s, 0, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 1;
      volume(c, s, p, caixa(0.46, 0.16 + flutua, 0.08, 0.12, 0.01), { textura: 'liso', semBrilho: true });
      // Tubeiras laterais e antena: sem elas o drone é uma bola.
      for (const lado of [-1, 1]) {
        volume(c, s, p, poligono([
          [0.5 + lado * 0.3, 0.42 + flutua], [0.5 + lado * 0.62, 0.34 + flutua],
          [0.5 + lado * 0.66, 0.56 + flutua], [0.5 + lado * 0.34, 0.62 + flutua],
        ]), { textura: 'metal', seed: 32, luz: 0.3 });
        marca(c, s, caixa(0.5 + lado * 0.62 - 0.03, 0.4 + flutua, 0.06, 0.14, 0.01), '#ff8a3c', 0.6);
      }
      membro(c, s, [[0.5, 0.28 + flutua], [0.62, 0.12 + flutua]], 0.02, p, 'claro');
      marca(c, s, elipse(0.63, 0.11 + flutua, 0.04, 0.04), p.acento);
      volume(c, s, p, elipse(0.5, 0.52 + flutua, 0.36, 0.34), { textura: 'metal', seed: 31, luz: 0.36 });
      marca(c, s, elipse(0.5, 0.52 + flutua, 0.16, 0.15), p.contorno);
      brilho(c, s, 0.5, 0.52 + flutua, 0.4, `${p.acento}77`, 0.7);
      marca(c, s, elipse(0.5 + [0.03, 0, -0.03, 0][q & 3], 0.52 + flutua, 0.08, 0.08), p.acento);
      marca(c, s, elipse(0.5, 0.5 + flutua, 0.03, 0.03), '#ffffff');
      // Tubos de exaustão.
      for (const lado of [-1, 1]) {
        volume(c, s, p, caixa(0.5 + lado * 0.36 - 0.04, 0.6 + flutua, 0.08, 0.14, 0.02), {
          textura: 'liso', semBrilho: true, luz: 0.3,
        });
      }
      return;
    }

    const pa = passo(q, 0.025);

    // Rastos ou pés.
    volume(c, s, p, caixa(0.14, 0.78 + pa, 0.26, 0.16, 0.03), { textura: 'liso', semBrilho: true, luz: 0.25 });
    volume(c, s, p, caixa(0.6, 0.78 - pa, 0.26, 0.16, 0.03), { textura: 'liso', semBrilho: true, luz: 0.25 });

    // Chassis com painéis e rebites.
    volume(c, s, p, caixa(0.14, 0.32, 0.72, 0.5, 0.06), { textura: 'metal', seed: 33, luz: 0.36 });
    for (let i = 0; i < 3; i++) marca(c, s, caixa(0.22, 0.42 + i * 0.11, 0.56, 0.035, 0.01), p.contorno, 0.6);

    // Cabeça-sensor com varrimento.
    volume(c, s, p, caixa(0.26, 0.16, 0.48, 0.16, 0.04), { textura: 'metal', seed: 34, luz: 0.45 });
    marca(c, s, caixa(0.3, 0.2, 0.4, 0.08, 0.02), '#0b0910');
    const varre = [-0.1, 0, 0.1, 0][q & 3];
    marca(c, s, caixa(0.46 + varre, 0.21, 0.08, 0.06, 0.01), p.acento);
    brilho(c, s, 0.5 + varre, 0.24, 0.25, `${p.acento}66`, 0.6);

    if (detalhe === 'sentinela') {
      // Escudo de um lado, lança térmica do outro.
      volume(c, s, p, caixa(0.0, 0.3, 0.16, 0.52, 0.04), { textura: 'metal', seed: 35, luz: 0.5 });
      marca(c, s, caixa(0.04, 0.46, 0.08, 0.2, 0.02), p.acento, 0.8);
      volume(c, s, p, caixa(0.84, 0.46, 0.16, 0.07, 0.02), { textura: 'liso', semBrilho: true });
      marca(c, s, caixa(0.96, 0.45, 0.05, 0.09, 0.02), '#ff9a4a');
      brilho(c, s, 0.99, 0.49, 0.22, '#ff8a3c88', 0.7);
    } else if (detalhe === 'corrente') {
      // Correntes a balançar dos braços, com peso na ponta.
      for (const lado of [-1, 1]) {
        const arrasto = passo(q, 0.03) * lado;
        const x = 0.5 + lado * 0.42;
        membro(c, s, [[x, 0.36], [x + arrasto, 0.56], [x + arrasto * 1.6, 0.76]], 0.03, p, 'claro');
        volume(c, s, p, elipse(x + arrasto * 1.8, 0.84, 0.09, 0.09), { textura: 'metal', seed: 36, luz: 0.4 });
      }
    } else if (detalhe === 'fundidor') {
      // Caldeira a transbordar metal derretido.
      volume(c, s, p, caixa(0.3, 0.02, 0.4, 0.2, 0.04), { textura: 'metal', seed: 37, luz: 0.4 });
      marca(c, s, caixa(0.34, 0.06, 0.32, 0.1, 0.02), '#ff8a3c');
      marca(c, s, caixa(0.38, 0.08, 0.24, 0.05, 0.01), '#ffd27a');
      brilho(c, s, 0.5, 0.12, 0.45, '#ff8a3c66', 0.7);
      // Escorrimento pela frente.
      marca(c, s, caixa(0.46, 0.2, 0.06, 0.18, 0.02), '#ff9a4a', 0.8);
    } else if (detalhe === 'santo') {
      // Varkan: peito aberto como uma fornalha e coroa de lâminas.
      marca(c, s, caixa(0.3, 0.4, 0.4, 0.3, 0.04), '#2a0f08');
      marca(c, s, caixa(0.34, 0.46, 0.32, 0.22, 0.03), '#ff8a3c');
      marca(c, s, caixa(0.39, 0.52, 0.22, 0.14, 0.02), '#ffd27a');
      brilho(c, s, 0.5, 0.56, 0.38, '#ff8a3c88', 0.8);
      c.fillStyle = p.claro;
      for (let i = -2; i <= 2; i++) {
        const x = 0.5 + i * 0.13;
        const alt = 0.1 + (2 - Math.abs(i)) * 0.04;
        c.beginPath();
        c.moveTo((x - 0.035) * s, 0.16 * s);
        c.lineTo(x * s, (0.16 - alt) * s);
        c.lineTo((x + 0.035) * s, 0.16 * s);
        c.closePath();
        c.fill();
      }
    }
  };
}

// --- Cão de sucata -----------------------------------------------------------

const cao: Pintor = (c, s, p, q) => {
  const pa = passo(q, 0.05);

  // Patas dianteiras e traseiras.
  membro(c, s, [[0.34, 0.56], [0.3 + pa, 0.72], [0.28 + pa, 0.86]], 0.05, p);
  membro(c, s, [[0.66, 0.56], [0.7 - pa, 0.72], [0.72 - pa, 0.86]], 0.05, p);
  membro(c, s, [[0.42, 0.58], [0.4 - pa, 0.74], [0.38 - pa, 0.88]], 0.045, p, 'base');
  membro(c, s, [[0.6, 0.58], [0.62 + pa, 0.74], [0.64 + pa, 0.88]], 0.045, p, 'base');

  // Cauda de cabo.
  membro(c, s, [[0.22, 0.46], [0.1, 0.36], [0.14 + pa, 0.24]], 0.035, p, 'claro');

  // Tronco e cabeça.
  volume(c, s, p, elipse(0.48, 0.5, 0.32, 0.22), { textura: 'metal', seed: 41, luz: 0.36 });
  volume(c, s, p, elipse(0.74, 0.38, 0.19, 0.16), { textura: 'metal', seed: 42, luz: 0.42 });
  // Focinho e orelhas.
  volume(c, s, p, caixa(0.86, 0.36, 0.12, 0.08, 0.02), { textura: 'liso', semBrilho: true });
  marca(c, s, poligono([[0.66, 0.26], [0.7, 0.1], [0.78, 0.25]]), p.escuro);
  marca(c, s, poligono([[0.79, 0.25], [0.84, 0.12], [0.88, 0.28]]), p.escuro);
  // Olho e dentes.
  olho(c, s, 0.78, 0.36, 0.035, p.acento);
  dentes(c, s, 0.86, 0.98, 0.43, 0.04, 4);
  brilho(c, s, 0.78, 0.36, 0.2, `${p.acento}55`, 0.5);
};

// --- Peixe e enguia ----------------------------------------------------------

const peixe: Pintor = (c, s, p, q) => {
  const ond = passo(q, 0.05);

  // Cauda.
  marca(c, s, poligono([[0.18, 0.5 + ond], [0.02, 0.32 + ond], [0.02, 0.7 + ond]]), p.escuro);
  marca(c, s, poligono([[0.18, 0.5 + ond], [0.06, 0.38 + ond], [0.06, 0.62 + ond]]), p.base);

  // Barbatanas.
  marca(c, s, poligono([[0.45, 0.32], [0.55, 0.12], [0.62, 0.34]]), p.escuro);
  marca(c, s, poligono([[0.42, 0.68], [0.5, 0.86], [0.6, 0.68]]), p.escuro);

  // Corpo.
  volume(c, s, p, elipse(0.52, 0.5, 0.36, 0.22), { textura: 'escamas', seed: 51, luz: 0.36 });

  // Boca aberta com dentes.
  marca(c, s, poligono([[0.78, 0.42], [0.98, 0.5], [0.78, 0.6]]), p.contorno);
  dentes(c, s, 0.78, 0.96, 0.46, 0.05, 5);
  olho(c, s, 0.7, 0.44, 0.05, '#0d1a22');
};

const enguia: Pintor = (c, s, p, q) => {
  // Corpo em serpentina.
  const pontos: [number, number][] = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    pontos.push([0.86 - t * 0.78, 0.5 + Math.sin((q / 4) * Math.PI * 2 + i * 0.9) * 0.16]);
  }
  membro(c, s, pontos, 0.16, p, 'escuro');
  membro(c, s, pontos, 0.1, p, 'base');

  // Cabeça.
  volume(c, s, p, elipse(0.82, pontos[0][1], 0.16, 0.13), { textura: 'escamas', seed: 55, luz: 0.4 });
  dentes(c, s, 0.78, 0.96, pontos[0][1] + 0.02, 0.04, 4);
  olho(c, s, 0.8, pontos[0][1] - 0.04, 0.04, '#0b1620');

  // Lanterna pendurada à frente.
  membro(c, s, [[0.8, pontos[0][1] - 0.12], [0.88, 0.2], [0.8, 0.1]], 0.02, p, 'claro');
  brilho(c, s, 0.8, 0.09, 0.3, `${p.acento}99`, 0.9);
  marca(c, s, elipse(0.8, 0.09, 0.07, 0.07), p.acento);
  marca(c, s, elipse(0.78, 0.07, 0.03, 0.03), '#ffffff');
};

// --- Concha ------------------------------------------------------------------

const concha: Pintor = (c, s, p, q) => {
  const recolhe = balanco(q, 0.015);

  // Pernas e pinças.
  for (const lado of [-1, 1]) {
    membro(c, s, [[0.5 + lado * 0.2, 0.68], [0.5 + lado * 0.42, 0.76], [0.5 + lado * 0.48, 0.92]], 0.045, p);
    membro(c, s, [[0.5 + lado * 0.26, 0.6], [0.5 + lado * 0.52, 0.56], [0.5 + lado * 0.62, 0.46]], 0.045, p);
    volume(c, s, p, elipse(0.5 + lado * 0.66, 0.42, 0.11, 0.08), { textura: 'liso', luz: 0.42 });
    marca(c, s, caixa(0.5 + lado * 0.6, 0.4, 0.12, 0.02, 0), p.contorno, 0.8);
  }

  // Corpo mole com olhos em pedúnculos.
  volume(c, s, p, elipse(0.5, 0.7 + recolhe, 0.22, 0.14), { textura: 'liso', luz: 0.4 });
  for (const lado of [-1, 1]) {
    membro(c, s, [[0.5 + lado * 0.08, 0.66 + recolhe], [0.5 + lado * 0.12, 0.56 + recolhe]], 0.025, p, 'claro');
    olho(c, s, 0.5 + lado * 0.12, 0.54 + recolhe, 0.035, '#120b16');
  }

  // Concha em espiral, com espinhos.
  volume(c, s, p, elipse(0.5, 0.42 + recolhe * 0.5, 0.44, 0.36), { textura: 'crosta', seed: 61, luz: 0.36 });
  c.save();
  elipse(0.5, 0.42 + recolhe * 0.5, 0.44, 0.36)(c, s);
  c.clip();
  c.strokeStyle = p.contorno;
  c.lineWidth = Math.max(1, s * 0.035);
  for (let i = 0; i < 4; i++) {
    const f = 1 - i * 0.22;
    c.beginPath();
    c.ellipse((0.5 + i * 0.02) * s, (0.42 + i * 0.02) * s, 0.4 * f * s, 0.32 * f * s, 0, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
  c.fillStyle = p.claro;
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i / 4) * Math.PI;
    const bx = 0.5 + Math.cos(a) * 0.42;
    const by = 0.42 + Math.sin(a) * 0.34;
    c.beginPath();
    c.moveTo(bx * s, by * s);
    c.lineTo((bx + Math.cos(a) * 0.14) * s, (by + Math.sin(a) * 0.14) * s);
    c.lineTo((bx + Math.cos(a + 0.4) * 0.06) * s, (by + Math.sin(a + 0.4) * 0.06) * s);
    c.closePath();
    c.fill();
  }
};

// --- Serpente ----------------------------------------------------------------

const serpente: Pintor = (c, s, p, q) => {
  // Corpo em anéis, cada vez mais estreito, a sair para fora do sprite.
  for (let i = 6; i >= 1; i--) {
    const f = i / 6;
    const dx = Math.sin((q / 4) * Math.PI * 2 + i * 0.8) * 0.1;
    volume(c, s, p, elipse(0.5 + dx, 0.4 + f * 0.56, 0.26 - f * 0.07, 0.14), {
      textura: 'escamas', seed: 70 + i, luz: 0.3,
    });
  }

  // Cabeça em cunha, mais larga atrás.
  volume(c, s, p, poligono([
    [0.5, 0.04], [0.78, 0.2], [0.82, 0.44], [0.62, 0.58], [0.38, 0.58], [0.18, 0.44], [0.22, 0.2],
  ]), { textura: 'escamas', seed: 71, luz: 0.42 });

  // Maxilar inferior, entreaberto.
  const abre = [0.04, 0.02, 0, 0.02][q & 3];
  volume(c, s, p, poligono([
    [0.36, 0.52 + abre], [0.64, 0.52 + abre], [0.58, 0.66 + abre], [0.42, 0.66 + abre],
  ]), { textura: 'liso', luz: 0.3, semBrilho: true });
  dentes(c, s, 0.38, 0.62, 0.52 + abre, 0.05, 5);

  // Cristais na cabeça, como uma coroa.
  for (const [dx, alt] of [[-0.2, 0.18], [0, 0.26], [0.2, 0.18]] as [number, number][]) {
    marca(c, s, poligono([[0.5 + dx - 0.06, 0.16], [0.5 + dx, 0.16 - alt], [0.5 + dx + 0.06, 0.16]]), p.contorno);
    marca(c, s, poligono([[0.5 + dx - 0.04, 0.155], [0.5 + dx, 0.17 - alt], [0.5 + dx + 0.04, 0.155]]), p.claro);
    marca(c, s, poligono([[0.5 + dx - 0.015, 0.15], [0.5 + dx, 0.19 - alt], [0.5 + dx + 0.015, 0.15]]), p.acento);
  }
  brilho(c, s, 0.5, 0.08, 0.22, `${p.acento}66`, 0.55);

  // Olhos de réptil, com pupila em fenda.
  olhos(c, s, 0.5, 0.34, 0.16, 0.06, p.acento);
  marca(c, s, caixa(0.33, 0.3, 0.02, 0.08, 0.01), '#160d22');
  marca(c, s, caixa(0.65, 0.3, 0.02, 0.08, 0.01), '#160d22');
};

// --- Flor carnívora ----------------------------------------------------------

const flor: Pintor = (c, s, p, q) => {
  const abre = [1, 0.9, 0.8, 0.9][q & 3];

  // Caule e folhas.
  membro(c, s, [[0.5, 0.98], [0.5, 0.64]], 0.09, p, 'escuro');
  for (const lado of [-1, 1]) {
    c.save();
    c.translate(0.5 * s, 0.86 * s);
    c.rotate(lado * 0.8);
    volume(c, s, p, elipse(lado * 0.16, 0, 0.16, 0.06), { textura: 'liso', luz: 0.5, semBrilho: true });
    c.restore();
  }

  // Pétalas: tom claro e nervura ao meio, para não virarem uma mancha escura.
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.2;
    c.save();
    c.translate(0.5 * s, 0.46 * s);
    c.rotate(a);
    volume(c, s, p, elipse(0, -0.3 * abre, 0.12, 0.3 * abre), {
      textura: 'liso', luz: 0.62, seed: 80 + i,
    });
    marca(c, s, caixa(-0.008, -0.52 * abre, 0.016, 0.42 * abre, 0), p.escuro, 0.45);
    marca(c, s, elipse(0, -0.5 * abre, 0.035, 0.05), p.acento, 0.6);
    c.restore();
  }

  // Garganta com dentes e um brilho a chamar.
  marca(c, s, elipse(0.5, 0.46, 0.21, 0.21), p.contorno);
  marca(c, s, elipse(0.5, 0.46, 0.17, 0.17), '#250e2c');
  brilho(c, s, 0.5, 0.46, 0.24, `${p.acento}77`, 0.65);
  marca(c, s, elipse(0.5, 0.5, 0.075, 0.06), p.acento);
  marca(c, s, elipse(0.49, 0.49, 0.03, 0.025), '#ffffff', 0.7);
  c.fillStyle = '#efe6d0';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const bx = 0.5 + Math.cos(a) * 0.2;
    const by = 0.46 + Math.sin(a) * 0.2;
    c.beginPath();
    c.moveTo(bx * s, by * s);
    c.lineTo((0.5 + Math.cos(a + 0.22) * 0.1) * s, (0.46 + Math.sin(a + 0.22) * 0.1) * s);
    c.lineTo((0.5 + Math.cos(a - 0.22) * 0.1) * s, (0.46 + Math.sin(a - 0.22) * 0.1) * s);
    c.closePath();
    c.fill();
  }
};

// --- Espectros ---------------------------------------------------------------

function espectro(detalhe: string): Pintor {
  return (c, s, p, q) => {
    const ond = (i: number) => Math.sin((q / 4) * Math.PI * 2 + i * 1.2) * 0.035;

    if (detalhe === 'eco') {
      // Cópias anteriores, atrás — o Echo é uma repetição de alguém.
      c.globalAlpha = 0.3;
      for (let i = 2; i >= 1; i--) {
        c.save();
        c.translate((ond(i) * 4 - i * 0.05) * s, 0);
        marca(c, s, poligono(mantoPontos(ond, 0.07 * i)), p.claro);
        c.restore();
      }
      c.globalAlpha = 1;
      brilho(c, s, 0.5, 0.4, 0.62, `${p.acento}44`, 0.6);
    }

    // Manto: ombros largos que afinam e acabam em tiras.
    volume(c, s, p, poligono(mantoPontos(ond, 0)), {
      textura: detalhe === 'nulo' ? 'liso' : 'pelo',
      seed: 91,
      luz: 0.34,
      contorno: detalhe === 'nulo' ? '#04040a' : undefined,
    });

    // Braços magros a sair do manto: a silhueta precisa de qualquer coisa
    // que não seja um sino.
    for (const lado of [-1, 1]) {
      membro(c, s, [
        [0.5 + lado * 0.2, 0.44], [0.5 + lado * 0.44, 0.54], [0.5 + lado * 0.52, 0.72],
      ], 0.035, p, 'escuro');
      for (let dedo = -1; dedo <= 1; dedo++) {
        membro(c, s, [
          [0.5 + lado * 0.52, 0.72], [0.5 + lado * (0.56 + dedo * 0.04), 0.84],
        ], 0.02, p, 'claro');
      }
    }

    // Capuz, com bico.
    volume(c, s, p, poligono([[0.28, 0.36], [0.4, 0.1], [0.5, 0.02], [0.6, 0.1], [0.72, 0.36], [0.6, 0.44], [0.4, 0.44]]), {
      textura: 'liso', luz: 0.3, seed: 92,
    });

    if (detalhe === 'nulo') {
      // Sem cara: um vazio que engole a luz.
      marca(c, s, elipse(0.5, 0.32, 0.17, 0.2), '#000000');
      c.strokeStyle = p.acento;
      c.lineWidth = Math.max(1, s * 0.02);
      c.globalAlpha = [0.55, 0.3, 0.55, 0.2][q & 3];
      c.beginPath();
      c.ellipse(0.5 * s, 0.32 * s, 0.24 * s, 0.28 * s, 0, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 1;
      // Matéria a desfazer-se: pedaços a soltar-se do corpo e da base.
      c.fillStyle = '#12101c';
      for (let i = 0; i < 8; i++) {
        c.fillRect((0.2 + i * 0.08) * s, (0.9 + ond(i)) * s, s * 0.04, s * 0.05);
      }
      const solto = mulberry32(515);
      for (let i = 0; i < 7; i++) {
        const a = solto() * Math.PI * 2;
        const raio = 0.4 + solto() * 0.14;
        c.fillRect(
          (0.5 + Math.cos(a) * raio) * s,
          (0.5 + Math.sin(a) * raio * 0.9) * s,
          s * (0.03 + solto() * 0.03),
          s * (0.03 + solto() * 0.03),
        );
      }
      return;
    }

    // Máscara pálida, grande, a flutuar dentro do capuz.
    volume(c, s, p, elipse(0.5, 0.33, 0.15, 0.19), { textura: 'liso', luz: 0.55 });
    marca(c, s, elipse(0.44, 0.31, 0.04, 0.055), '#100b18');
    marca(c, s, elipse(0.56, 0.31, 0.04, 0.055), '#100b18');
    c.globalAlpha = [1, 0.7, 1, 0.55][q & 3];
    olhos(c, s, 0.5, 0.31, 0.06, 0.02, p.acento);
    c.globalAlpha = 1;
    // Boca cosida.
    c.strokeStyle = '#100b18';
    c.lineWidth = Math.max(1, s * 0.015);
    c.beginPath();
    c.moveTo(0.44 * s, 0.44 * s);
    c.lineTo(0.56 * s, 0.44 * s);
    c.stroke();
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo((0.46 + i * 0.04) * s, 0.42 * s);
      c.lineTo((0.46 + i * 0.04) * s, 0.46 * s);
      c.stroke();
    }
    brilho(c, s, 0.5, 0.34, 0.45, `${p.acento}44`, 0.5);
  };
}

/** Silhueta do manto, com a base desfeita em tiras. */
function mantoPontos(ond: (i: number) => number, folga: number): [number, number][] {
  const pontos: [number, number][] = [
    [0.2 - folga, 0.44], [0.32 - folga, 0.22], [0.5, 0.14], [0.68 + folga, 0.22], [0.8 + folga, 0.44],
    [0.76 + folga, 0.92],
  ];
  for (let i = 4; i >= 0; i--) {
    const x = 0.76 + folga - i * (0.52 + folga * 2) / 4;
    pontos.push([x, 0.92 + ond(i) + (i % 2 ? 0.07 : 0)]);
  }
  return pontos;
}

// --- Olhos flutuantes --------------------------------------------------------

const olhoGigante: Pintor = (c, s, p, q) => {
  const giro = (q / 4) * Math.PI * 0.5;

  // Anéis a orbitar.
  c.save();
  c.translate(0.5 * s, 0.5 * s);
  c.rotate(giro);
  c.strokeStyle = p.escuro;
  c.lineWidth = Math.max(1.5, s * 0.04);
  c.beginPath();
  c.ellipse(0, 0, 0.46 * s, 0.16 * s, 0, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = p.acento;
  c.lineWidth = Math.max(1, s * 0.015);
  c.globalAlpha = 0.6;
  c.beginPath();
  c.ellipse(0, 0, 0.46 * s, 0.16 * s, 0, 0, Math.PI * 2);
  c.stroke();
  c.globalAlpha = 1;
  c.restore();

  c.save();
  c.translate(0.5 * s, 0.5 * s);
  c.rotate(-giro * 0.7);
  c.strokeStyle = p.base;
  c.lineWidth = Math.max(1.5, s * 0.035);
  c.beginPath();
  c.ellipse(0, 0, 0.16 * s, 0.46 * s, 0, 0, Math.PI * 2);
  c.stroke();
  c.restore();

  // Espinhos em roda: o globo sozinho lia-se como uma bola qualquer.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + giro * 0.3;
    const comp = i % 2 === 0 ? 0.2 : 0.13;
    marca(c, s, poligono([
      [0.5 + Math.cos(a - 0.12) * 0.3, 0.5 + Math.sin(a - 0.12) * 0.3],
      [0.5 + Math.cos(a) * (0.34 + comp), 0.5 + Math.sin(a) * (0.34 + comp)],
      [0.5 + Math.cos(a + 0.12) * 0.3, 0.5 + Math.sin(a + 0.12) * 0.3],
    ]), p.escuro);
  }

  // Globo.
  volume(c, s, p, elipse(0.5, 0.5, 0.34, 0.34), { textura: 'gosma', seed: 95, luz: 0.42 });

  // Pálpebras grossas em cima e em baixo.
  volume(c, s, p, poligono([[0.16, 0.44], [0.5, 0.2], [0.84, 0.44], [0.5, 0.36]]), {
    textura: 'liso', semBrilho: true, seed: 96,
  });
  volume(c, s, p, poligono([[0.18, 0.58], [0.5, 0.64], [0.82, 0.58], [0.5, 0.78]]), {
    textura: 'liso', semBrilho: true, seed: 97,
  });
  // Veias.
  c.strokeStyle = p.escuro;
  c.lineWidth = 1;
  c.save();
  elipse(0.5, 0.5, 0.34, 0.34)(c, s);
  c.clip();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    c.beginPath();
    c.moveTo((0.5 + Math.cos(a) * 0.34) * s, (0.5 + Math.sin(a) * 0.34) * s);
    c.quadraticCurveTo(
      (0.5 + Math.cos(a + 0.6) * 0.2) * s, (0.5 + Math.sin(a + 0.6) * 0.2) * s,
      (0.5 + Math.cos(a) * 0.1) * s, (0.5 + Math.sin(a) * 0.1) * s,
    );
    c.stroke();
  }
  c.restore();

  // Íris que olha em volta.
  const olhar = [[0.06, 0], [0, 0.05], [-0.06, 0], [0, -0.05]][q & 3];
  marca(c, s, elipse(0.5 + olhar[0], 0.5 + olhar[1], 0.15, 0.15), p.contorno);
  marca(c, s, elipse(0.5 + olhar[0], 0.5 + olhar[1], 0.11, 0.11), p.acento);
  marca(c, s, elipse(0.5 + olhar[0], 0.5 + olhar[1], 0.05, 0.05), '#0a0810');
  marca(c, s, elipse(0.5 + olhar[0] - 0.04, 0.5 + olhar[1] - 0.04, 0.03, 0.03), '#ffffff');
  brilho(c, s, 0.5, 0.5, 0.36, `${p.acento}66`, 0.6);
};

// --- Gigante -----------------------------------------------------------------

const gigante: Pintor = (c, s, p, q) => {
  const respira = balanco(q, 0.008);

  // Costelas atrás, a sugerir um corpo maior do que o ecrã.
  c.strokeStyle = p.escuro;
  for (let i = 1; i <= 4; i++) {
    c.lineWidth = Math.max(2, s * 0.05);
    c.beginPath();
    c.arc(0.5 * s, 0.72 * s, (0.2 + i * 0.1) * s, Math.PI * 1.1, Math.PI * 1.9);
    c.stroke();
    c.strokeStyle = p.base;
    c.lineWidth = Math.max(1, s * 0.025);
    c.beginPath();
    c.arc(0.5 * s, 0.71 * s, (0.2 + i * 0.1) * s, Math.PI * 1.12, Math.PI * 1.88);
    c.stroke();
    c.strokeStyle = p.escuro;
  }

  // Braços apoiados no chão.
  for (const lado of [-1, 1]) {
    const bal = passo(q, 0.015) * lado;
    volume(c, s, p, caixa(0.5 + lado * 0.44 - 0.09, 0.42 + bal, 0.18, 0.46, 0.05), {
      textura: 'osso', seed: 101, luz: 0.34,
    });
    for (let d = -1; d <= 1; d++) {
      volume(c, s, p, caixa(0.5 + lado * 0.44 + d * 0.06 - 0.025, 0.86 + bal, 0.05, 0.12, 0.02), {
        textura: 'liso', luz: 0.4, semBrilho: true,
      });
    }
  }

  // Coluna.
  volume(c, s, p, caixa(0.45, 0.5, 0.1, 0.44, 0.02), { textura: 'osso', seed: 102, luz: 0.3 });

  // Crânio.
  c.save();
  c.translate(0, -respira * s);
  volume(c, s, p, elipse(0.5, 0.3, 0.32, 0.27), { textura: 'osso', seed: 103, luz: 0.42 });
  volume(c, s, p, poligono([[0.32, 0.4], [0.36, 0.56], [0.64, 0.56], [0.68, 0.4]]), {
    textura: 'osso', seed: 104, luz: 0.36,
  });
  marca(c, s, elipse(0.39, 0.29, 0.085, 0.1), '#0c0907');
  marca(c, s, elipse(0.61, 0.29, 0.085, 0.1), '#0c0907');
  const luz = [0.9, 0.55, 0.9, 0.4][q & 3];
  c.globalAlpha = luz;
  olhos(c, s, 0.5, 0.3, 0.11, 0.035, p.acento);
  c.globalAlpha = 1;
  brilho(c, s, 0.5, 0.3, 0.5, `${p.acento}44`, luz * 0.6);
  dentes(c, s, 0.37, 0.63, 0.5, 0.06, 6);
  // Fissura no crânio.
  c.strokeStyle = p.contorno;
  c.lineWidth = Math.max(1, s * 0.02);
  c.beginPath();
  c.moveTo(0.44 * s, 0.09 * s);
  c.lineTo(0.52 * s, 0.2 * s);
  c.lineTo(0.46 * s, 0.28 * s);
  c.stroke();
  c.restore();
};

// --- Bearer Zero -------------------------------------------------------------

const portador: Pintor = (c, s, p, q) => {
  const pulso = [1, 0.7, 0.45, 0.7][q & 3];

  // Manto pesado.
  const pontos: [number, number][] = [[0.16, 0.34], [0.84, 0.34], [0.78, 0.94], [0.22, 0.94]];
  volume(c, s, p, poligono(pontos), { textura: 'pelo', seed: 111, luz: 0.28 });

  // Peitoral de placas.
  volume(c, s, p, caixa(0.28, 0.34, 0.44, 0.38, 0.06), { textura: 'metal', seed: 112, luz: 0.38 });
  volume(c, s, p, caixa(0.22, 0.3, 0.56, 0.1, 0.04), { textura: 'metal', seed: 113, luz: 0.46 });

  // Fendas com luz do Véu.
  c.save();
  c.globalAlpha = pulso;
  c.strokeStyle = '#b79bff';
  c.lineWidth = Math.max(1, s * 0.025);
  for (const [x0, y0, x1, y1] of [[0.36, 0.38, 0.42, 0.6], [0.58, 0.36, 0.64, 0.56], [0.46, 0.6, 0.54, 0.78]]) {
    c.beginPath();
    c.moveTo(x0 * s, y0 * s);
    c.lineTo(x1 * s, y1 * s);
    c.stroke();
  }
  c.restore();
  brilho(c, s, 0.5, 0.55, 0.5, `rgba(183,155,255,${0.3 * pulso})`, 0.7);

  // Braços com manoplas.
  for (const lado of [-1, 1]) {
    volume(c, s, p, caixa(0.5 + lado * 0.34 - 0.07, 0.4, 0.14, 0.3, 0.03), {
      textura: 'metal', seed: 114, luz: 0.32,
    });
    volume(c, s, p, caixa(0.5 + lado * 0.34 - 0.09, 0.68, 0.18, 0.14, 0.03), {
      textura: 'metal', seed: 115, luz: 0.4,
    });
  }

  // Elmo com fenda de luz.
  volume(c, s, p, elipse(0.5, 0.2, 0.22, 0.2), { textura: 'metal', seed: 116, luz: 0.36 });
  marca(c, s, caixa(0.34, 0.16, 0.32, 0.08, 0.02), '#08070e');
  c.globalAlpha = 0.5 + pulso * 0.5;
  marca(c, s, caixa(0.37, 0.18, 0.26, 0.035, 0.01), '#d5a8ff');
  c.globalAlpha = 1;
  brilho(c, s, 0.5, 0.2, 0.4, `rgba(213,168,255,${0.35 * pulso})`, 0.8);

  // A marca do peito, apagada.
  marca(c, s, elipse(0.5, 0.52, 0.05, 0.05), '#4a4a68');
  marca(c, s, elipse(0.5, 0.52, 0.022, 0.022), '#8f8fbf');
};

// --- Bocas no chão -----------------------------------------------------------

const boca: Pintor = (c, s, p, q) => {
  const abre = [1, 0.92, 0.84, 0.92][q & 3];

  // Buraco.
  marca(c, s, elipse(0.5, 0.52, 0.46, 0.34 * abre), p.contorno);
  marca(c, s, elipse(0.5, 0.52, 0.42, 0.3 * abre), '#06050a');
  // Garganta a pulsar.
  brilho(c, s, 0.5, 0.56, 0.3, `${p.acento}44`, 0.5);
  marca(c, s, elipse(0.5, 0.58, 0.14, 0.09 * abre), p.escuro);

  // Dentes em roda, virados para dentro.
  c.fillStyle = '#e8dcc0';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const bx = 0.5 + Math.cos(a) * 0.44;
    const by = 0.52 + Math.sin(a) * 0.32 * abre;
    const ix = 0.5 + Math.cos(a) * 0.26;
    const iy = 0.52 + Math.sin(a) * 0.19 * abre;
    c.beginPath();
    c.moveTo((bx + Math.cos(a + 1.5) * 0.06) * s, (by + Math.sin(a + 1.5) * 0.05) * s);
    c.lineTo(ix * s, iy * s);
    c.lineTo((bx + Math.cos(a - 1.5) * 0.06) * s, (by + Math.sin(a - 1.5) * 0.05) * s);
    c.closePath();
    c.fill();
  }
  // Terra levantada à volta.
  c.fillStyle = p.escuro;
  const r = mulberry32(131);
  for (let i = 0; i < 10; i++) {
    const a = r() * Math.PI * 2;
    const x = 0.5 + Math.cos(a) * (0.46 + r() * 0.08);
    const y = 0.52 + Math.sin(a) * (0.34 + r() * 0.06);
    c.fillRect(x * s, y * s, s * 0.05, s * 0.04);
  }
};

// --- Cristal -----------------------------------------------------------------

const cristal: Pintor = (c, s, p, q) => {
  const giro = (q / 4) * 0.5;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + giro;
    const alt = 0.32 + (i % 2) * 0.12;
    c.save();
    c.translate(0.5 * s, 0.5 * s);
    c.rotate(a);
    volume(c, s, p, poligono([[0, -alt], [0.1, 0], [0, 0.16], [-0.1, 0]]), {
      textura: 'liso', luz: 0.45, seed: 120 + i,
    });
    c.restore();
  }
  brilho(c, s, 0.5, 0.5, 0.6, `${p.acento}66`, 0.7);
};


// --- Chefes com desenho próprio ----------------------------------------------
// Um chefe não pode ser a criatura comum em ponto grande: leva outra silhueta.

/** Myra, a Mente em Flor. Duas coroas de pétalas e um cérebro cheio de olhos. */
const florMente: Pintor = (c, s, p, q) => {
  const abre = [1, 0.96, 0.9, 0.96][q & 3];
  const pulso = [0, 1, 2, 1][q & 3];

  // Raízes espalhadas pelo chão, a segurar o corpo todo.
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.1 + (i / 6) * 0.8);
    membro(c, s, [
      [0.5, 0.74],
      [0.5 + Math.cos(a) * 0.3, 0.84 + Math.sin(a) * 0.06],
      [0.5 + Math.cos(a) * 0.46, 0.98],
    ], 0.05, p, 'escuro');
  }

  // Pétalas de fora: grandes, escuras, viradas para baixo.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.35;
    c.save();
    c.translate(0.5 * s, 0.46 * s);
    c.rotate(a);
    volume(c, s, p, poligono([
      [0, -0.12], [0.12, -0.3 * abre], [0.06, -0.48 * abre], [0, -0.52 * abre],
      [-0.06, -0.48 * abre], [-0.12, -0.3 * abre],
    ]), { textura: 'liso', luz: 0.36, seed: 200 + i });
    marca(c, s, caixa(-0.01, -0.5 * abre, 0.02, 0.36 * abre, 0), p.contorno, 0.5);
    c.restore();
  }

  // Pétalas de dentro: mais claras e mais curtas, a abrir a garganta.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    c.save();
    c.translate(0.5 * s, 0.46 * s);
    c.rotate(a);
    volume(c, s, p, elipse(0, -0.26 * abre, 0.1, 0.24 * abre), { textura: 'liso', luz: 0.66, seed: 210 + i });
    marca(c, s, elipse(0, -0.4 * abre, 0.032, 0.05), p.acento, 0.75);
    c.restore();
  }

  // Cérebro: lóbulos em vez de garganta lisa.
  brilho(c, s, 0.5, 0.46, 0.34, `${p.acento}66`, 0.7);
  volume(c, s, p, elipse(0.5, 0.46, 0.23, 0.21), { textura: 'gosma', luz: 0.6, seed: 220 });
  marca(c, s, caixa(0.49, 0.26, 0.02, 0.4, 0.01), p.contorno, 0.6);
  for (let i = 0; i < 5; i++) {
    const y = 0.32 + i * 0.07;
    marca(c, s, elipse(0.39, y, 0.07, 0.035), p.escuro, 0.55);
    marca(c, s, elipse(0.61, y, 0.07, 0.035), p.escuro, 0.55);
  }

  // Olhos espalhados pelo cérebro: é a Mente, não uma boca.
  const olhares: [number, number, number][] = [
    [0.5, 0.42, 0.055], [0.38, 0.5, 0.04], [0.62, 0.5, 0.04], [0.45, 0.58, 0.032], [0.57, 0.33, 0.032],
  ];
  olhares.forEach(([x, y, r], i) => {
    c.globalAlpha = i === pulso % olhares.length ? 1 : 0.85;
    olho(c, s, x, y, r, p.acento);
    c.globalAlpha = 1;
  });

  // Pólen suspenso à volta.
  const pol = mulberry32(731 + (q & 3));
  c.fillStyle = p.acento;
  c.globalAlpha = 0.55;
  for (let i = 0; i < 10; i++) {
    const a = pol() * Math.PI * 2;
    const raio = 0.4 + pol() * 0.14;
    c.fillRect((0.5 + Math.cos(a) * raio) * s, (0.46 + Math.sin(a) * raio) * s, s * 0.025, s * 0.025);
  }
  c.globalAlpha = 1;
};

/** Nereth, o Oráculo Afogado. Um olho atrás de um véu, com olhos menores em roda. */
const olhoOraculo: Pintor = (c, s, p, q) => {
  const deriva = Math.sin((q / 4) * Math.PI * 2) * 0.02;

  // Véu de tentáculos, por trás do globo.
  for (let i = 0; i < 9; i++) {
    const x = 0.14 + i * 0.09;
    const onda = Math.sin((q / 4) * Math.PI * 2 + i * 0.9) * 0.05;
    membro(c, s, [
      [x, 0.56], [x + onda, 0.74], [x - onda, 0.92], [x + onda * 0.6, 1.02],
    ], 0.035 + (i % 2) * 0.015, p, 'escuro');
  }

  // Coroa de olhos menores: a marca do Oráculo.
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (1.15 + (i / 4) * 0.7);
    const x = 0.5 + Math.cos(a) * 0.42;
    const y = 0.5 + Math.sin(a) * 0.42;
    volume(c, s, p, elipse(x, y, 0.08, 0.08), { textura: 'gosma', luz: 0.5, seed: 230 + i });
    olho(c, s, x, y + deriva, 0.035, p.acento);
  }

  // Globo central, muito maior.
  brilho(c, s, 0.5, 0.48, 0.52, `${p.acento}55`, 0.7);
  volume(c, s, p, elipse(0.5, 0.48, 0.32, 0.32), { textura: 'gosma', luz: 0.46, seed: 235 });

  // Véu à frente: uma faixa translúcida que corta o globo ao meio.
  c.save();
  c.globalAlpha = 0.35;
  marca(c, s, caixa(0.12, 0.44, 0.76, 0.1, 0.03), p.claro);
  c.globalAlpha = 1;
  c.restore();

  // Íris enorme com anel de escrita.
  const olhar = [[0.04, 0], [0, 0.03], [-0.04, 0], [0, -0.03]][q & 3];
  marca(c, s, elipse(0.5 + olhar[0], 0.48 + olhar[1], 0.19, 0.19), p.contorno);
  marca(c, s, elipse(0.5 + olhar[0], 0.48 + olhar[1], 0.15, 0.15), p.acento);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + (q / 4) * 0.5;
    marca(c, s, caixa(
      0.5 + olhar[0] + Math.cos(a) * 0.17 - 0.012,
      0.48 + olhar[1] + Math.sin(a) * 0.17 - 0.012,
      0.024, 0.024, 0.008,
    ), p.contorno, 0.7);
  }
  marca(c, s, elipse(0.5 + olhar[0], 0.48 + olhar[1], 0.07, 0.07), '#050810');
  marca(c, s, elipse(0.5 + olhar[0] - 0.05, 0.48 + olhar[1] - 0.05, 0.035, 0.035), '#ffffff', 0.85);

  // Bolhas a subir: está afogado, e isso tem de se ver.
  const bol = mulberry32(412 + (q & 3));
  c.globalAlpha = 0.5;
  c.fillStyle = p.claro;
  for (let i = 0; i < 8; i++) {
    const x = 0.1 + bol() * 0.8;
    const y = 0.1 + bol() * 0.8;
    const r = s * (0.02 + bol() * 0.02);
    c.beginPath();
    c.arc(x * s, y * s, r, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
};

/** A Serpente Tempestade. A mesma família da Prism Serpent, outro bicho. */
const serpenteTempestade: Pintor = (c, s, p, q) => {
  // Corpo com barbatana dorsal serrada ao longo dos anéis.
  for (let i = 7; i >= 1; i--) {
    const f = i / 7;
    const dx = Math.sin((q / 4) * Math.PI * 2 + i * 0.7) * 0.13;
    const x = 0.5 + dx;
    const y = 0.38 + f * 0.6;
    marca(c, s, poligono([
      [x - 0.1, y - 0.06], [x, y - 0.16 - f * 0.08], [x + 0.1, y - 0.06],
    ]), p.acento, 0.85);
    volume(c, s, p, elipse(x, y, 0.28 - f * 0.08, 0.15), { textura: 'escamas', seed: 240 + i, luz: 0.32 });
  }

  // Cabeça mais larga e angulosa, com placas laterais.
  volume(c, s, p, poligono([
    [0.5, 0.02], [0.72, 0.12], [0.88, 0.3], [0.8, 0.5], [0.6, 0.62], [0.4, 0.62], [0.2, 0.5], [0.12, 0.3], [0.28, 0.12],
  ]), { textura: 'escamas', seed: 247, luz: 0.44 });
  volume(c, s, p, poligono([[0.12, 0.26], [0.02, 0.14], [0.06, 0.42], [0.2, 0.44]]), {
    textura: 'liso', seed: 248, luz: 0.5,
  });
  volume(c, s, p, poligono([[0.88, 0.26], [0.98, 0.14], [0.94, 0.42], [0.8, 0.44]]), {
    textura: 'liso', seed: 249, luz: 0.5,
  });

  // Mandíbula aberta, com duas fileiras de dentes.
  const abre = [0.06, 0.03, 0, 0.03][q & 3];
  volume(c, s, p, poligono([
    [0.32, 0.54 + abre], [0.68, 0.54 + abre], [0.6, 0.74 + abre], [0.4, 0.74 + abre],
  ]), { textura: 'liso', luz: 0.28, semBrilho: true });
  marca(c, s, caixa(0.36, 0.58 + abre, 0.28, 0.1, 0.02), '#160c22');
  dentes(c, s, 0.34, 0.66, 0.54 + abre, 0.07, 6);
  dentes(c, s, 0.36, 0.64, 0.7 + abre, -0.05, 5);

  // Coroa de cristais com arco eléctrico entre eles.
  const pontas: [number, number][] = [[-0.26, 0.2], [-0.1, 0.32], [0.1, 0.32], [0.26, 0.2]];
  for (const [dx, alt] of pontas) {
    marca(c, s, poligono([[0.5 + dx - 0.07, 0.14], [0.5 + dx, 0.14 - alt], [0.5 + dx + 0.07, 0.14]]), p.contorno);
    marca(c, s, poligono([[0.5 + dx - 0.045, 0.135], [0.5 + dx, 0.15 - alt], [0.5 + dx + 0.045, 0.135]]), p.claro);
    marca(c, s, poligono([[0.5 + dx - 0.018, 0.13], [0.5 + dx, 0.17 - alt], [0.5 + dx + 0.018, 0.13]]), p.acento);
  }
  c.save();
  c.strokeStyle = p.acento;
  c.lineWidth = Math.max(1, s * 0.022);
  c.globalAlpha = [0.9, 0.35, 0.75, 0.25][q & 3];
  c.beginPath();
  c.moveTo((0.5 - 0.26) * s, (0.14 - 0.2) * s);
  c.lineTo((0.5 - 0.14) * s, (0.14 - 0.06) * s);
  c.lineTo((0.5 - 0.06) * s, (0.14 - 0.26) * s);
  c.lineTo((0.5 + 0.12) * s, (0.14 - 0.1) * s);
  c.lineTo((0.5 + 0.26) * s, (0.14 - 0.2) * s);
  c.stroke();
  c.restore();
  brilho(c, s, 0.5, 0.02, 0.34, `${p.acento}88`, 0.8);

  // Olhos maiores, com pupila em fenda.
  olhos(c, s, 0.5, 0.34, 0.19, 0.075, p.acento);
  marca(c, s, caixa(0.3, 0.29, 0.025, 0.1, 0.01), '#0c0818');
  marca(c, s, caixa(0.675, 0.29, 0.025, 0.1, 0.01), '#0c0818');
};

Object.assign(PINTORES, {
  'maquina:drone': maquina('drone'),
  'maquina:sentinela': maquina('sentinela'),
  'maquina:fundidor': maquina('fundidor'),
  'maquina:corrente': maquina('corrente'),
  'maquina:santo': maquina('santo'),
  'maquina:': maquina(''),
  'cao:': cao,
  'cao:cao': cao,
  'peixe:': peixe,
  'enguia:': enguia,
  'concha:': concha,
  'serpente:': serpente,
  'flor:': flor,
  'flor:mente': florMente,
  'olho:oraculo': olhoOraculo,
  'serpente:tempestade': serpenteTempestade,
  'espectro:areia': espectro('areia'),
  'espectro:eco': espectro('eco'),
  'espectro:nulo': espectro('nulo'),
  'espectro:': espectro('areia'),
  'olho:': olhoGigante,
  'gigante:': gigante,
  'portador:': portador,
  'boca:': boca,
  'cristal:': cristal,
  'esporo:': flor,
});

// --- Cache -------------------------------------------------------------------

const cache = new Map<string, HTMLCanvasElement>();

/** Tamanho do sprite conforme o tamanho da criatura. */
export function tamanhoSprite(raio: number): number {
  if (raio <= 0.38) return 48;
  if (raio <= 0.75) return 64;
  if (raio <= 1.3) return 96;
  return 128;
}

/** Devolve o sprite de uma criatura, pintando-o na primeira vez que é pedido. */
export function spriteCriatura(
  forma: string,
  detalhe: string,
  p: Paleta,
  quadro: number,
  tamanho: number,
): HTMLCanvasElement {
  const chave = `${forma}:${detalhe}|${p.base}${p.acento}|${quadro}|${tamanho}`;
  const existente = cache.get(chave);
  if (existente) return existente;

  const canvas = document.createElement('canvas');
  canvas.width = tamanho;
  canvas.height = tamanho;
  const c = canvas.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  const pintor = PINTORES[`${forma}:${detalhe}`] ?? PINTORES[`${forma}:`] ?? PINTORES['limo:'];
  pintor(c, tamanho, p, quadro);
  cache.set(chave, canvas);
  return canvas;
}

export function limparCacheBestiario(): void {
  cache.clear();
}

export { MINERAL, ROCHA };
export type { Caminho };
