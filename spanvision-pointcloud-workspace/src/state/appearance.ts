export type UITheme = 'spanvision-mono' | 'dark' | 'light' | 'blue' | 'highContrast';
export const UI_THEMES: { id: UITheme; label: string }[] = [
  { id: 'spanvision-mono', label: 'Spanvision Mono' },
  { id: 'dark', label: 'Dark' }, { id: 'light', label: 'Light' },
  { id: 'blue', label: 'Blue' }, { id: 'highContrast', label: 'High Contrast' },
];
export const APPEARANCE_KEY = 'spanvision.pointcloud.appearance.v1';
export interface Appearance { uiTheme: UITheme; canvasBackground: string | null }
export function loadAppearance(): Appearance {
  const defaults: Appearance = { uiTheme: 'spanvision-mono', canvasBackground: null };
  try {
    const value = JSON.parse(localStorage.getItem(APPEARANCE_KEY) || 'null');
    if (!value || value.version !== 1) return defaults;
    return {
      uiTheme: UI_THEMES.some(theme => theme.id === value.uiTheme) ? value.uiTheme : defaults.uiTheme,
      canvasBackground: typeof value.canvasBackground === 'string' && /^#[0-9a-f]{6}$/i.test(value.canvasBackground) ? value.canvasBackground : null,
    };
  } catch { return defaults; }
}
export function saveAppearance(value: Appearance): void {
  try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ version: 1, uiTheme: value.uiTheme, canvasBackground: value.canvasBackground })); }
  catch { /* Appearance continues to work when storage is unavailable. */ }
}
export function canvasColor(value: Appearance): string {
  return value.canvasBackground || (value.uiTheme === 'light' ? '#EEF1F5' : value.uiTheme === 'spanvision-mono' ? '#1B1B1B' : '#1a1a2e');
}
