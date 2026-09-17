/**
 * HUD de The Hollow Star: um módulo de vitais preso ao fato do Portador,
 * um leitor de profundidade, a barra do guardião e os controlos tácteis.
 */

import type { Input } from '../core/input';
import { perf } from '../core/perf';
import type { Game } from '../game/game';
import { TAMANHO_HOTBAR } from '../game/inventory';
import { itemDef } from '../game/items';
import type { InfoBioma } from '../world/worldgen';
import { iconeItem } from './icones';

interface SlotHud {
  el: HTMLElement;
  img: HTMLImageElement;
  contagem: HTMLElement;
  chave: string;
}

const SIGILO = `
<svg viewBox="0 0 48 48" class="sigilo" aria-hidden="true">
  <defs>
    <radialGradient id="gSig" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff6c2"/>
      <stop offset="55%" stop-color="#f2c333"/>
      <stop offset="100%" stop-color="#7a5d0d"/>
    </radialGradient>
  </defs>
  <circle cx="24" cy="24" r="22" fill="#0b0912" stroke="#3a3350" stroke-width="2"/>
  <circle cx="24" cy="24" r="17" fill="none" stroke="#2a2440" stroke-width="1"/>
  <g class="sigilo-anel">
    <circle cx="24" cy="6.5" r="1.6" fill="#f2c333"/>
    <circle cx="41.5" cy="24" r="1.6" fill="#8a6f20"/>
    <circle cx="24" cy="41.5" r="1.6" fill="#f2c333"/>
    <circle cx="6.5" cy="24" r="1.6" fill="#8a6f20"/>
  </g>
  <path d="M24 10 L34 24 L24 38 L14 24 Z" fill="url(#gSig)" opacity="0.92"/>
  <path d="M24 15 L29.5 24 L24 33 L18.5 24 Z" fill="#0b0912" opacity="0.55"/>
  <circle cx="24" cy="24" r="3.4" fill="#fff6c2" class="sigilo-nucleo"/>
</svg>`;

function tubo(classe: string, rotulo: string): string {
  return `
  <div class="tubo ${classe}">
    <span class="tubo-rotulo">${rotulo}</span>
    <div class="tubo-corpo">
      <span class="tubo-fundo"></span>
      <span class="tubo-liquido"></span>
      <span class="tubo-brilho"></span>
      <span class="tubo-marcas"></span>
      <span class="tubo-vidro"></span>
    </div>
    <span class="tubo-valor"></span>
  </div>`;
}

export class Hud {
  readonly raiz: HTMLElement;
  aoEscolherSlot: ((indice: number) => void) | null = null;

  private vidaLiquido!: HTMLElement;
  private vidaValor!: HTMLElement;
  private fomeLiquido!: HTMLElement;
  private fomeValor!: HTMLElement;
  private sigilo!: HTMLElement;
  private camada!: HTMLElement;
  private profundidade!: HTMLElement;
  private fragmentos!: HTMLElement;
  private mensagens!: HTMLElement;
  private cartao!: HTMLElement;
  private chefeCaixa!: HTMLElement;
  private chefeBarra!: HTMLElement;
  private chefeNome!: HTMLElement;
  private chefeValor!: HTMLElement;
  private joystickBase!: HTMLElement;
  private joystickPonta!: HTMLElement;
  private botaoEstacao!: HTMLButtonElement;
  private rotuloEstacaoEl!: HTMLElement;
  private buffs!: HTMLElement;
  private slots: SlotHud[] = [];
  private nomeMao!: HTMLElement;
  private ultimoCartao = -1;
  private medidorFps!: HTMLElement;
  private medidorMs!: HTMLElement;
  private tempoMedidor = 0;

  constructor(
    private input: Input,
    private aoAbrirInventario: () => void,
    private aoAbrirMenu: () => void,
  ) {
    this.raiz = document.createElement('div');
    this.raiz.id = 'hud';
    this.raiz.innerHTML = `
      <div class="hud-topo">
        <div class="modulo modulo-vitais">
          <div class="modulo-placa"></div>
          ${SIGILO}
          <div class="tubos">
            ${tubo('tubo-vida', 'VITAL')}
            ${tubo('tubo-fome', 'RESERVA')}
          </div>
          <div class="buffs"></div>
        </div>

        <div class="modulo modulo-leitura">
          <div class="modulo-placa"></div>
          <div class="leitura-camada"></div>
          <div class="leitura-linha">
            <span class="leitura-num"></span>
            <span class="leitura-un">un. do Relé</span>
          </div>
          <div class="fragmentos"></div>
          <div class="varrimento"></div>
        </div>

        <div class="medidor" title="Quadros por segundo · tempo de lógica e de desenho">
          <span class="medidor-fps"></span>
          <span class="medidor-ms"></span>
        </div>

        <button class="botao-chapa" id="btn-menu" aria-label="Menu">
          <span class="chapa-linhas"></span>
        </button>
      </div>

      <div class="chefe-caixa oculto">
        <div class="chefe-topo">
          <span class="chefe-nome"></span>
          <span class="chefe-valor"></span>
        </div>
        <div class="chefe-barra">
          <span class="chefe-fundo"></span>
          <span class="chefe-fill"></span>
          <span class="chefe-marcas"></span>
        </div>
      </div>

      <div class="cartao-bioma"><span class="cartao-nome"></span><span class="cartao-sub"></span></div>
      <div class="mensagens"></div>

      <div class="joystick oculto">
        <span class="joystick-anel"></span>
        <span class="joystick-ponta"></span>
      </div>

      <div class="hud-fundo">
        <div class="bloco-hotbar">
          <div class="nome-mao"></div>
          <div class="hotbar"></div>
        </div>
        <div class="botoes">
          <div class="botoes-secundarios">
            <button class="botao-redondo botao-estacao oculto" data-acao="interact" aria-label="Usar">
              <span class="glifo">USAR</span>
            </button>
            <button class="botao-redondo botao-mochila" aria-label="Mochila"><span class="glifo">MOCH</span></button>
          </div>
          <button class="botao-redondo botao-colocar" data-acao="place" aria-label="Colocar"><span class="glifo">POR</span></button>
          <button class="botao-redondo botao-atacar" data-acao="attack" aria-label="Atacar e minar">
            <span class="anel-atacar"></span><span class="glifo">MINAR</span>
          </button>
        </div>
      </div>
      <div class="rotulo-estacao oculto"></div>`;

    this.ligar();
  }

  private ligar(): void {
    const q = <T extends HTMLElement>(sel: string): T => this.raiz.querySelector(sel) as T;
    this.vidaLiquido = q('.tubo-vida .tubo-liquido');
    this.vidaValor = q('.tubo-vida .tubo-valor');
    this.fomeLiquido = q('.tubo-fome .tubo-liquido');
    this.fomeValor = q('.tubo-fome .tubo-valor');
    this.sigilo = q('.sigilo');
    this.camada = q('.leitura-camada');
    this.profundidade = q('.leitura-num');
    this.fragmentos = q('.fragmentos');
    this.mensagens = q('.mensagens');
    this.cartao = q('.cartao-bioma');
    this.chefeCaixa = q('.chefe-caixa');
    this.chefeBarra = q('.chefe-fill');
    this.chefeNome = q('.chefe-nome');
    this.chefeValor = q('.chefe-valor');
    this.joystickBase = q('.joystick');
    this.joystickPonta = q('.joystick-ponta');
    this.botaoEstacao = q('.botao-estacao');
    this.rotuloEstacaoEl = q('.rotulo-estacao');
    this.buffs = q('.buffs');
    this.nomeMao = q('.nome-mao');
    this.medidorFps = q('.medidor-fps');
    this.medidorMs = q('.medidor-ms');

    for (const botao of this.raiz.querySelectorAll<HTMLElement>('[data-acao]')) {
      this.input.bindButton(botao, botao.dataset.acao as 'attack' | 'place' | 'interact');
    }
    q<HTMLButtonElement>('.botao-mochila').addEventListener('click', (e) => {
      e.stopPropagation();
      this.aoAbrirInventario();
    });
    q<HTMLButtonElement>('#btn-menu').addEventListener('click', (e) => {
      e.stopPropagation();
      this.aoAbrirMenu();
    });

    const hotbar = q('.hotbar');
    for (let i = 0; i < TAMANHO_HOTBAR; i++) {
      const el = document.createElement('button');
      el.className = 'socket';
      el.innerHTML = `
        <span class="socket-bisel"></span>
        <img class="icone" alt="" />
        <span class="contagem"></span>
        <span class="socket-num">${i + 1}</span>`;
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
      el.addEventListener('click', () => this.aoEscolherSlot?.(i));
      hotbar.appendChild(el);
      this.slots.push({
        el,
        img: el.querySelector('img') as HTMLImageElement,
        contagem: el.querySelector('.contagem') as HTMLElement,
        chave: '',
      });
    }

    for (let i = 0; i < 7; i++) {
      const d = document.createElement('span');
      d.className = 'fragmento';
      this.fragmentos.appendChild(d);
    }

    this.input.setStickListener((ativo, ox, oy, dx, dy) => {
      this.joystickBase.classList.toggle('oculto', !ativo);
      if (!ativo) return;
      this.joystickBase.style.left = `${ox}px`;
      this.joystickBase.style.top = `${oy}px`;
      this.joystickPonta.style.transform = `translate(${dx}px, ${dy}px)`;
    });
  }

  mensagem(texto: string, tipo: 'info' | 'bom' | 'aviso' | 'lore' = 'info'): void {
    const el = document.createElement('div');
    el.className = `mensagem ${tipo}`;
    el.innerHTML = `<span class="mensagem-marca"></span><span class="mensagem-texto"></span>`;
    const alvo = el.querySelector('.mensagem-texto') as HTMLElement;
    this.mensagens.appendChild(el);

    // A lore aparece como se estivesse a ser transmitida por um terminal antigo.
    if (tipo === 'lore') {
      let i = 0;
      const escrever = () => {
        alvo.textContent = texto.slice(0, ++i);
        if (i < texto.length) setTimeout(escrever, 16);
      };
      escrever();
    } else {
      alvo.textContent = texto;
    }

    const duracao = tipo === 'lore' ? 5200 : 2900;
    setTimeout(() => el.classList.add('some'), duracao);
    setTimeout(() => el.remove(), duracao + 600);
    while (this.mensagens.childElementCount > 4) this.mensagens.firstElementChild?.remove();
  }

  /** O medidor actualiza-se duas vezes por segundo: chega para ler e não pesa. */
  private atualizarMedidor(): void {
    const agora = performance.now();
    if (agora - this.tempoMedidor < 480) return;
    this.tempoMedidor = agora;
    this.medidorFps.textContent = `${perf.fps} FPS`;
    this.medidorFps.className = `medidor-fps ${classeFps(perf.fps)}`;
    this.medidorMs.textContent = `${perf.msLogica.toFixed(1)}+${perf.msDesenho.toFixed(1)} ms`;
  }

  /** Cartão de entrada numa camada nova. */
  anunciarBioma(info: InfoBioma, indice: number): void {
    if (indice === this.ultimoCartao) return;
    this.ultimoCartao = indice;
    (this.cartao.querySelector('.cartao-nome') as HTMLElement).textContent = info.nome;
    (this.cartao.querySelector('.cartao-sub') as HTMLElement).textContent = info.subtitulo;
    this.cartao.classList.remove('mostrar');
    void this.cartao.offsetWidth;
    this.cartao.classList.add('mostrar');
    setTimeout(() => this.cartao.classList.remove('mostrar'), 4200);
  }

  atualizar(jogo: Game): void {
    const p = jogo.player;
    this.atualizarMedidor();
    const vida = Math.max(0, p.vida / p.vidaMax);
    this.vidaLiquido.style.height = `${vida * 100}%`;
    this.vidaValor.textContent = `${Math.ceil(p.vida)}`;
    this.raiz.classList.toggle('critico', vida < 0.3);
    this.sigilo.style.setProperty('--pulso', String(0.6 + vida * 0.4));

    const fome = Math.max(0, p.fome / p.fomeMax);
    this.fomeLiquido.style.height = `${fome * 100}%`;
    this.fomeValor.textContent = `${Math.ceil(p.fome)}`;

    this.camada.textContent = jogo.nomeBioma();
    this.profundidade.textContent = String(jogo.distanciaAoRele());

    const ganhos = jogo.fragmentosReunidos();
    const filhos = this.fragmentos.children;
    for (let i = 0; i < filhos.length; i++) {
      (filhos[i] as HTMLElement).classList.toggle('aceso', i < ganhos);
    }

    // Buffs activos.
    const ativos = p.buffsAtivos();
    if (ativos.length !== this.buffs.childElementCount) {
      this.buffs.textContent = '';
      for (const b of ativos) {
        const el = document.createElement('span');
        el.className = `buff buff-${b.tipo}`;
        el.textContent = rotuloBuff(b.tipo);
        this.buffs.appendChild(el);
      }
    }

    const inv = jogo.inventario;
    for (let i = 0; i < this.slots.length; i++) {
      const s = inv.slots[i];
      const hud = this.slots[i];
      const chave = s ? `${s.item}:${s.quantidade}` : '';
      if (chave !== hud.chave) {
        hud.chave = chave;
        if (s) {
          hud.img.src = iconeItem(s.item);
          hud.img.style.visibility = 'visible';
          hud.contagem.textContent = s.quantidade > 1 ? String(s.quantidade) : '';
        } else {
          hud.img.style.visibility = 'hidden';
          hud.contagem.textContent = '';
        }
      }
      hud.el.classList.toggle('ativo', i === inv.selecionado);
    }

    const mao = inv.itemSelecionado();
    const nome = mao?.nome ?? 'Mãos nuas';
    if (this.nomeMao.textContent !== nome) this.nomeMao.textContent = nome;

    const chefe = jogo.chefeAtivo;
    this.chefeCaixa.classList.toggle('oculto', !chefe);
    if (chefe) {
      this.chefeNome.textContent = chefe.nome;
      const f = Math.max(0, chefe.vida / chefe.vidaMax);
      this.chefeBarra.style.width = `${f * 100}%`;
      this.chefeValor.textContent = `${Math.ceil(f * 100)}%`;
    }

    const estacao = jogo.estacaoPerto();
    const comida = mao?.comida;
    this.botaoEstacao.classList.toggle('oculto', !estacao && !comida);
    const glifo = this.botaoEstacao.querySelector('.glifo') as HTMLElement;
    if (estacao) glifo.textContent = rotuloEstacao(estacao.kind);
    else if (comida) glifo.textContent = 'COMER';
    if (estacao) {
      this.rotuloEstacaoEl.classList.remove('oculto');
      this.rotuloEstacaoEl.textContent = `▸ ${nomeEstacaoCurto(estacao.kind)}`;
    } else {
      this.rotuloEstacaoEl.classList.add('oculto');
    }
  }
}

export function classeFps(fps: number): string {
  if (fps >= 50) return 'bom';
  if (fps >= 30) return 'medio';
  return 'mau';
}

function rotuloBuff(tipo: string): string {
  switch (tipo) {
    case 'velocidade': return 'VEL';
    case 'defesa': return 'DEF';
    case 'dano': return 'DAN';
    case 'folego': return 'AR';
    default: return tipo.slice(0, 3).toUpperCase();
  }
}

function rotuloEstacao(kind: string): string {
  switch (kind) {
    case 'capsula': return 'DORMIR';
    case 'rele': return 'RELÉ';
    default: return 'ABRIR';
  }
}

function nomeEstacaoCurto(kind: string): string {
  switch (kind) {
    case 'bancada': return 'Bancada';
    case 'forja': return 'Forja';
    case 'fundicao': return 'Fundição de Arco';
    case 'fogao': return 'Lareira';
    case 'fabricador': return 'Fabricador Kael';
    case 'capsula': return 'Cápsula de Portador';
    case 'rele': return 'Relé dos Architects';
    default: return 'Estação';
  }
}

export { itemDef };
