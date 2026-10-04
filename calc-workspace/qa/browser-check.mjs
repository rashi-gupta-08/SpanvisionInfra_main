import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const url = process.env.CALC_PREVIEW_URL || 'http://127.0.0.1:4225/';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
await mkdir('qa', { recursive: true });
const results = [];
const failures = [];
const check = (name, pass, detail = '') => { results.push({ name, pass, detail }); if (!pass) failures.push(name); };

for (const [device, width, height] of [['desktop',1440,900], ['tablet',820,1180], ['phone',390,844]]) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  const external = new Set();
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(url).origin) external.add(request.url());
  });
  const inspect = async name => {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      text: document.body.innerText,
      theme: document.documentElement.dataset.theme,
      canvas: getComputedStyle(document.documentElement).getPropertyValue('--theme-content-bg').trim(),
    }));
    check(`${device}: ${name} has no page overflow`, !state.overflow);
    check(`${device}: ${name} has only edition branding`, !/OpenAEC|Open Calc Studio/.test(state.text));
    await page.screenshot({ path: `qa/${name}-${device}.png` });
    return state;
  };
  try {
    await page.goto(url);
    await page.locator('.start-brand').waitFor();
    check(`${device}: fresh theme`, (await inspect('start')).theme === 'spanvision-mono');
    await page.getByRole('button', { name: 'Sample estimate', exact: true }).click();
    await page.locator('.cost-grid').waitFor();
    await page.locator('.start-sidebar-close-btn').click();
    await inspect('workspace');
    check(`${device}: title does not overlap controls`, await page.locator('.titlebar-title').evaluate(el => {
      const title = el.getBoundingClientRect();
      const left = document.querySelector('.titlebar-left').getBoundingClientRect();
      const right = document.querySelector('.titlebar-controls').getBoundingClientRect();
      return title.left >= left.right && title.right <= right.left;
    }));
    await page.getByRole('button', { name: 'Preferences', exact: true }).click();
    await page.locator('.settings-dialog.modal-dialog-open').waitFor();
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.settings-dialog')).opacity) >= .99);
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    await inspect('settings');
    check(`${device}: settings fit viewport`, await page.locator('.settings-dialog').evaluate(el => {
      const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
    }));
    const themeSelect = page.locator('.settings-select');
    check(`${device}: Spanvision Mono is available and selected`, await themeSelect.inputValue() === 'spanvision-mono');
    await themeSelect.focus();
    check(`${device}: keyboard focus is visible`, await themeSelect.evaluate(el => {
      const style = getComputedStyle(el); return parseFloat(style.outlineWidth) >= 2 && style.outlineStyle !== 'none';
    }));
    await page.locator('.settings-btn-secondary').click();
    await page.waitForSelector('.settings-dialog', { state: 'hidden' });
    await page.keyboard.press('Control+f');
    await page.locator('.find-replace').waitFor();
    await inspect('dialog');
    check(`${device}: search dialog fits its workspace`, await page.locator('.find-replace').evaluate(el => {
      const r = el.getBoundingClientRect();
      const parent = el.parentElement.getBoundingClientRect();
      return r.left >= Math.max(0, parent.left) && r.right <= Math.min(innerWidth, parent.right);
    }));
    await page.locator('.find-replace-close').click();
    const tabs = await page.locator('button').allTextContents();
    console.log(device, 'buttons', tabs.filter(t => /Report|Spreadsheet|Data|Hours/.test(t)).join(' | '));
    const report = page.getByRole('button', { name: 'Report', exact: true });
    if (await report.count()) {
      await report.last().click();
      await page.locator('iframe[title="Report preview"]').waitFor({ timeout: 15000 });
      await page.frameLocator('iframe[title="Report preview"]').locator('body').evaluate(() => document.fonts.ready);
      await inspect('report');
      const reportText = await page.frameLocator('iframe[title="Report preview"]').locator('body').innerText();
      check(`${device}: report has data and no old branding`, reportText.length > 300 && !/OpenAEC|Open Calc Studio/.test(reportText));
    } else check(`${device}: report tab exists`, false);
    check(`${device}: no uncaught errors`, errors.length === 0, errors.join('\n'));
    check(`${device}: no external startup or report requests`, external.size === 0, [...external].join('\n'));
  } catch (error) {
    check(`${device}: browser flow`, false, String(error));
    await page.screenshot({ path: `qa/failure-${device}.png` });
  }
  await context.close();
}

for (const [name, settings] of [['structured saved theme', { 'ocs:settings': JSON.stringify({ theme: 'light', locale: 'en' }) }], ['legacy saved theme', { 'ocs-theme': 'blue' }]]) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(values => { for (const [key,value] of Object.entries(values)) localStorage.setItem(key,value); }, settings);
  await page.goto(url);
  await page.locator('.start-brand').waitFor();
  await page.waitForTimeout(600);
  check(name, await page.locator('html').getAttribute('data-theme') === (name.startsWith('structured') ? 'light' : 'blue'));
  await context.close();
}
await browser.close();
await writeFile('qa/browser-results.json', JSON.stringify(results, null, 2) + '\n');
console.log(`${results.length - failures.length}/${results.length} browser checks passed`);
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
