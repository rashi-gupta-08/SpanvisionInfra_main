import { readFileSync, writeFileSync } from 'node:fs';
const brand = JSON.parse(readFileSync('brand.json', 'utf8'));
const path = 'src-tauri/tauri.conf.json';
const config = JSON.parse(readFileSync(path, 'utf8'));
config.productName = brand.product;
// Keep the installed executable path stable across display-name changes.
config.identifier = brand.appIdentifier;
for (const window of config.app.windows) window.title = `${brand.product} — ${brand.organization}`;
const content = JSON.stringify(config, null, 2) + '\n';
if (readFileSync(path, 'utf8') !== content) writeFileSync(path, content);
