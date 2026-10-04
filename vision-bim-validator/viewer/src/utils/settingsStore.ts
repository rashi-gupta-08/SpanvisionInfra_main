const PREFIX = 'spanvision:vision-bim-validator:';
const LEGACY_PREFIX = 'openaec-bim-validator:';

export function getSetting(key: string, fallback: string): string {
  try {
    const current = localStorage.getItem(PREFIX + key);
    const legacy = localStorage.getItem(LEGACY_PREFIX + key);
    const value = current ?? legacy ?? fallback;
    const normalized = key === 'theme' ? (value === 'light' ? 'light' : 'spanvision-mono') : value;
    if (current !== normalized) localStorage.setItem(PREFIX + key, normalized);
    return normalized;
  } catch {
    return key === 'theme' ? 'spanvision-mono' : fallback;
  }
}

export function setSetting(key: string, value: string): void {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    // Private browsing or unavailable storage: session still works.
  }
}

export function applyTheme(theme?: string): void {
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'spanvision-mono');
}

export function getCanvasColor(): string {
  const fallback = getSetting('theme', 'spanvision-mono') === 'light' ? '#EEF1F5' : '#1B1B1B';
  const saved = getSetting('canvasColor', fallback);
  if (['#1B1B1B', '#EEF1F5'].includes(saved.toUpperCase())) return fallback;
  return /^#[0-9a-f]{6}$/i.test(saved) ? saved : fallback;
}
