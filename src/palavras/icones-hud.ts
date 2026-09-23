/** Ilustrações vetoriais do HUD: a mesma luz superior esquerda e contorno esculpido. */
type IconeHud = 'pontos' | 'combo' | 'calor';

const Moeda = () => `<defs>
  <linearGradient id="hud-coin-edge" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#fff6bd"/><stop offset=".35" stop-color="#ffc939"/><stop offset=".7" stop-color="#c87b13"/><stop offset="1" stop-color="#9d500c"/></linearGradient>
  <linearGradient id="hud-coin-face" x1=".15" y1="0" x2=".85" y2="1"><stop stop-color="#fffbc9"/><stop offset=".43" stop-color="#ffe578"/><stop offset="1" stop-color="#ffb725"/></linearGradient>
  <linearGradient id="hud-coin-star" x2=".3" y2="1"><stop stop-color="#fffce4"/><stop offset="1" stop-color="#ffdf76"/></linearGradient>
  </defs>
  <ellipse cx="24" cy="43" rx="15" ry="2" fill="#154770" opacity=".18"/>
  <circle cx="24" cy="25" r="19" fill="#a25c0e" stroke="#78420c" stroke-width="1.8"/>
  <path d="M9 32v4m6-1v6m9-4v7m9-9v6m6-9v4" stroke="#f6bb35" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="24" cy="21.5" r="19" fill="url(#hud-coin-edge)" stroke="#845015" stroke-width="1.8"/>
  <circle cx="24" cy="21.5" r="15.4" fill="url(#hud-coin-face)" stroke="#b07820" stroke-width="1.4"/>
  <path d="M11 18a14 14 0 0 1 22-8" fill="none" stroke="#fffce8" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M13 31a14 14 0 0 0 23-7" fill="none" stroke="#d18b18" stroke-width="1.7" stroke-linecap="round"/>
  <path class="hud-coin-star" d="m24 10 3.5 7.1 7.8 1.1-5.6 5.5 1.3 7.8-7-3.7-7 3.7 1.3-7.8-5.6-5.5 7.8-1.1Z" fill="#bb7d1b" transform="translate(0 1.2)"/>
  <path class="hud-coin-star" d="m24 10 3.5 7.1 7.8 1.1-5.6 5.5 1.3 7.8-7-3.7-7 3.7 1.3-7.8-5.6-5.5 7.8-1.1Z" fill="url(#hud-coin-star)" stroke="#b17c24" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="m24 13 1 6-5.8.5Z" fill="#fffef0"/>
  <path d="m38 5 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="#fffce3" stroke="#e8bd61" stroke-width=".6"/>`;

const Elos = () => `<defs>
  <linearGradient id="hud-chain-jade" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffde7"/><stop offset=".43" stop-color="#d4ffe2"/><stop offset="1" stop-color="#62cfa6"/></linearGradient>
  <linearGradient id="hud-chain-gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff9cf"/><stop offset=".48" stop-color="#ffe77b"/><stop offset="1" stop-color="#eaa738"/></linearGradient>
  </defs>
  <ellipse cx="24" cy="43" rx="15" ry="2" fill="#17462e" opacity=".18"/>
  <g transform="rotate(38 24 24)" fill="none" stroke-linejoin="round">
    <g transform="translate(0 1.7)" stroke="#1c6649" stroke-width="8"><rect x="15" y="5" width="18" height="25" rx="9"/><rect x="15" y="19" width="18" height="25" rx="9"/></g>
    <rect x="15" y="4" width="18" height="25" rx="9" stroke="#286747" stroke-width="8"/>
    <rect x="15" y="4" width="18" height="25" rx="9" stroke="url(#hud-chain-jade)" stroke-width="5.3"/>
    <path d="M18 14v-1a6 6 0 0 1 10-4" stroke="#fffef0" stroke-width="1.5" stroke-linecap="round"/>
    <rect x="15" y="18" width="18" height="25" rx="9" stroke="#806522" stroke-width="8"/>
    <rect x="15" y="18" width="18" height="25" rx="9" stroke="url(#hud-chain-gold)" stroke-width="5.3"/>
    <path d="M18 28v-1a6 6 0 0 1 10-4" stroke="#fffce6" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M33 15v5a9 9 0 0 1-9 9" stroke="#286747" stroke-width="8"/>
    <path d="M33 15v5a9 9 0 0 1-9 9" stroke="url(#hud-chain-jade)" stroke-width="5.3"/>
    <path d="M31.5 17v3a7.5 7.5 0 0 1-3.3 6.2" stroke="#f7ffe7" stroke-width="1.3" stroke-linecap="round"/>
  </g>`;

const Chama = () => `<defs>
  <linearGradient id="hud-flame-shell" x1=".2" y1="0" x2=".65" y2="1"><stop stop-color="#fff19a"/><stop offset=".34" stop-color="#ffd348"/><stop offset=".72" stop-color="#ffa927"/><stop offset="1" stop-color="#e16a19"/></linearGradient>
  <linearGradient id="hud-flame-inner" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#fff6b2"/><stop offset="1" stop-color="#ffda63"/></linearGradient>
  <radialGradient id="hud-flame-light"><stop stop-color="#fff5b6" stop-opacity=".9"/><stop offset="1" stop-color="#ffcd60" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse class="hud-flame-halo" cx="24" cy="26" rx="23" ry="22" fill="url(#hud-flame-light)"/>
  <ellipse cx="24" cy="44" rx="13" ry="2" fill="#144d70" opacity=".22"/>
  <path d="M25 3c3 9-4 11 0 17 4-2 6-6 6-10 8 7 13 18 9 26-3 7-10 10-17 9C9 44 5 33 10 24c2-4 5-7 8-10-1 6-1 9 2 11 5-7 2-13 5-22Z" fill="#ad531a" stroke="#864017" stroke-width="1.8" stroke-linejoin="round" transform="translate(0 1)"/>
  <path d="M25 2c3 9-4 11 0 17 4-2 6-6 6-10 8 7 13 18 9 26-3 7-10 10-17 9C9 43 5 32 10 23c2-4 5-7 8-10-1 6-1 9 2 11 5-7 2-13 5-22Z" fill="url(#hud-flame-shell)" stroke="#a45b1d" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M14 29c-2 5 0 9 4 11" fill="none" stroke="#ffe79a" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M27 21c1 6-3 7-1 11 3-1 4-3 4-5 7 10 2 16-5 16-9 0-13-8-5-15 0 4 1 5 2 6 4-4 3-9 5-13Z" fill="url(#hud-flame-inner)"/>
  <path class="hud-flame-core" d="M25 30c1 4-2 5-1 7l3-3c4 5 2 8-2 8-5 0-7-5 0-12Z" fill="#fffef0"/>
  <path d="M24 8c0 4-2 6-2 9" fill="none" stroke="#fff5c1" stroke-width="1.8" stroke-linecap="round"/>`;

export function HudIcon(tipo: IconeHud): string {
  return `<svg class="hud-ilustracao hud-${tipo}" viewBox="0 0 48 48" aria-hidden="true" focusable="false" data-testid="hud-${tipo}-icon">${{pontos:Moeda,combo:Elos,calor:Chama}[tipo]()}</svg>`;
}

/** Cada coração tem gradientes próprios e distingue forma/contraste, não só cor. */
export function CoracaoHud(ativo: boolean, indice: number): string {
  const id = `hud-heart-${indice}`;
  const forma = 'M24 42 7 26C-5 14 10-1 24 12 38-1 53 14 41 26Z';
  return `<svg class="life-icon hud-coracao ${ativo?'':'lost'}" viewBox="0 0 48 48" aria-hidden="true" focusable="false" data-testid="hud-life-${indice+1}" data-life-state="${ativo?'available':'lost'}"><defs>
    <linearGradient id="${id}-ruby" x1=".1" y1="0" x2=".8" y2="1"><stop stop-color="#ffdcdd"/><stop offset=".35" stop-color="#ff839e"/><stop offset=".72" stop-color="#ed426e"/><stop offset="1" stop-color="#ba2757"/></linearGradient>
    <linearGradient id="${id}-rim" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#fff9e8"/><stop offset=".5" stop-color="#ffd7d5"/><stop offset="1" stop-color="#e18496"/></linearGradient>
    </defs>
    <path class="heart-depth" d="${forma}" transform="translate(0 2)" fill="#9c3057" stroke="#7c244b" stroke-width="2" stroke-linejoin="round"/>
    <path class="heart-body" d="${forma}" fill="url(#${id}-ruby)" stroke="url(#${id}-rim)" stroke-width="2.2" stroke-linejoin="round"/>
    <path class="heart-facet heart-top" d="m7 16 11-7 6 8 7-8 10 7-8 5H15Z" fill="#ffc6ce" opacity=".7"/>
    <path class="heart-facet" d="m15 21 9-4 9 4-9 19Z" fill="#fa5f88" opacity=".7"/>
    <path class="heart-facet" d="m7 16 8 5 9 19L7 25Z" fill="#ff9db5" opacity=".65"/>
    <path class="heart-facet" d="m41 16-8 5-9 19 17-15Z" fill="#a82b5b" opacity=".3"/>
    <path class="heart-shine" d="M10 16q4-6 10-1" fill="none" stroke="#fff6e7" stroke-width="3.2" stroke-linecap="round"/>
    ${ativo?'':'<path class="heart-empty-mark" d="m26 12-6 10 7 3-6 13" fill="none" stroke="#ecb8c9" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'}
  </svg>`;
}

export function VidasHud(vidas: number): string {
  return Array.from({length:3},(_,i) => CoracaoHud(i<vidas,i)).join('');
}