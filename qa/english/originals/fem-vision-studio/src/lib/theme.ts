import { useSyncExternalStore } from 'react';

export type Theme = 'spanvision-mono' | 'light';
const STORAGE_KEY = 'fem2d-theme';
const CHANGE_EVENT = 'spanvision-theme-change';

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'spanvision-mono';
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* Session theme works without storage. */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function initializeTheme(): void {
  let stored: string | null = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch { /* Use the default. */ }
  setTheme(stored === 'light' ? 'light' : 'spanvision-mono');
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) initializeTheme();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => 'spanvision-mono');
}
