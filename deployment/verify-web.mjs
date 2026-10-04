import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'qa/deployment');
let modules;
try { modules = JSON.parse(await fs.readFile(path.join(root, 'deployment/production.json'), 'utf8')).modules; }
catch { modules = Object.values(JSON.parse(await fs.readFile(path.join(out, 'vercel-deployments.json'), 'utf8'))); }
const deployments = JSON.parse(await fs.readFile(path.join(out, 'vercel-deployments.json'), 'utf8'));
if (deployments.hub && !modules.some(tool => tool.id === 'hub')) modules.push(deployments.hub);
const selected = process.argv.slice(2);
if (selected.length) modules = modules.filter(tool => selected.includes(tool.id));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
const luminance = async buffer => {
  const { data, info } = await sharp(buffer).resize(160, 100, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let sum = 0;
  for (let i = 0; i < data.length; i += info.channels) sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
  return sum / (info.width * info.height);
};
try {
  for (const tool of modules) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, locale: 'nl-NL' });
    const page = await context.newPage();
    const errors = [], loopback = [], badAssets = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (['localhost', '127.0.0.1'].includes(new URL(request.url()).hostname)) loopback.push(request.url()); });
    page.on('response', response => { if (response.status() >= 400 && /\.(js|css|wasm)(?:\?|$)/.test(response.url())) badAssets.push(`${response.status()} ${response.url()}`); });
    try {
      await page.goto(tool.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const control = page.getByRole('combobox', { name: 'Color mode', exact: true });
      await control.waitFor({ state: 'visible', timeout: 60000 });
      if (tool.id === 'cad') await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 60000 });
      await page.waitForTimeout(tool.id === 'cad' ? 1800 : 900);
      assert.equal(await page.evaluate(() => document.documentElement.dataset.svMode), 'dark', `${tool.id}: dark by default`);
      assert.match(await page.evaluate(() => document.documentElement.lang), /^en(?:-|$)/, `${tool.id}: English`);
      const dark = await page.screenshot({ path: path.join(out, `${tool.id}-live-dark.png`) });
      await control.selectOption('light');
      await page.waitForTimeout(tool.id === 'cad' ? 1600 : 700);
      assert.equal(await page.evaluate(() => document.documentElement.dataset.svMode), 'light');
      const light = await page.screenshot({ path: path.join(out, `${tool.id}-live-light.png`) });
      const brightness = { dark: await luminance(dark), light: await luminance(light) };
      assert.ok(brightness.light - brightness.dark > 25, `${tool.id}: visible light and dark themes ${JSON.stringify(brightness)}`);
      if (tool.id === 'cad2d' && await page.locator('.web-start-overlay').isVisible()) {
        await page.getByRole('button', { name: /New drawing/ }).first().click();
        await page.locator('.web-start-overlay').waitFor({ state: 'hidden' });
        await page.locator('canvas').first().waitFor({ state: 'visible' });
      }
      if (tool.id === 'hub') {
        const links = await page.locator('a[aria-label^="Open "][target="_blank"]').evaluateAll(items => items.map(item => item.href));
        assert.equal(links.length, 16);
        assert.ok(links.every(url => new URL(url).protocol === 'https:' && new URL(url).searchParams.get('appearance') === 'light'));
      }
      await control.selectOption('dark');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await control.waitFor({ state: 'visible' });
      assert.equal(await control.inputValue(), 'dark');
      assert.deepEqual(loopback, [], `${tool.id}: no connections to visitors' computers`);
      assert.deepEqual(badAssets, [], `${tool.id}: no broken JS/CSS/WASM assets`);
      assert.deepEqual(errors, [], `${tool.id}: no uncaught browser errors`);
      results.push({ id: tool.id, url: tool.url, passed: true, brightness });
      console.log(`PASS ${tool.id}: public page, assets, English, both themes and saved mode`);
    } catch (error) {
      results.push({ id: tool.id, passed: false, error: error.message, errors, badAssets, loopback });
      console.log(`FAIL ${tool.id}: ${error.message}`);
    } finally { await context.close(); }
  }
} finally {
  await browser.close();
  let previous = [];
  if (selected.length) {
    try { previous = JSON.parse(await fs.readFile(path.join(out, 'browser-verification.json'), 'utf8')); } catch {}
  }
  const updated = new Set(results.map(result => result.id));
  await fs.writeFile(path.join(out, 'browser-verification.json'), JSON.stringify([...previous.filter(result => !updated.has(result.id)), ...results], null, 2));
}
assert.ok(results.length && results.every(result => result.passed), 'Production browser checks failed; see qa/deployment/browser-verification.json');
