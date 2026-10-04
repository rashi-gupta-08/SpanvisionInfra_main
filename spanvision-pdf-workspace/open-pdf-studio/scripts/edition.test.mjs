import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { migratePreferences, PREFERENCES_KEY } from '../js/core/edition-storage.js';
import { BRAND, configuredUrl } from '../js/core/brand.js';

function storage(records = {}) {
  const values = new Map(Object.entries(records));
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('first launch copies all legacy preferences and preserves the source', () => {
  const legacy = JSON.stringify({ theme:'blue', canvasBackground:'#654321', authorName:'Customer', defaultViewMode:'continuous', rectStrokeColor:'#ff0000', customSymbols:[{id:'customer'}] });
  const s = storage({pdfEditorPreferences:legacy});
  assert.equal(migratePreferences(s), legacy);
  assert.equal(s.getItem(PREFERENCES_KEY), legacy);
  assert.equal(s.getItem('pdfEditorPreferences'), legacy);
  assert.equal(migratePreferences(s), legacy);
});

test('an existing edition record wins even when it is empty or malformed', () => {
  for (const current of ['{}', '{"theme":"light"}', 'corrupt']) {
    const s = storage({[PREFERENCES_KEY]:current, pdfEditorPreferences:'{"theme":"dark"}'});
    assert.equal(migratePreferences(s), current);
    assert.equal(s.getItem(PREFERENCES_KEY), current);
  }
});

test('corrupt, null or array legacy records are never copied', () => {
  for (const legacy of ['not json','null','[]','false','"string"']) {
    const s = storage({pdfEditorPreferences:legacy});
    assert.equal(migratePreferences(s), null);
    assert.equal(s.getItem(PREFERENCES_KEY), null);
    assert.equal(s.getItem('pdfEditorPreferences'), legacy);
  }
});

test('storage failure leaves legacy data intact and does not throw', () => {
  const s = storage({pdfEditorPreferences:'{"theme":"light"}'});
  s.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(migratePreferences(s), null);
  assert.equal(s.getItem('pdfEditorPreferences'), '{"theme":"light"}');
});

function bootTheme(records, dark = true) {
  let theme;
  const source = fs.readFileSync(new URL('../public/js/theme-init.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, { localStorage:storage(records), matchMedia:() => ({matches:dark}), document:{documentElement:{setAttribute:(name,value) => {if(name==='data-theme')theme=value;}}} });
  return theme;
}
test('synchronous startup restores saved themes and defaults fresh installs to Mono', () => {
  assert.equal(bootTheme({}), BRAND.theme);
  assert.equal(bootTheme({pdfEditorPreferences:'{"theme":"blue"}'}), 'blue');
  assert.equal(bootTheme({[PREFERENCES_KEY]:'{"theme":"light"}',pdfEditorPreferences:'{"theme":"dark"}'}), 'light');
  assert.equal(bootTheme({[PREFERENCES_KEY]:'{"theme":"system"}'}, false), 'light');
  assert.equal(bootTheme({[PREFERENCES_KEY]:'broken'}), BRAND.theme);
});

test('fresh edition has no service destinations or active updater', () => {
  assert.equal(BRAND.organization, 'Spanvision infra');
  assert.equal(BRAND.product, 'geptechniek workspace · PDF');
  assert.equal(BRAND.identifier, 'com.spanvisioninfra.pdfworkspace');
  assert.equal(BRAND.updater.enabled, false);
  assert.equal(BRAND.accounts.enabled, false);
  for(const key of ['websiteUrl','supportUrl','feedbackUrl','releasesApiUrl','symbolRepository']) {
    assert.ok(Object.hasOwn(BRAND,key));
    assert.equal(configuredUrl(BRAND[key]), null);
  }
  assert.equal(configuredUrl('https://services.example.test'), 'https://services.example.test');
  assert.equal(configuredUrl('javascript:alert(1)'), null);
});
