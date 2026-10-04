import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
function edit(file,transform){const before=fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');const after=transform(before);fs.writeFileSync(file,after);}
function replace(source,before,after){if(!source.includes(before))throw new Error(`Missing replacement: ${before.slice(0,100)}`);return source.replace(before,after);}

if (!process.argv.includes('--cad-only')) {
// English resources only: old saved preferences cannot load a different interface.
for(const file of [
 'calc-workspace/src/i18n/config.ts',
 'spanvision-geptechniek-workspace/apps/desktop/src/i18n/config.ts',
 'spanvision-pile-plane-workspace/apps/pile-plan-studio/src/i18n/config.ts',
 'vision-calculation-studio/packages/desktop/src/i18n/config.ts',
 'spanvision-field-workspace/src/i18n.ts',
]) edit(file,source=>{
 const namespaces=[...source.matchAll(/import (en\w+) from ["']([^"']+)["'];/g)];
 if(!namespaces.length)throw new Error(`No English resources in ${file}`);
 const react=source.includes('initReactI18next');
 const typed=file.endsWith('.ts');
 const host=file.includes('calc-workspace');
 const brand=host?`import { BRAND } from '../config/brand';\nimport { setHostAttribute } from '@/lib/hostRoot';\n`:'';
 return `import i18next from 'i18next';\n${react?"import { initReactI18next } from 'react-i18next';\n":''}${brand}${namespaces.map(m=>`import ${m[1]} from '${m[2]}';`).join('\n')}\n\nexport const LANGUAGES = [{ code: 'en', name: 'English', englishName: 'English' }];\nexport const RTL_LANGUAGES${typed?': string[]':''} = [];\nexport function isRTL(_language${typed?': string':''}) { return false; }\nexport async function loadLocale(_language${typed?': string':''}) { /* English is bundled. */ }\n\ni18next${react?'.use(initReactI18next)':''}.init({\n resources: { en: { ${namespaces.map(m=>`${m[1].slice(2,3).toLowerCase()+m[1].slice(3)}: ${m[1]}`).join(', ')} } },\n lng: 'en', fallbackLng: 'en', supportedLngs: ['en'], load: 'languageOnly',\n ns: ${JSON.stringify(namespaces.map(m=>m[1].slice(2,3).toLowerCase()+m[1].slice(3)))}, defaultNS: 'common',\n interpolation: { escapeValue: false${host?', defaultVariables: { brandProduct: BRAND.product, brandOrganization: BRAND.organization }':''} },\n showSupportNotice: false,\n});\n\nfunction updateLanguage() {\n ${host?"setHostAttribute('lang', 'en'); setHostAttribute('dir', 'ltr');":"document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr';"}\n}\nupdateLanguage();\ni18next.on('languageChanged', updateLanguage);\nexport function changeLanguage(_language${typed?': string':''}) { return i18next.changeLanguage('en'); }\nexport default i18next;\n`;
});

edit('spanvision-pdf-workspace/open-pdf-studio/js/i18n/config.js',source=>{
 source=source.replace("import LanguageDetector from 'i18next-browser-languagedetector';\n",'');
 source=source.replace("import.meta.glob('./locales/*/*.json')","import.meta.glob('./locales/en/*.json')");
 source=source.replace(/export const LANGUAGES = \[[\s\S]*?\n\];/,"export const LANGUAGES = [{ code: 'en', name: 'English', englishName: 'English' }];");
 source=source.replace(/export const RTL_LANGUAGES = \[[^\]]*\];/,"export const RTL_LANGUAGES = [];");
 source=source.replace(/function detectInitialLanguage\(\) \{[\s\S]*?\n\}/,"function detectInitialLanguage() { return 'en'; }");
 source=source.replace('  .use(LanguageDetector)\n','');
 source=replace(source,"    fallbackLng: 'en',","    lng: 'en', supportedLngs: ['en'], load: 'languageOnly',\n    fallbackLng: 'en',");
 source=source.replace('export default i18next;',"document.documentElement.lang = 'en';\ndocument.documentElement.dir = 'ltr';\nexport default i18next;");
 return source;
});

edit('open-vision-studio/src/i18n/config.ts',source=>{
 source=source.replace("import { readLocal, syncSettingToLocalStorage } from '@/utils/settingsStore';\n",'');
 source=source.replace(/export const RTL_LOCALES: Locale\[\] = \[[^\]]*\];/,'export const RTL_LOCALES: Locale[] = [];');
 // Preserve legacy locale types for imported settings; expose only English.
 source=source.replace(/export const LANGUAGE_LABELS: Record<Locale, \[string, string\]> = \{[\s\S]*?\n\};/,"export const LANGUAGE_LABELS: Partial<Record<Locale, [string, string]>> = { en: ['EN', 'English'] };");
 source=source.replace(/const loadedLocales = new Set<Locale>\(\['en'\]\);[\s\S]*?export default i18n;/,"export async function loadLocale(_lng: Locale): Promise<void> { /* English is bundled. */ }\n\nexport async function setLocale(_lng: Locale): Promise<void> {\n  await i18n.changeLanguage('en');\n}\n\nexport async function initLocale(): Promise<void> {\n  await i18n.changeLanguage('en');\n}\n\nexport default i18n;");
 return source;
});

edit('frame-vision-studio/ui/src/lib/i18n.js',()=>`import { register, init, locale } from 'svelte-i18n';\nimport { saveSetting } from './settings.js';\nimport en from '../locales/en.json';\n\nregister('en', () => Promise.resolve(en));\ninit({ fallbackLocale: 'en', initialLocale: 'en' });\nlocale.subscribe(value => {\n if (value && value !== 'en') { locale.set('en'); return; }\n document.documentElement.lang = 'en';\n document.documentElement.dir = 'ltr';\n saveSetting('locale', 'en');\n});\n`);
edit('frame-vision-studio/ui/src/components/shell/Settings.svelte',source=>source.replace(/\s*<option value="(?:nl|de)">[^\n]*<\/option>/g,''));

edit('fem-vision-studio/src/i18n/i18n.ts',source=>{
 source=source.replace(/^import \{ (?:nl|fr|es|zh|it) \} from .*\n/gm,'');
 source=source.replace('const translations: Record<Locale, TranslationKeys> = { en, nl, fr, es, zh, it };','const translations = { en };');
 source=source.replace('const dict = translations[locale] as Record<string, string>;','void locale;\n  const dict = translations.en as Record<string, string>;');
 source=source.replace(/export function getStoredLocale\(\): Locale \{[\s\S]*?\n\}/,"export function getStoredLocale(): Locale { return 'en'; }");
 return source;
});
edit('fem-vision-studio/src/i18n/I18nProvider.tsx',source=>source.replace('(newLocale: Locale) => {', '(_newLocale: Locale) => {').replace('setLocaleState(newLocale)',"setLocaleState('en')").replace("localStorage.setItem('fem2d-locale', newLocale)","localStorage.setItem('fem2d-locale', 'en')"));
edit('fem-vision-studio/src/components/Ribbon/Ribbon.tsx',source=>replace(source,"['en', 'EN'], ['nl', 'NL'], ['fr', 'FR'],\n            ['es', 'ES'], ['zh', 'ZH'], ['it', 'IT'],","['en', 'EN'],"));
edit('fem-vision-studio/src/components/CommandPalette/CommandPalette.tsx',source=>source.replace(/^.*id: 'lang(?:NL|FR|ES|ZH|IT)'.*\n/gm,''));
edit('fem-vision-studio/src/components/openaec/SettingsDialog/SettingsDialog.tsx',source=>source.replace(/const LOCALE_LABELS: Record<Locale, string> = \{[\s\S]*?\n\};/,"const LOCALE_LABELS: Partial<Record<Locale, string>> = { en: 'English' };").replace("Object.keys(LOCALE_LABELS)","Object.keys(LOCALE_LABELS)"));

edit('spanvision-speech-workspace/src/lib/i18n.tsx',source=>{
 source=source.replace(/^import (?!en )[a-z]+ from "\.\.\/locales\/.*\n/gm,'');
 source=source.replace(/const locales: Record<Locale, Translations> = \{[^\n]*\};/,'const locales: Partial<Record<Locale, Translations>> = { en };');
 source=source.replace('createSignal<Locale>(initialLocale)', 'createSignal<Locale>("en")');
 source=source.replace('initialLocale: Locale = "en"','_initialLocale: Locale = "en"');
 source=source.replace('const [locale, setLocale] =', 'const [locale, setLocaleState] =');
 source=source.replace(/const availableLocales: Locale\[\] = \[[^\n]*\];/,'const availableLocales: Locale[] = ["en"];\n  const setLocale = (_value: unknown) => setLocaleState("en");');
 source=source.replace(/const nativeNames: Record<string, string> = \{[\s\S]*?\n\};/,'const nativeNames: Record<string, string> = { en: "English" };');
 source=source.replace('return [{ value: "auto", label: t("languages.auto") }, ...langs];','return langs;');
 return source;
});

edit('ifc-view/apps/desktop/src/state/locale-store.ts',()=>`import { createSignal } from 'solid-js';\nimport { translations, type Locale, type TranslationKey } from '@/i18n/translations';\nexport type { Locale, TranslationKey };\nexport const LOCALE_OPTIONS: { id: Locale; label: string; flag: string }[] = [{ id: 'en', label: 'English', flag: 'EN' }];\nconst [locale, setLocaleState] = createSignal<Locale>('en');\nexport { locale };\nexport const setLocale = (_value: unknown) => setLocaleState('en');\nexport { setLocale as setLocaleRaw };\nexport function changeLocale(_value: Locale): void {\n setLocaleState('en');\n try { localStorage.setItem('locale', 'en'); } catch {}\n}\nexport function t(key: TranslationKey): string { return translations.en[key] ?? key; }\ndocument.documentElement.lang = 'en';\n`);

}
if (!process.argv.includes('--without-cad')) {
edit('SpanvisionCAD/src/i18n.rs',source=>{
 source=source.replace(/#\[cfg\(all\(not\(target_arch = "wasm32"\), not\(test\)\)\)\]\nuse i18n_embed::DesktopLanguageRequester;\n/,'');
 source=source.replace(/#\[cfg\(target_arch = "wasm32"\)\]\nuse i18n_embed::WebLanguageRequester;\n/,'');
 source=replace(source,'    #[default]\n    #[serde(rename = "system")]','    #[serde(rename = "system")]');
 source=replace(source,'    #[serde(rename = "en-US")]','    #[default]\n    #[serde(rename = "en-US")]');
 source=source.replace(/pub const ALL: \[Language; 22\] = \[[\s\S]*?\n    \];/,'pub const ALL: [Language; 1] = [Language::EnUs];');
 source=source.replace(/fn requested\(self\) -> Vec<i18n_embed::unic_langid::LanguageIdentifier> \{[\s\S]*?\n    \}/,'fn requested(self) -> Vec<i18n_embed::unic_langid::LanguageIdentifier> {\n        vec!["en-US".parse().expect("valid locale")]\n    }');
 source=source.replace(/pub fn label\(self\) -> String \{[\s\S]*?\n    \}/,'pub fn label(self) -> String { crate::tr!("language", "english") }');
 source=source.replace(/fn system_languages\(\) -> Vec<i18n_embed::unic_langid::LanguageIdentifier> \{[\s\S]*?\n\}\n\n/,'');
 return source;
});
edit('SpanvisionCAD/web-app.html',source=>source.replace(/          let saved;[\s\S]*?          document.title =/, '          const locale = "en-US";\n          document.title ='));
edit('SpanvisionCAD/scripts/build-site.py',source=>replace(source,'    return catalogs','    return {"en-US": catalogs["en-US"]}'));
edit('SpanvisionCAD/site/site.js',()=>`document.documentElement.lang = 'en-US';\ndocument.documentElement.dir = 'ltr';\n`);
}
console.log('English-only language policy applied to the tools.');
