import i18next from 'i18next';
import enCommon from './locales/en.json';

export const LANGUAGES = [{ code: 'en', name: 'English', englishName: 'English' }];
export const RTL_LANGUAGES: string[] = [];
export function isRTL(_language: string) { return false; }
export async function loadLocale(_language: string) { /* English is bundled. */ }

i18next.init({
 resources: { en: { common: enCommon } },
 lng: 'en', fallbackLng: 'en', supportedLngs: ['en'], load: 'languageOnly',
 ns: ["common"], defaultNS: 'common',
 interpolation: { escapeValue: false },
 showSupportNotice: false,
});

function updateLanguage() {
 document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr';
}
updateLanguage();
i18next.on('languageChanged', updateLanguage);
export function changeLanguage(_language: string) { return i18next.changeLanguage('en'); }
export default i18next;
