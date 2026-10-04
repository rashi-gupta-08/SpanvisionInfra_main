import i18next from 'i18next';

// Locale bundles are loaded on demand, one language at a time, instead of
// statically importing all 37 languages (296 JSON files) into the entry
// chunk. Only English (the fallback) and the active language are fetched at
// startup; switching language fetches that language's 8 namespace files on
// first use. This keeps the main bundle small and startup parse/init fast.
const localeModules = import.meta.glob('./locales/en/*.json', { eager: true, import: 'default' });
const initialResources = { en: Object.fromEntries(Object.entries(localeModules).map(([file, data]) => [file.split('/').pop().replace('.json', ''), data])) };

const ns = ['common', 'ribbon', 'preferences', 'dialogs', 'appMenu', 'properties', 'context', 'statusbar'];

export const LANGUAGES = [{ code: 'en', name: 'English', englishName: 'English' }];

export const RTL_LANGUAGES = [];

export function isRTL(lang) {
  return RTL_LANGUAGES.includes(lang);
}

function isKnownLanguage(lng) {
  return LANGUAGES.some((l) => l.code === lng);
}

// Fetch all 8 namespace bundles for one language. Missing files are skipped
// (same effect as the language simply not providing that namespace).
async function fetchLocale(lng) {
  const bundles = {};
  await Promise.all(ns.map(async (n) => {
    const importer = localeModules[`./locales/${lng}/${n}.json`];
    if (!importer) return;
    bundles[n] = importer;
  }));
  return bundles;
}

const loadedLanguages = new Set();

// Load a language into i18next on demand. Idempotent; unknown codes no-op.
export async function loadLocale(lng) {
  const base = (lng || '').split('-')[0];
  if (!base || loadedLanguages.has(base) || !isKnownLanguage(base)) return;
  const bundles = await fetchLocale(base);
  Object.entries(bundles).forEach(([n, data]) => {
    i18next.addResourceBundle(base, n, data, true, true);
  });
  loadedLanguages.add(base);
}

// Mirror the LanguageDetector order (localStorage, then navigator) so the
// language it will pick is already loaded before init.
function detectInitialLanguage() { return 'en'; }

i18next
  .init({
    resources: initialResources,
    ns,
    defaultNS: 'common',
    lng: 'en', supportedLngs: ['en'], load: 'languageOnly',
    fallbackLng: 'en',
    showSupportNotice: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: []
    }
  });

document.documentElement.lang = 'en';
document.documentElement.dir = 'ltr';
i18next.on('languageChanged', language => { if (language !== 'en') void i18next.changeLanguage('en'); });
export default i18next;
