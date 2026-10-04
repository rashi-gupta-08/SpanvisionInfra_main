import { chromium, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const url = process.env.PREVIEW_URL ?? 'http://127.0.0.1:3022';
mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];

async function assertViewport(page, screen) {
  const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  expect(layout.scroll, `${screen}: horizontal page overflow`).toBeLessThanOrEqual(layout.width);
  expect(await page.locator('body').innerText(), `${screen}: old product identity`).not.toMatch(/OpenAEC|Open Calculations|Open Template|\bOA\b/);
}

try {
  for (const [name, width, height] of [['desktop', 1440, 960], ['tablet', 768, 1024], ['mobile', 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.locator('.pg-panel').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'spanvision-mono');
    const palette = await page.evaluate(() => ({
      page: getComputedStyle(document.body).backgroundColor,
      ribbon: getComputedStyle(document.querySelector('.ribbon-container')).backgroundColor,
      input: getComputedStyle(document.querySelector('.pg-panel input')).backgroundColor,
    }));
    expect(palette).toEqual({ page: 'rgb(0, 0, 0)', ribbon: 'rgb(18, 18, 18)', input: 'rgb(27, 27, 27)' });
    await assertViewport(page, `${name} project`);
    await page.screenshot({ path: `artifacts/${name}-project.png` });

    if (width <= 900) await page.getByRole('button', { name: 'Open project browser' }).click();
    await page.getByRole('button', { name: /Voetplaatverbinding/ }).click();
    await page.locator('.vd-panel').waitFor();
    if (width <= 900) await expect(page.locator('.project-browser')).toHaveCSS('width', '36px');
    const rename = page.locator('.exemplaar-naam-input');
    if (await rename.isVisible()) { await rename.fill('Steel connection'); await rename.press('Enter'); }
    await expect(page.locator('.vd-stage').first()).toHaveCSS('background-color', 'rgb(27, 27, 27)');
    if (width > 600) await expect(page.locator('.calc-preview-content h1').first()).toHaveCSS('color', 'rgb(238, 238, 238)');
    const designerLayout = await page.evaluate(() => {
      const body = document.querySelector('.vd-body').getBoundingClientRect();
      const controls = document.querySelector('.vd-controls').getBoundingClientRect();
      const footer = document.querySelector('.vd-foot').getBoundingClientRect();
      return { bodyBottom: body.bottom, controlBottom: controls.bottom, footerTop: footer.top };
    });
    expect(designerLayout.controlBottom, `${name}: controls fit designer body`).toBeLessThanOrEqual(designerLayout.bodyBottom + 1);
    expect(designerLayout.footerTop, `${name}: footer does not overlap controls`).toBeGreaterThanOrEqual(designerLayout.controlBottom - 1);
    await assertViewport(page, `${name} designer`);
    await page.screenshot({ path: `artifacts/${name}-designer.png` });

    await page.getByRole('button', { name: 'Code + Uitwerking', exact: true }).click();
    await page.locator('.cm-editor').waitFor();
    await assertViewport(page, `${name} editor`);
    await page.screenshot({ path: `artifacts/${name}-editor.png` });
    await page.getByRole('button', { name: 'Visueel + Uitwerking', exact: true }).click();
    if (width <= 600) {
      await page.getByRole('tab', { name: 'Results', exact: true }).click();
      await expect(page.locator('.calc-preview-content h1').first()).toHaveCSS('color', 'rgb(238, 238, 238)');
      await page.screenshot({ path: `artifacts/${name}-results.png` });
      await page.getByRole('tab', { name: 'Visual design', exact: true }).click();
    }

    await page.getByRole('button', { name: 'Preferences', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const focusedButton = dialog.getByRole('button', { name: 'Close', exact: true });
    await page.keyboard.press('Tab');
    await focusedButton.focus();
    await expect(focusedButton).toHaveCSS('outline-color', 'rgba(255, 255, 255, 0.65)');
    for (let tab = 0; tab < 16; tab++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);
    }
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    await page.getByRole('button', { name: 'Theme', exact: true }).click();
    await assertViewport(page, `${name} theme dropdown`);
    await page.screenshot({ path: `artifacts/${name}-themes.png` });
    await page.getByRole('button', { name: 'Light', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'spanvision-mono');
    await page.getByRole('button', { name: 'Preferences', exact: true }).click();
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    await page.getByRole('button', { name: 'Theme', exact: true }).click();
    await page.getByRole('button', { name: 'Spanvision Mono', exact: true }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).last().click();
    await page.reload();
    await page.locator('.vd-panel').waitFor();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'spanvision-mono');

    // A retained alternative survives a browser reload; then restore the new default.
    await page.getByRole('button', { name: 'Preferences', exact: true }).click();
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    await page.getByRole('button', { name: 'Theme', exact: true }).click();
    await page.getByRole('button', { name: 'Night (dark)', exact: true }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).last().click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'openaec');
    await page.getByRole('button', { name: 'Preferences', exact: true }).click();
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    await page.getByRole('button', { name: 'Theme', exact: true }).click();
    await page.getByRole('button', { name: 'Spanvision Mono', exact: true }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).last().click();

    // Save a real calculation and check both branding and document compatibility.
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save', exact: true }).last().click();
    const download = await downloadPromise;
    const savedPath = `artifacts/${name}-project.ifccalculation`;
    await download.saveAs(savedPath);
    const { readFileSync } = await import('node:fs');
    const exported = JSON.parse(readFileSync(savedPath, 'utf8'));
    const metadata = JSON.stringify(exported.header);
    expect(metadata).toContain('Spanvision Infra');
    expect(metadata).toContain('Vision Calculation Studio');
    expect(metadata).not.toContain('OpenAEC');

    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.getByRole('button', { name: 'About', exact: true }).click();
    await assertViewport(page, `${name} about`);
    await page.screenshot({ path: `artifacts/${name}-about.png` });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /Voorbeeld/ }).click();
    await page.locator('.av-paneel').waitFor();
    await page.locator('.av-pagina').first().waitFor();
    await assertViewport(page, `${name} print preview`);
    await page.screenshot({ path: `artifacts/${name}-print.png` });
    await page.getByRole('button', { name: 'Sluiten', exact: true }).click();
    await page.getByRole('button', { name: 'IFC', exact: true }).click();
    await page.locator('.ifc-viewer-panel').waitFor();
    await assertViewport(page, `${name} IFC viewer`);
    await page.screenshot({ path: `artifacts/${name}-ifc.png` });

    expect(errors, `${name}: runtime errors`).toEqual([]);
    results.push({ viewport: name, width, height, palette, errors, passed: true });
    await context.close();
  }
  writeFileSync('artifacts/ui-verification.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
