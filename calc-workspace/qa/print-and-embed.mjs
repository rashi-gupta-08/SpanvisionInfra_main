import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });
await mkdir('output/pdf', { recursive: true });

if (!process.env.CALC_EMBED_ONLY) {
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:4225/');
await page.locator('.start-brand').waitFor();
await page.locator('.start-sidebar-close-btn').click();
await page.getByRole('button', { name: 'Report', exact: true }).last().click();
const report = page.frameLocator('iframe[title="Report preview"]');
await report.locator('body').waitFor();
await report.locator('body').evaluate(() => document.fonts.ready);
const html = await report.locator('html').evaluate(el => el.outerHTML);
const printPage = await browser.newPage();
await printPage.setContent(html);
await printPage.evaluate(() => document.fonts.ready);
await printPage.pdf({ path: 'output/pdf/sample-estimate.pdf', preferCSSPageSize: true, printBackground: true });
check('browser PDF created from report preview', true);
await printPage.close();

await page.getByRole('button', { name: 'Preferences', exact: true }).click();
await page.locator('.settings-dialog.modal-dialog-open').waitFor();
await page.getByRole('button', { name: 'About', exact: true }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: 'qa/about-desktop.png' });
await page.close();
}

const embed = await browser.newPage({ viewport: { width: 1440, height: 1180 } });
const errors = [];
embed.on('pageerror', e => errors.push(e.message));
await embed.goto('http://127.0.0.1:4226/');
await embed.locator('.ocs-embed .cost-grid').waitFor({ timeout: 60000 });
await embed.waitForTimeout(1000);
const before = await embed.evaluate(() => ({
  bodyBackground: getComputedStyle(document.body).backgroundColor,
  bodyFont: getComputedStyle(document.body).fontFamily,
  theme: document.documentElement.dataset.theme ?? null,
  hostBackground: getComputedStyle(document.querySelector('main > .content')).backgroundColor,
}));
check('embed uses Spanvision Mono', await embed.locator('#estimate .ocs-embed').getAttribute('data-theme') === 'spanvision-mono');
await embed.locator('#controls select').nth(1).selectOption('light');
await embed.waitForTimeout(300);
check('embed accepts an alternate theme', await embed.locator('#estimate .ocs-embed').getAttribute('data-theme') === 'light');
const after = await embed.evaluate(() => ({
  bodyBackground: getComputedStyle(document.body).backgroundColor,
  bodyFont: getComputedStyle(document.body).fontFamily,
  theme: document.documentElement.dataset.theme ?? null,
  hostBackground: getComputedStyle(document.querySelector('main > .content')).backgroundColor,
}));
check('embed preserves host styles and document theme', JSON.stringify(before) === JSON.stringify(after));
await embed.locator('#controls select').nth(1).selectOption('spanvision-mono');
await embed.locator('.ocs-embed').getByRole('button', { name: 'Preferences', exact: true }).click();
await embed.locator('.ocs-portal .settings-dialog.modal-dialog-open').waitFor();
check('embedded dialogs inherit scoped theme', await embed.locator('.ocs-portal').getAttribute('data-theme') === 'spanvision-mono');
await embed.waitForTimeout(300);
await embed.screenshot({ path: 'qa/embed-desktop.png' });
check('embed has no uncaught errors', errors.length === 0, errors.join('\n'));
await browser.close();
await writeFile('qa/print-embed-results.json', JSON.stringify(results, null, 2) + '\n');
console.log(results);
if (results.some(r => !r.pass)) process.exitCode = 1;
