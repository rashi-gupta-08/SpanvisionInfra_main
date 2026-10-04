import { createSignal } from 'solid-js';

export const SPANVISION_MONO_THEME = 'spanvision-mono';
export const DEFAULT_CANVAS_COLOR = '#1B1B1B';
export const LIGHT_CANVAS_COLOR = '#EEF1F5';

export const CANVAS_OPTIONS = [
  { id: 'graphite', color: '#121212' },
  { id: 'workspace', color: '#1B1B1B' },
  { id: 'soft', color: '#202020' },
  { id: 'light', color: LIGHT_CANVAS_COLOR },
] as const;

const THEME_KEY = 'ifc-view.theme';
const CANVAS_KEY = 'ifc-view.canvas-color';
const supportedCanvasColors = new Set(CANVAS_OPTIONS.map((option) => option.color));

function getStoredCanvasColor(): string {
  try {
    const stored = localStorage.getItem(CANVAS_KEY)?.toUpperCase();
    if (stored === DEFAULT_CANVAS_COLOR || stored === LIGHT_CANVAS_COLOR) {
      return getStoredTheme() === 'light' ? LIGHT_CANVAS_COLOR : DEFAULT_CANVAS_COLOR;
    }
    if (stored && supportedCanvasColors.has(stored as (typeof CANVAS_OPTIONS)[number]['color'])) {
      return stored;
    }
  } catch {}
  return getStoredTheme() === 'light' ? LIGHT_CANVAS_COLOR : DEFAULT_CANVAS_COLOR;
}

function getStoredTheme(): 'light' | 'spanvision-mono' {
  try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'spanvision-mono'; } catch { return 'spanvision-mono'; }
}

export const [interfaceTheme, setInterfaceTheme] = createSignal(getStoredTheme());

export const [canvasColor, setCanvasColorSignal] = createSignal(getStoredCanvasColor());

function applyAppearance(color: string): void {
  document.documentElement.dataset.theme = interfaceTheme();
  document.documentElement.style.setProperty('--canvas-bg', color);
}

export function initializeAppearance(): void {
  const color = canvasColor();
  applyAppearance(color);
  try {
    localStorage.setItem(THEME_KEY, interfaceTheme());
    localStorage.setItem(CANVAS_KEY, color);
  } catch {}
}

export function setTheme(theme: string): void {
  const next = theme === 'light' ? 'light' : 'spanvision-mono';
  const followsTheme = canvasColor() === DEFAULT_CANVAS_COLOR || canvasColor() === LIGHT_CANVAS_COLOR;
  setInterfaceTheme(next);
  if (followsTheme) setCanvasColorSignal(next === 'light' ? LIGHT_CANVAS_COLOR : DEFAULT_CANVAS_COLOR);
  applyAppearance(canvasColor());
  try { localStorage.setItem(THEME_KEY, next);if(followsTheme)localStorage.setItem(CANVAS_KEY,canvasColor()); } catch {}
}

export function setCanvasColor(color: string): void {
  const normalized = color.toUpperCase();
  if (!supportedCanvasColors.has(normalized as (typeof CANVAS_OPTIONS)[number]['color'])) return;
  setCanvasColorSignal(normalized);
  applyAppearance(normalized);
  try {
    localStorage.setItem(CANVAS_KEY, normalized);
  } catch {}
}
