import { createSignal } from 'solid-js';
import { translations, type Locale, type TranslationKey } from '@/i18n/translations';
export type { Locale, TranslationKey };
export const LOCALE_OPTIONS: { id: Locale; label: string; flag: string }[] = [{ id: 'en', label: 'English', flag: 'EN' }];
const [locale, setLocaleState] = createSignal<Locale>('en');
export { locale };
export const setLocale = (_value: unknown) => setLocaleState('en');
export { setLocale as setLocaleRaw };
export function changeLocale(_value: Locale): void {
 setLocaleState('en');
 try { localStorage.setItem('locale', 'en'); } catch {}
}
export function t(key: TranslationKey): string { return translations.en[key] ?? key; }
document.documentElement.lang = 'en';
