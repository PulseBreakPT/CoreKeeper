/** Presentation-only accessibility and stable test hooks; no scoring rules here. */
export function prepararInterface(): void {
  let serial = 0;
  const marcar = (root: Element): void => {
    const nodes = [root, ...root.querySelectorAll('[id],button,input,label,h1,h2,h3,p,small,b,strong,span')];
    for (const node of nodes) {
      if (!(node instanceof HTMLElement) || node.dataset.testid || node.closest('[aria-hidden="true"]')) continue;
      node.dataset.testid = node.id === 'feedback-texto' ? 'feedback-text' : node.dataset.opcao ? `settings-${node.dataset.opcao}` : node.id ? `ui-${node.id}` : `ui-${node.tagName.toLowerCase()}-${++serial}`;
      if (node.dataset.opcao && node.getAttribute('role') !== 'switch') node.setAttribute('aria-pressed', String(node.textContent?.includes('LIGAD')));
    }
  };
  marcar(document.getElementById('app')!);
  // Valores longos mantêm-se numa linha, sem aumentar a altura dos indicadores.
  for (const id of ['pontos','combo','palavra','painel-titulo']) {
    const valor = document.getElementById(id)!;
    const ajustar = () => valor.style.setProperty(`--${id}-digitos`, String(Math.max(2, (valor.textContent || '').length)));
    ajustar();
    new MutationObserver(ajustar).observe(valor, {childList:true});
  }
  new MutationObserver(changes => {
    for (const change of changes) for (const node of change.addedNodes) if (node instanceof Element) marcar(node);
  }).observe(document.getElementById('app')!, { childList: true, subtree: true });

  const panels = ['folha', 'painel', 'revisao'].map(id => document.getElementById(id)!);
  const previousFocus = new Map<HTMLElement, HTMLElement | null>();
  const focusable = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]')].filter(node => node.tabIndex >= 0 && node.getClientRects().length);
  const atualizarFundo = () => {
    const active = [...panels].reverse().find(panel => !panel.hidden);
    document.querySelectorAll<HTMLElement>('#menu > *, #jogo > *').forEach(node => {
      if (node instanceof HTMLElement) node.inert = Boolean(active && node !== active && !node.contains(active));
    });
  };
  for (const panel of panels) {
    let wasHidden = panel.hidden;
    new MutationObserver(() => {
      if (panel.hidden === wasHidden) return;
      wasHidden = panel.hidden;
      atualizarFundo();
      if (!panel.hidden) {
        previousFocus.set(panel, document.activeElement as HTMLElement | null);
        focusable(panel)[0]?.focus({ preventScroll: true });
      } else {
        const previous = previousFocus.get(panel);
        if (previous?.isConnected && previous.getClientRects().length) previous.focus({ preventScroll: true });
      }
    }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        document.getElementById(panel.id === 'folha' ? 'fechar-folha-x' : panel.id === 'revisao' ? 'fechar-revisao' : 'ir-menu')?.click();
      }
      if (event.key !== 'Tab') return;
      const nodes = focusable(panel), first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
  }
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.repeat || document.getElementById('menu')!.hidden || panels.some(panel => !panel.hidden)) return;
    if (document.activeElement === document.body || document.activeElement === document.documentElement) {
      event.preventDefault();
      document.querySelector<HTMLButtonElement>('[data-modo="plural"]')?.click();
    }
  });
}