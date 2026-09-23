/** Peças ilustradas partilhadas: contorno, volume e luz coerentes com o HUD. */
export type Ilustracao = 'crown' | 'chart' | 'settings' | 'relogio' | 'alvo' | 'balao';
let sequencia = 0;

const desenhos: Record<Ilustracao, string> = {
  crown: `<ellipse cx="24" cy="43" rx="18" ry="2" fill="#573818" opacity=".2"/>
    <path d="m7 14 9 7 8-14 8 14 9-7-5 24H12Z" fill="url(#gold)" stroke="#925218" stroke-width="2" stroke-linejoin="round"/>
    <path d="m11 20 7 6 6-11 6 11 7-6-3 12H14Z" fill="#ffe994" opacity=".68"/>
    <path d="m10 18 5 17M24 12v20" stroke="#fff8cc" stroke-width="2" stroke-linecap="round" opacity=".85"/>
    <rect x="10" y="34" width="28" height="8" rx="3" fill="#ad650e" stroke="#86511e" stroke-width="1.8"/>
    <rect x="10" y="32" width="28" height="7" rx="3" fill="url(#gold)" stroke="#a2691b" stroke-width="1.5"/>
    <path d="M14 34h20" stroke="#fff9cd" stroke-width="1.6" stroke-linecap="round"/>
    <path d="m24 21 4 5-4 5-4-5Z" fill="url(#ruby)" stroke="#ab4852" stroke-width="1"/>
    <g fill="#fff0a1" stroke="#a36922" stroke-width="1.3"><circle cx="7" cy="13" r="3.2"/><circle cx="24" cy="6" r="3.2"/><circle cx="41" cy="13" r="3.2"/></g>`,
  chart: `<ellipse cx="24" cy="44" rx="21" ry="2" fill="#205574" opacity=".2"/>
    <g stroke="#176186" stroke-width="1.7"><rect x="3" y="25" width="12" height="18" rx="3" fill="url(#blue)"/><rect x="18" y="14" width="12" height="29" rx="3" fill="url(#gold)" stroke="#98702c"/><rect x="33" y="21" width="12" height="22" rx="3" fill="url(#blue)"/></g>
    <path d="M6 28h6m9-11h6m9 7h6" stroke="#fffde4" stroke-width="2" stroke-linecap="round"/>
    <path d="M6 30v9m15-20v20m15-13v13" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".4"/>
    <path d="m24 1 2.3 4.6 5.1.8-3.7 3.6.9 5-4.6-2.4-4.6 2.4.9-5L16.6 6.4l5.1-.8Z" fill="url(#gold)" stroke="#9c6b1c" stroke-width="1.3" stroke-linejoin="round"/>`,
  settings: `<path d="m20 5 8 0 2 5 4 2 5-1 4 7-4 4v5l4 4-4 7-5-1-4 2-2 5h-8l-2-5-4-2-5 1-4-7 4-4v-5l-4-4 4-7 5 1 4-2Z" fill="#175984" stroke="#154b74" stroke-width="2" transform="translate(0 1)"/>
    <path d="m20 3 8 0 2 5 4 2 5-1 4 7-4 4v5l4 4-4 7-5-1-4 2-2 5h-8l-2-5-4-2-5 1-4-7 4-4v-5l-4-4 4-7 5 1 4-2Z" fill="url(#blue)" stroke="#256286" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="m21 6 5 0 2 5 7 3 3-1" fill="none" stroke="#eaffff" stroke-width="2" stroke-linecap="round"/>
    <circle cx="24" cy="22.5" r="11.5" fill="#1e7198" stroke="#bcefff" stroke-width="1.6"/>
    <circle cx="24" cy="23" r="8.5" fill="url(#paper)" stroke="#155578" stroke-width="1.8"/>
    <circle cx="24" cy="23" r="3.2" fill="url(#gold)" stroke="#af7a27" stroke-width="1"/>`,
  relogio: `<rect x="19" y="1" width="10" height="7" rx="2.5" fill="url(#gold)" stroke="#9a611e" stroke-width="1.5"/>
    <path d="m36 8 5 5" stroke="#9a611e" stroke-width="5" stroke-linecap="round"/>
    <path d="m36 7 5 5" stroke="#ffe19b" stroke-width="3" stroke-linecap="round"/>
    <circle cx="24" cy="27" r="19" fill="#b06c19" stroke="#865219" stroke-width="1.6"/>
    <circle cx="24" cy="24.5" r="19" fill="url(#gold)" stroke="#996321" stroke-width="1.7"/>
    <circle cx="24" cy="24.5" r="14.5" fill="url(#paper)" stroke="#ae8034" stroke-width="1.4"/>
    <path d="M11 18a15 15 0 0 1 23-5" fill="none" stroke="#fffde9" stroke-width="2.1" stroke-linecap="round"/>
    <path d="M24 12v2m0 21v2M12 25h2m21 0h2" stroke="#ae8e54" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M24 16v10l6 4" fill="none" stroke="#28557a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="24" cy="26" r="2.8" fill="#ffd776" stroke="#957137" stroke-width="1"/>`,
  alvo: `<circle cx="23" cy="26" r="20" fill="#674295" stroke="#53357f" stroke-width="1.7"/>
    <circle cx="23" cy="23" r="20" fill="url(#paper)" stroke="#614585" stroke-width="1.8"/>
    <circle cx="23" cy="23" r="15" fill="#ad80d9" stroke="#8055aa" stroke-width="1.3"/>
    <circle cx="23" cy="23" r="10" fill="url(#paper)" stroke="#8055aa" stroke-width="1.3"/>
    <circle cx="23" cy="23" r="4.5" fill="url(#gold)" stroke="#af7f2d" stroke-width="1.2"/>
    <path d="M9 14q4-8 13-8" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="m24 22 17-17" stroke="#796241" stroke-width="4" stroke-linecap="round"/>
    <path d="m24 21 17-17" stroke="#ffdb84" stroke-width="2.4" stroke-linecap="round"/>
    <path d="m34 4 10-2-2 10-5-1Z" fill="url(#ruby)" stroke="#97566a" stroke-width="1.3" stroke-linejoin="round"/>`,
  balao: `<rect x="12" y="8" width="31" height="32" rx="7" fill="#16759e" stroke="#17587e" stroke-width="1.6"/>
    <path d="M9 8h27q5 0 5 5v19q0 5-5 5H22l-9 8v-8H9q-5 0-5-5V13q0-5 5-5Z" fill="url(#blue)" stroke="#22658a" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M9 11h27q2 0 2 3v16q0 3-3 3H21l-5 5v-5H9q-2 0-2-3V14q0-3 2-3Z" fill="url(#paper)" stroke="#a2d1d9" stroke-width="1.1"/>
    <path d="M14 19h17m-17 6h12" stroke="#2e90b5" stroke-width="3" stroke-linecap="round"/>
    <path d="M10 13h24" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`,
};

export function temIlustracao(nome: string): nome is Ilustracao { return nome in desenhos; }

export function IlustracaoInterface(nome: Ilustracao, classe: string): string {
  const prefix = `nw-craft-${++sequencia}`;
  const defs = `<defs>
    <linearGradient id="gold" x1=".1" y1="0" x2=".8" y2="1"><stop stop-color="#fffbd1"/><stop offset=".42" stop-color="#ffdb66"/><stop offset="1" stop-color="#e59c27"/></linearGradient>
    <linearGradient id="blue" x1=".1" y1="0" x2=".8" y2="1"><stop stop-color="#c0f4ff"/><stop offset=".4" stop-color="#70c9ec"/><stop offset="1" stop-color="#2b90be"/></linearGradient>
    <linearGradient id="paper" x1=".2" y1="0" x2=".7" y2="1"><stop stop-color="#fffef3"/><stop offset="1" stop-color="#f6e3bb"/></linearGradient>
    <linearGradient id="ruby" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#ffd0d5"/><stop offset=".4" stop-color="#f887a1"/><stop offset="1" stop-color="#c8466c"/></linearGradient>
  </defs>`;
  const content = (defs+desenhos[nome]).replace(/id="(gold|blue|paper|ruby)"/g,(_,id)=>`id="${prefix}-${id}"`).replace(/url\(#(gold|blue|paper|ruby)\)/g,(_,id)=>`url(#${prefix}-${id})`);
  return `<svg class="nw-icon nw-illustrated-icon ${classe}" viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">${content}</svg>`;
}