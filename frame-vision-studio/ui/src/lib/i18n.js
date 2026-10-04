import { register, init, locale } from 'svelte-i18n';
import { saveSetting } from './settings.js';
import en from '../locales/en.json';

register('en', () => Promise.resolve(en));
init({ fallbackLocale: 'en', initialLocale: 'en' });
locale.subscribe(value => {
 if (value && value !== 'en') { locale.set('en'); return; }
 document.documentElement.lang = 'en';
 document.documentElement.dir = 'ltr';
 saveSetting('locale', 'en');
});
