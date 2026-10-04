import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { getSetting, setSetting, getCanvasColor, applyTheme } from './settingsStore';

describe('Spanvision preference migration', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());
  it('restores language and canvas preferences without deleting the original values', () => {
    localStorage.setItem('openaec-bim-validator:language', 'nl');
    localStorage.setItem('openaec-bim-validator:canvasColor', '#234567');
    expect(getSetting('language', 'en')).toBe('nl');
    expect(getCanvasColor()).toBe('#234567');
    expect(localStorage.getItem('spanvision:vision-bim-validator:language')).toBe('nl');
    expect(localStorage.getItem('openaec-bim-validator:canvasColor')).toBe('#234567');
  });
  it('prefers current values to legacy preferences', () => {
    localStorage.setItem('openaec-bim-validator:language', 'nl');
    setSetting('language', 'en');
    expect(getSetting('language', 'auto')).toBe('en');
  });
  it('migrates retired theme identifiers to Mono and preserves the original record', () => {
    localStorage.setItem('openaec-bim-validator:theme', 'openaec');
    expect(getSetting('theme', 'light')).toBe('spanvision-mono');
    expect(localStorage.getItem('openaec-bim-validator:theme')).toBe('openaec');
    applyTheme();
    expect(document.documentElement.dataset.theme).toBe('spanvision-mono');
  });
  it('uses the requested canvas color if a stored value is invalid', () => {
    setSetting('canvasColor', 'bad-color');
    expect(getCanvasColor()).toBe('#1B1B1B');
  });
  it('remains usable when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(getSetting('language', 'en')).toBe('en');
    expect(getCanvasColor()).toBe('#1B1B1B');
  });
});
