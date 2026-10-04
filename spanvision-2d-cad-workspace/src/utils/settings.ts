import { load } from '@tauri-apps/plugin-store';
import { isDesktopShell } from './platform';
import { notifyWeb } from '../services/web/dialogService';

let storePromise: ReturnType<typeof load> | null = null;

function getStore() {
  if (!storePromise) {
    storePromise = load('settings.json', { autoSave: true, defaults: {} });
  }
  return storePromise;
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    if (!isDesktopShell()) {
      const stored = localStorage.getItem(`spanvision.settings.${key}`);
      return stored === null ? defaultValue : JSON.parse(stored) as T;
    }
    const store = await getStore();
    const value = await store.get<T>(key);
    return value ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  try {
    if (!isDesktopShell()) {
      localStorage.setItem(`spanvision.settings.${key}`, JSON.stringify(value));
      return;
    }
    const store = await getStore();
    await store.set(key, value);
  } catch {
    if (!isDesktopShell()) notifyWeb('Your browser could not retain this preference.', true);
  }
}
