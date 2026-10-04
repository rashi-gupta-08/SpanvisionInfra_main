import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// --- Alleen de fallback-taal (en) wordt eager geïmporteerd. De overige 13 talen
// laden lazy via loadLocale() (Vite splitst per taal een eigen async chunk). ---
import enCommon from './locales/en/common.json';
import enTask from './locales/en/task.json';
import enReport from './locales/en/report.json';
import enMenu from './locales/en/menu.json';

export type Locale =
  | 'nl' | 'en' | 'fr' | 'de' | 'es' | 'zh'
  | 'it' | 'pt' | 'pl' | 'tr' | 'ar' | 'ja' | 'ko' | 'fa';

export const RTL_LOCALES: Locale[] = [];

export const LANGUAGE_LABELS: Partial<Record<Locale, [string, string]>> = { en: ['EN', 'English'] };

export const supportedLanguages = Object.keys(LANGUAGE_LABELS) as Locale[];

const resources = {
  en: { common: enCommon, task: enTask, report: enReport, menu: enMenu },
};

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default, overridden by initLocale()
    fallbackLng: 'en',
    supportedLngs: supportedLanguages,
    load: 'languageOnly',
    ns: ['common', 'task', 'report', 'menu'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

/** Schrijfrichting van de shell in taal `lng`: `rtl` voor ar/fa. Zet `<html dir>` hieronder, en is
 *  de bron voor wie tijdens het renderen al moet weten dat de shell gespiegeld is (bv. aan welke kant
 *  de takenlijst en dus de histogramkiezer staat) — een component die `useTranslation` gebruikt,
 *  rendert bij een taalwissel opnieuw. */
export function localeDirection(lng: string): 'ltr' | 'rtl' {
  return RTL_LOCALES.includes(lng as Locale) ? 'rtl' : 'ltr';
}

// Set document direction + lang on language change (RTL support; <html lang> volgt de
// taalkeuze i.p.v. de hardcoded "nl" uit index.html — TODO-quick-win)
function updateDirection(lng: string) {
  document.documentElement.dir = localeDirection(lng);
  document.documentElement.lang = lng;
}
updateDirection(i18n.language);
i18n.on('languageChanged', updateDirection);

export async function loadLocale(_lng: Locale): Promise<void> { /* English is bundled. */ }

export async function setLocale(_lng: Locale): Promise<void> {
  await i18n.changeLanguage('en');
}

export async function initLocale(): Promise<void> {
  await i18n.changeLanguage('en');
}

export default i18n;
