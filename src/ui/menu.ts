/** Ecrãs de menu: entrada, pausa e morte. */

import { audio } from '../core/audio';
import { FundoMenu } from './fundo';

export type ModoQualidade = 'auto' | 'alta' | 'media' | 'baixa';

export interface AcoesMenu {
  novoJogo(seedTexto: string): void;
  continuar(): void;
  retomar(): void;
  guardar(): void;
  abandonar(): void;
  /** Lê e escreve a qualidade gráfica; devolve o valor actual. */
  qualidade(novo?: ModoQualidade): ModoQualidade;
  /** FPS e milissegundos actuais, para mostrar ao lado da opção. */
  desempenho(): { fps: number; ms: number };
}

export class Menus {
  readonly raiz: HTMLElement;
  private caixa: HTMLElement;
  private fundo = new FundoMenu();
  aberto = false;

  constructor(private acoes: AcoesMenu) {
    this.raiz = document.createElement('div');
    this.raiz.className = 'menu oculto';
    this.raiz.innerHTML = '<div class="menu-caixa"></div>';
    this.caixa = this.raiz.querySelector('.menu-caixa') as HTMLElement;
    this.raiz.insertBefore(this.fundo.canvas, this.caixa);
    this.raiz.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  private abrir(html: string, comFundo: boolean): void {
    this.caixa.innerHTML = html;
    this.raiz.classList.remove('oculto');
    this.raiz.classList.toggle('com-fundo', comFundo);
    this.fundo.canvas.classList.toggle('oculto', !comFundo);
    if (comFundo) this.fundo.iniciar();
    else this.fundo.parar();
    this.aberto = true;
  }

  fechar(): void {
    this.raiz.classList.add('oculto');
    this.fundo.parar();
    this.aberto = false;
  }

  mostrarInicial(temSave: boolean): void {
    this.abrir(`
      <h1 class="logo">Bearer 73<strong>The <em>Hollow</em> Star</strong></h1>
      <p class="subtitulo">Acordaste numa câmara selada, sem memória, ao lado de uma estrutura negra que te reconheceu.
      Não há saída para a superfície. Só há para baixo.</p>
      ${temSave ? '<button class="botao primario" id="continuar">Continuar</button>' : ''}
      <button class="botao ${temSave ? '' : 'primario'}" id="novo">Jogo novo</button>
      <label class="campo">Semente (opcional)
        <input id="seed" type="text" inputmode="text" placeholder="deixa vazio para aleatório" maxlength="24" />
      </label>
      <details class="ajuda">
        <summary>Como se joga</summary>
        <ul>
          <li>Arrasta na metade esquerda do ecrã para andares.</li>
          <li>MINAR ataca o bicho à tua frente, ou pica a rocha que estiveres a encarar.</li>
          <li>POR coloca o que tens na mão. USAR abre estações e o Relé.</li>
          <li>MOCH abre a mochila: toca num item para o escolher, toca outra vez para o usar.</li>
          <li>Arranca Ironroot, faz uma Bancada com 8, e sobe de nível de ferramenta.</li>
          <li>O Relé aponta-te o guardião mais próximo. Cada um guarda um fragmento.</li>
        </ul>
      </details>
      <p class="rodape-menu">Teclado: WASD mover · Espaço atacar · F colocar · E usar · I mochila</p>
      <p class="rodape-menu">"Everything buried was buried for a reason."</p>`, true);

    this.caixa.querySelector('#novo')?.addEventListener('click', () => {
      audio.garantir();
      audio.retomar();
      const seed = (this.caixa.querySelector('#seed') as HTMLInputElement | null)?.value ?? '';
      this.acoes.novoJogo(seed.trim());
    });
    this.caixa.querySelector('#continuar')?.addEventListener('click', () => {
      audio.garantir();
      audio.retomar();
      this.acoes.continuar();
    });
  }

  mostrarPausa(): void {
    const d = this.acoes.desempenho();
    this.abrir(`
      <h2>Pausa</h2>
      <p class="linha-desempenho">${d.fps} FPS · ${d.ms.toFixed(1)} ms por quadro</p>
      <button class="botao primario" id="retomar">Retomar</button>
      <label class="campo">Qualidade gráfica
        <div class="escolhas" id="qualidade">
          ${['auto', 'alta', 'media', 'baixa']
            .map(
              (q) =>
                `<button data-q="${q}" class="${this.acoes.qualidade() === q ? 'ativa' : ''}">${rotuloQualidade(q as ModoQualidade)}</button>`,
            )
            .join('')}
        </div>
      </label>
      <button class="botao" id="guardar">Guardar agora</button>
      <button class="botao" id="som">${audio.ligado ? 'Som: ligado' : 'Som: desligado'}</button>
      <button class="botao" id="ecra">Ecrã inteiro</button>
      <button class="botao perigo" id="abandonar">Voltar ao início</button>`, false);

    for (const b of this.caixa.querySelectorAll<HTMLButtonElement>('#qualidade button')) {
      b.addEventListener('click', () => {
        this.acoes.qualidade(b.dataset.q as ModoQualidade);
        for (const outro of this.caixa.querySelectorAll('#qualidade button')) outro.classList.remove('ativa');
        b.classList.add('ativa');
      });
    }
    this.caixa.querySelector('#retomar')?.addEventListener('click', () => this.acoes.retomar());
    this.caixa.querySelector('#guardar')?.addEventListener('click', () => this.acoes.guardar());
    this.caixa.querySelector('#som')?.addEventListener('click', (e) => {
      audio.ligado = !audio.ligado;
      (e.currentTarget as HTMLElement).textContent = audio.ligado ? 'Som: ligado' : 'Som: desligado';
    });
    this.caixa.querySelector('#ecra')?.addEventListener('click', () => {
      const el = document.documentElement;
      if (document.fullscreenElement) void document.exitFullscreen();
      else void el.requestFullscreen?.().catch(() => undefined);
    });
    this.caixa.querySelector('#abandonar')?.addEventListener('click', () => this.acoes.abandonar());
  }
}

function rotuloQualidade(q: ModoQualidade): string {
  switch (q) {
    case 'auto': return 'Auto';
    case 'alta': return 'Alta';
    case 'media': return 'Média';
    default: return 'Baixa';
  }
}

export class EcraMorte {
  readonly raiz: HTMLElement;

  constructor() {
    this.raiz = document.createElement('div');
    this.raiz.className = 'morte oculto';
    this.raiz.innerHTML = '<div><h2>Caíste nas cavernas</h2><p>A regressar ao teu ponto de descanso…</p></div>';
  }

  mostrar(): void {
    this.raiz.classList.remove('oculto');
  }

  esconder(): void {
    this.raiz.classList.add('oculto');
  }
}
