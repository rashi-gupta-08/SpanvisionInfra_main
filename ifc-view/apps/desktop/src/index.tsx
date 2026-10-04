/* @refresh reload */
import { render } from 'solid-js/web';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@/styles/global.css';
import App from './App';
import { initializeAppearance } from '@/state/appearance-store';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

initializeAppearance();
render(() => <App />, root);

import "./styles/brand-palette.css";

// Spanvision appearance bridge
import {setTheme} from '@/state/appearance-store';
window.addEventListener('spanvision:mode-change',()=>setTheme(document.documentElement.dataset.svMode === 'light' ? 'light' : 'spanvision-mono'));
