import { BRAND } from '../config/brand';
import { getHostRoot, isEmbedded, setHostAttribute } from '../lib/hostRoot';

export const THEME_NAMES = ['spanvision-mono', 'default', 'light', 'dark', 'blue', 'amber-navy', 'warm-ember', 'highContrast', 'system'] as const;
export type ThemeName = typeof THEME_NAMES[number];

export function normalizeTheme(value: unknown): ThemeName {
  return THEME_NAMES.includes(value as ThemeName) ? value as ThemeName : BRAND.theme as ThemeName;
}

/** Synchronous mirror avoids a light flash; the native store wins once loaded. */
export function getInitialTheme(): ThemeName {
  try {
    const saved = JSON.parse(localStorage.getItem('ocs:settings') || 'null') as { theme?: string } | null;
    return normalizeTheme(saved?.theme ?? localStorage.getItem('ocs-theme') ?? BRAND.theme);
  } catch {
    try { return normalizeTheme(localStorage.getItem('ocs-theme')); } catch { return normalizeTheme(BRAND.theme); }
  }
}

export function resolveTheme(value: string): string {
  const theme = normalizeTheme(value);
  return theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
}

export function applyTheme(value: string): void {
  const selected = normalizeTheme(value);
  setHostAttribute('data-theme', resolveTheme(selected));
  if (!isEmbedded()) {
    try { localStorage.setItem('ocs-theme', selected); } catch { /* storage may be unavailable */ }
  }
}

export function workspaceBackground(): string {
  return getComputedStyle(getHostRoot()).getPropertyValue('--theme-canvas').trim()
    || getComputedStyle(getHostRoot()).getPropertyValue('--theme-content-bg').trim() || '#1B1B1B';
}
