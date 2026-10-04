import { createContext, useContext } from 'react';
import { en } from './en';

export type Locale = 'en' | 'nl' | 'fr' | 'es' | 'zh' | 'it';

export type TranslationKeys = typeof en;

const translations = { en };

export interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

export const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key: string) => key,
});

export function useI18n(): I18nContextType {
  return useContext(I18nContext);
}

export function getTranslation(locale: Locale, key: string): string {
  void locale;
  const dict = translations.en as Record<string, string>;
  return dict[key] ?? key;
}

export function getStoredLocale(): Locale { return 'en'; }
