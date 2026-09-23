/** Motor decorativo limitado: não conhece respostas, pontuações ou regras. */
export const CORES_FX = ['#ffdf55', '#fff3bd', '#78e5bb', '#ff9dbd', '#89d9ff'];
export const ESTRELA_FX = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 1 3.1 7.2L23 9l-5.8 5.5 1.4 8L12 18.4l-6.6 4.1 1.4-8L1 9l7.9-.8Z" fill="currentColor" stroke="#a97225" stroke-width=".8"/><path d="m12 4 1.5 5.8-5.4.5Z" fill="#fffce9" opacity=".8"/></svg>';

export class MotorEfeitos {
  readonly abortar = new AbortController();
  readonly movimento = matchMedia('(prefers-reduced-motion: reduce)');
  readonly camada = document.createElement('div');
  private animacoes = new Map<Animation, () => void>();
  private observadores: MutationObserver[] = [];
  private decoracoes: HTMLElement[] = [];

  constructor() {
    this.camada.className = 'nw-fx-camada';
    this.camada.setAttribute('aria-hidden', 'true');
    this.camada.dataset.testid = 'visual-effects-layer';
    document.body.append(this.camada);
  }

  pode(): boolean {
    return !document.hidden && !this.movimento.matches
      && !document.documentElement.classList.contains('reduzir-movimento');
  }

  decorar(host: Element, classe: string, efeito: string): HTMLElement {
    const node = document.createElement('span');
    node.className = `nw-fx ${classe}`;
    node.setAttribute('aria-hidden', 'true');
    node.dataset.efeito = efeito;
    host.append(node);
    this.decoracoes.push(node);
    return node;
  }

  animar(node: HTMLElement, frames: Keyframe[], duracao: number, remover = false, atraso = 0): void {
    if (!this.pode() || this.animacoes.size >= 56) { if (remover) node.remove(); return; }
    const animation = node.animate(frames, {duration:duracao, delay:atraso, easing:'cubic-bezier(.2,.7,.3,1)', fill:'both'});
    const limpar = () => { this.animacoes.delete(animation); if (remover) node.remove(); animation.cancel(); };
    this.animacoes.set(animation, limpar);
    animation.finished.then(limpar, () => { this.animacoes.delete(animation); if (remover) node.remove(); });
  }

  particula(x: number, y: number, frames: Keyframe[], op: {cor?:string; tamanho?:number; tipo?:string; duracao?:number; atraso?:number; efeito:string}): void {
    if (!this.pode() || this.animacoes.size >= 56) return;
    const node = document.createElement('i');
    node.className = `nw-fx-particula ${op.tipo || 'estrela'}`;
    node.dataset.efeito = op.efeito;
    node.style.cssText = `left:${x}px;top:${y}px;width:${op.tamanho || 12}px;height:${op.tamanho || 12}px;color:${op.cor || CORES_FX[0]};`;
    if (!op.tipo || op.tipo === 'estrela') node.innerHTML = ESTRELA_FX;
    this.camada.append(node);
    this.animar(node, frames, op.duracao || 750, true, op.atraso || 0);
  }

  observar(alvo: Node, callback: MutationCallback, op: MutationObserverInit): void {
    const observer = new MutationObserver(callback);
    observer.observe(alvo, op);
    this.observadores.push(observer);
  }

  limpar(): void {
    for (const [animation, limpar] of [...this.animacoes]) { animation.cancel(); limpar(); }
    this.camada.replaceChildren();
  }

  destruir(): void {
    this.limpar(); this.abortar.abort();
    this.observadores.forEach(observer => observer.disconnect());
    this.decoracoes.forEach(node => node.remove());
    this.camada.remove();
    delete document.documentElement.dataset.fxSuspenso;
  }
}