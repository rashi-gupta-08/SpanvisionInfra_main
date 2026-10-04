const PREFIX = 'spanvision:vision-bim-validator:';
const LEGACY_PREFIX = 'openaec-bim-validator:';

export function getSetting(key: string, fallback: string): string {
  try {
    const current = localStorage.getItem(PREFIX + key);
    const legacy = localStorage.getItem(LEGACY_PREFIX + key);
    const value = current ?? legacy ?? fallback;
    const normalized = key === 'theme' ? 'spanvision-mono' : value;
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

export function applyTheme(_theme?: string): void {
  document.documentElement.setAttribute('data-theme', 'spanvision-mono');
}

export function getCanvasColor(): string {
  const saved = getSetting('canvasColor', '#1B1B1B');
  return /^#[0-9a-f]{6}$/i.test(saved) ? saved : '#1B1B1B';
}
