/** Os dois cartões diários partilham materiais, não os ícones planos da navegação. */
function CalendarArt(): string {
  return `<svg class="daily-illustration calendar-art" viewBox="0 0 72 78" aria-hidden="true"><defs><linearGradient id="daily-paper" x2=".3" y2="1"><stop stop-color="#fffff2"/><stop offset="1" stop-color="#ffeab7"/></linearGradient><linearGradient id="daily-purple" x2=".7" y2="1"><stop stop-color="#be8dfb"/><stop offset=".48" stop-color="#9152db"/><stop offset="1" stop-color="#5d299c"/></linearGradient><linearGradient id="daily-ring" x2=".8" y2="1"><stop stop-color="#fff7a0"/><stop offset=".5" stop-color="#ffdc4d"/><stop offset="1" stop-color="#dc8c1a"/></linearGradient></defs>
    <ellipse cx="37" cy="71" rx="26" ry="4" fill="#532280" opacity=".2"/><g transform="rotate(-8 36 37)"><rect x="10" y="15" width="51" height="52" rx="11" fill="#562286" stroke="#3e195e" stroke-width="2"/><rect x="10" y="11" width="51" height="52" rx="11" fill="url(#daily-purple)" stroke="#49216e" stroke-width="2"/><path d="M15 34h41v23q0 4-5 4H20q-5 0-5-5Z" fill="#c6a8e6"/><path d="M15 29h41v24q0 5-5 5H20q-5 0-5-5Z" fill="url(#daily-paper)" stroke="#613888" stroke-width="1.3"/><path d="M15 28v-7q0-5 5-5h30q6 0 6 5v7Z" fill="#c693fa"/><path d="M17 20q0-4 5-4h29" fill="none" stroke="#f5d8ff" stroke-width="2.5" stroke-linecap="round"/><rect x="20" y="6" width="7" height="18" rx="3.5" fill="url(#daily-ring)" stroke="#98600f" stroke-width="1.4"/><rect x="43" y="6" width="7" height="18" rx="3.5" fill="url(#daily-ring)" stroke="#98600f" stroke-width="1.4"/><path d="M22 9v10m23-10v10" stroke="#fffbd0" stroke-width="1.5" stroke-linecap="round"/><path d="m27 50 6-17h6l6 17h-6l-1-4h-5l-1 4Zm7-8h3l-1.5-5Z" fill="#562a82"/><path d="M18 52v2q0 2 3 2h27" fill="none" stroke="#fffef8" stroke-width="1.5" stroke-linecap="round"/></g><path d="m63 13 1.5 4.5L69 19l-4.5 1.5L63 25l-1.5-4.5L57 19l4.5-1.5Z" fill="#fff1a2" stroke="#b47edb" stroke-width=".7"/></svg>`;
}

function TrophyArt(): string {
  return `<svg class="daily-illustration trophy-art" viewBox="0 0 72 78" aria-hidden="true"><defs><linearGradient id="daily-gold" x2=".7" y2="1"><stop stop-color="#fff494"/><stop offset=".36" stop-color="#ffe13f"/><stop offset=".72" stop-color="#ffb81e"/><stop offset="1" stop-color="#e7830b"/></linearGradient><linearGradient id="daily-gold-base" x2="0" y2="1"><stop stop-color="#ffed75"/><stop offset="1" stop-color="#eaa121"/></linearGradient><linearGradient id="daily-cup-base" x2=".5" y2="1"><stop stop-color="#6ccffa"/><stop offset="1" stop-color="#13669e"/></linearGradient></defs>
    <ellipse cx="36" cy="71" rx="25" ry="4" fill="#155b92" opacity=".22"/><g transform="rotate(7 36 37)"><path d="M19 19H9v8q0 13 15 15m29-23h10v8q0 13-15 15" fill="none" stroke="#a96008" stroke-width="8" stroke-linecap="round"/><path d="M19 19H9v8q0 13 15 15m29-23h10v8q0 13-15 15" fill="none" stroke="#ffd847" stroke-width="4.5" stroke-linecap="round"/><path d="M32 42h8v13l8 4H24l8-4Z" fill="url(#daily-gold-base)" stroke="#a86815" stroke-width="1.7"/><rect x="22" y="58" width="29" height="10" rx="4" fill="#0b598c" stroke="#12456a" stroke-width="1.4"/><rect x="22" y="54" width="29" height="10" rx="4" fill="url(#daily-cup-base)" stroke="#12456a" stroke-width="1.4"/><rect x="29" y="58" width="14" height="4" rx="1" fill="#ffe785"/><path d="M18 16h36l-4 20q-2 10-14 12-12-2-14-12Z" fill="url(#daily-gold)" stroke="#a5600d" stroke-width="2"/><ellipse cx="36" cy="16" rx="18" ry="4" fill="#ffe987" stroke="#ac680d" stroke-width="1.5"/><path d="M22 17q14 4 27 0" fill="none" stroke="#fffaca" stroke-width="2" stroke-linecap="round"/><path d="M25 24q0 10 6 15" fill="none" stroke="#fff8a4" stroke-width="3" stroke-linecap="round"/><path d="m36 25 2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.6-.8Z" fill="#fff6b0" stroke="#cf8512" stroke-width="1"/></g><path d="m13 7 1.5 4.5L19 13l-4.5 1.5L13 19l-1.5-4.5L7 13l4.5-1.5Z" fill="#fffbd0" stroke="#ffcb3f" stroke-width=".8"/><g class="daily-complete-mark"><circle cx="59" cy="60" r="10" fill="#36c865" stroke="#137942" stroke-width="2"/><path d="m54 60 3 3 6-7" fill="none" stroke="#fffbe9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
}

function Arrow(): string {
  return `<span class="daily-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 10h9l-3-3a1.5 1.5 0 0 1 2-2l6 6a1.5 1.5 0 0 1 0 2l-6 6a1.5 1.5 0 0 1-2-2l3-3H5a2 2 0 0 1 0-4Z"/></svg></span>`;
}

export function DailyWordCard(): string {
  return `<button class="nw-daily word daily-crafted" id="ver-palavra-dia" data-testid="daily-word-button" type="button" aria-label="Descobrir a palavra do dia" aria-describedby="palavra-dia significado-dia"><span class="daily-art" aria-hidden="true">${CalendarArt()}</span><span class="daily-tag" data-testid="daily-word-label">PALAVRA DO DIA</span><span class="daily-word-content"><b class="daily-word-title" id="palavra-dia" data-testid="daily-word-value">LACÓNICO</b><span class="daily-meaning" id="significado-dia" data-testid="daily-word-meaning">expressão em poucas palavras</span></span>${Arrow()}</button>`;
}

export function DailyChallengeCard(): string {
  return `<button class="nw-daily challenge daily-crafted" id="abrir-desafio-dia" data-testid="daily-challenge-button" type="button" aria-label="Jogar o desafio do dia: 15 respostas seguidas" aria-describedby="desafio-valor"><span class="daily-art" aria-hidden="true">${TrophyArt()}</span><span class="daily-tag" data-testid="daily-challenge-label">DESAFIO DO DIA</span><span class="daily-goal" data-testid="daily-challenge-goal"><b>15</b><span>respostas<br>seguidas</span></span><span class="daily-progress"><span class="daily-progress-track" id="desafio-progresso" data-testid="daily-challenge-progress" role="progressbar" aria-label="Respostas seguidas no desafio diário" aria-valuemin="0" aria-valuemax="15" aria-valuenow="0"><i id="desafio-barra" data-testid="daily-challenge-fill"></i></span><strong id="desafio-valor" data-testid="daily-challenge-count">0 / 15</strong></span>${Arrow()}</button>`;
}

/** Presentation only: the daily streak and reset rules remain in main.ts. */
export function atualizarDesafioDiario(value: number): void {
  const count = Math.max(0, Math.min(15, value));
  document.getElementById('desafio-valor')!.textContent = `${count} / 15`;
  document.getElementById('desafio-barra')!.style.width = `${count / 15 * 100}%`;
  document.getElementById('desafio-progresso')!.setAttribute('aria-valuenow', String(count));
  document.getElementById('abrir-desafio-dia')!.classList.toggle('daily-complete', count === 15);
}

export function adaptarPalavraDiaria(): void {
  const word = document.getElementById('palavra-dia')!;
  word.classList.toggle('daily-long-word', (word.textContent?.length || 0) > 10);
}

/** Reuse the same artwork without duplicate gradient IDs between panels. */
export function DailyIllustration(kind: 'calendar' | 'trophy', namespace: string): string {
  return (kind === 'calendar' ? CalendarArt() : TrophyArt())
    .replaceAll('id="daily-', `id="${namespace}-`)
    .replaceAll('url(#daily-', `url(#${namespace}-`);
}