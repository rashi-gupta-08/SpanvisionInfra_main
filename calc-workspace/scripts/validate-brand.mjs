import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
const json = name => JSON.parse(readFileSync(name, 'utf8'));
const brand = json('brand.json');
const tauri = json('src-tauri/tauri.conf.json');
assert.equal(tauri.productName, brand.product);
assert.equal(tauri.identifier, brand.appIdentifier);
assert.equal(json('package.json').name, brand.packageName);
assert.equal(json('packages/embed/package.json').name, brand.packageName);
assert.equal(brand.accountsEnabled, false);
const forbidden = /Open Calc Studio|OpenAEC|open-aec\.(?:com|org)|open-feedback-studio\.pages\.dev/;
const failures = [];
function audit(directory, extensions) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'source-provenance') continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) audit(file, extensions);
    else if (extensions.includes(path.extname(file)) && forbidden.test(readFileSync(file, 'utf8'))) failures.push(file);
  }
}
audit('public/data', ['.ifcCalc']);
audit('src/data/samples', ['.ifcCalc']);
audit('src/i18n/locales', ['.json']);
audit('public', ['.svg']);
if (existsSync('dist')) audit('dist', ['.js', '.html', '.svg']);
if (existsSync('packages/embed/dist')) audit('packages/embed/dist', ['.js', '.html', '.svg']);
audit('docs', ['.md', '.html', '.svg']);
assert.deepEqual(failures, [], `Inherited branding in shipped presentation: ${failures.join(', ')}`);
console.log('Brand identity, translations, sample content, and shipped presentation verified.');
