import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './locales/en/common.json';
import enRibbon from './locales/en/ribbon.json';
import enBackstage from './locales/en/backstage.json';
import enSettings from './locales/en/settings.json';
import enFeedback from './locales/en/feedback.json';

export const LANGUAGES = [{ code: 'en', name: 'English', englishName: 'English' }];
export const RTL_LANGUAGES: string[] = [];
export function isRTL(_language: string) { return false; }
export async function loadLocale(_language: string) { /* English is bundled. */ }

i18next.use(initReactI18next).init({
 resources: { en: { common: enCommon, ribbon: enRibbon, backstage: enBackstage, settings: enSettings, feedback: enFeedback } },
 lng: 'en', fallbackLng: 'en', supportedLngs: ['en'], load: 'languageOnly',
 ns: ["common","ribbon","backstage","settings","feedback"], defaultNS: 'common',
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
