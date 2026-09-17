/** Gravação do jogo em localStorage (com degradação silenciosa se não houver acesso). */

const KEY = 'nucleo-perdido:save:v1';
const SETTINGS_KEY = 'nucleo-perdido:settings:v1';

export function saveRaw(data: unknown): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadRaw<T>(): T | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignorado */
  }
}

export function saveSettings(data: unknown): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  } catch {
    /* ignorado */
  }
}

export function loadSettings<T>(): T | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
