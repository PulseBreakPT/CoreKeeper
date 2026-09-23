/** Cenário original em SVG: céu, colinas, folhas e flores atrás dos controlos. */
let serial = 0;

export function Cenario(): string {
  const id = `paisagem-${++serial}`;
  const grad = (name: string) => `url(#${id}-${name})`;
  const shrub = (x: number, y: number, s: number, color: string, rotation = 0) => `<g transform="translate(${x} ${y}) rotate(${rotation}) scale(${s})" fill="${color}"><ellipse cx="0" cy="20" rx="69" ry="37"/><ellipse cx="-45" cy="-3" rx="28" ry="47" transform="rotate(-29 -45 -3)"/><ellipse cx="-12" cy="-27" rx="32" ry="51" transform="rotate(-12 -12 -27)"/><ellipse cx="29" cy="-10" rx="29" ry="45" transform="rotate(28 29 -10)"/><ellipse cx="58" cy="18" rx="30" ry="28"/></g>`;
  const cloud = (x: number, y: number, s: number) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#f4ffff" opacity=".84"><ellipse rx="100" ry="33"/><circle cx="-44" cy="-16" r="42"/><circle cx="16" cy="-40" r="59"/><circle cx="63" cy="-7" r="35"/></g>`;
  const flower = (x: number, y: number, scale: number, color: string) => `<g transform="translate(${x} ${y}) scale(${scale})" fill="${color}"><ellipse cy="-12" rx="9" ry="13"/><ellipse cy="-12" rx="9" ry="13" transform="rotate(72)"/><ellipse cy="-12" rx="9" ry="13" transform="rotate(144)"/><ellipse cy="-12" rx="9" ry="13" transform="rotate(216)"/><ellipse cy="-12" rx="9" ry="13" transform="rotate(288)"/><circle r="7" fill="#ffcc24"/></g>`;
  return `<svg class="nw-cenario" viewBox="0 0 941 1672" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs>
    <linearGradient id="${id}-sky" x2="0" y2="1"><stop stop-color="#72dcf5"/><stop offset=".75" stop-color="#9deff5"/><stop offset="1" stop-color="#c2f3e9"/></linearGradient>
    <linearGradient id="${id}-sand" x2="0" y2="1"><stop stop-color="#fce5b5"/><stop offset=".24" stop-color="#fff5d1"/><stop offset=".8" stop-color="#fff0c4"/><stop offset="1" stop-color="#ffdc96"/></linearGradient>
    <linearGradient id="${id}-near" x2=".7" y2="1"><stop stop-color="#78dc65"/><stop offset=".45" stop-color="#37bd68"/><stop offset="1" stop-color="#168b64"/></linearGradient>
    <linearGradient id="${id}-lime" x2=".7" y2="1"><stop stop-color="#c3ed64"/><stop offset="1" stop-color="#73cf55"/></linearGradient>
    <radialGradient id="${id}-sun"><stop stop-color="#efffff" stop-opacity=".8"/><stop offset="1" stop-color="#efffff" stop-opacity="0"/></radialGradient>
  </defs><rect width="941" height="660" fill="${grad('sky')}"/><circle cx="836" cy="70" r="240" fill="${grad('sun')}"/><g class="nw-nuvens">${cloud(49,75,1.45)}${cloud(862,82,1.7)}${cloud(350,20,.6)}${cloud(477,254,.52)}</g>
  <path d="M0 336Q38 260 75 397Q157 341 239 467Q312 429 395 479Q559 417 636 464Q726 331 805 398Q892 255 941 307V711H0Z" fill="#6ed68b"/><path d="M0 451Q91 371 188 482T429 469Q554 419 695 505Q802 391 941 380V716H0Z" fill="#59c887"/>
  ${shrub(-17,541,2.3,grad('lime'))}${shrub(143,577,1.4,grad('near'),17)}${shrub(845,556,1.7,grad('lime'),-12)}${shrub(982,501,2.2,grad('near'))}
  <path d="M0 601Q92 568 188 610Q373 573 534 607Q752 568 941 605V1672H0Z" fill="${grad('sand')}"/>
  ${shrub(-59,783,1.2,grad('near'))}${shrub(982,985,1.1,grad('lime'))}${shrub(-65,1369,1.3,grad('near'))}${shrub(988,1307,1.3,grad('near'))}
  ${shrub(-19,1483,1.7,grad('lime'))}${shrub(997,1508,1.8,grad('lime'))}${shrub(53,1635,1.7,grad('near'))}${shrub(-36,1579,1.2,grad('near'))}${shrub(907,1637,2.0,grad('near'),-12)}${shrub(975,1521,1.3,grad('near'))}
  <path d="M138 1672 148 1626 180 1600 222 1595 266 1625 282 1672Z" fill="#9c97aa"/><path d="m180 1600 39 39-3 33h-78l10-46Z" fill="#b7aec1"/><path d="m219 1639 47-14 16 47h-66Z" fill="#7b8197"/>
  ${shrub(139,1706,.72,grad('lime'))}${shrub(286,1717,1,grad('lime'))}${shrub(737,1716,.8,grad('near'))}${flower(44,1609,1.05,'#ffffee')}${flower(856,1600,1.12,'#ffe251')}${flower(900,1674,.8,'#ffffed')}</svg>`;
}