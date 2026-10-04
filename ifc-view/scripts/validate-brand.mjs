import { readFile, readdir } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const brand = JSON.parse(await readFile(resolve(root, 'brands/spanvision/brand.json'), 'utf8'));
const requiredValues = {
  organizationName: brand.organizationName,
  productName: brand.productName,
  ownershipLabel: `by ${brand.organizationName}`,
  version: '0.1.0',
  bundleIdentifier: 'com.spanvisioninfra.ifcview',
};

for (const [key, expected] of Object.entries(requiredValues)) {
  if (brand[key] !== expected) {
    throw new Error(`Brand field ${key} must be ${JSON.stringify(expected)}.`);
  }
}

const manifests = [
  ['package.json', 'version'],
  ['apps/desktop/package.json', 'version'],
  ['apps/desktop/src-tauri/tauri.conf.json', 'version'],
];

for (const [path, key] of manifests) {
  const value = JSON.parse(await readFile(resolve(root, path), 'utf8'))[key];
  if (value !== brand.version) {
    throw new Error(`${path} ${key} (${value}) does not match brand version ${brand.version}.`);
  }
}

const legacyTerms = [
  'mo' + 'nty',
  'open' + 'aec',
  'im' + 'pertio',
  '3' + 'bm',
  'piet' + ' mol',
];
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.rs', '.toml', '.ts', '.tsx', '.xml', '.yml', '.yaml']);
const productRoots = ['apps', 'packages', 'brands', 'scripts', '.github'];

async function collectTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (['dist', 'node_modules', 'target', 'gen'].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectTextFiles(path));
    else if (textExtensions.has(extname(entry.name).toLowerCase()) && !['Cargo.lock', 'pnpm-lock.yaml'].includes(entry.name)) files.push(path);
  }
  return files;
}

const productFiles = (await Promise.all(productRoots.map((path) => collectTextFiles(resolve(root, path))))).flat();
for (const path of productFiles) {
  const content = (await readFile(path, 'utf8')).toLowerCase();
  const match = legacyTerms.find((term) => content.includes(term));
  if (match) throw new Error(`Legacy branding found in ${relative(root, path)}.`);
}

console.log(`Validated ${brand.productName} ${brand.version} by ${brand.organizationName}; product sources contain no legacy branding.`);
