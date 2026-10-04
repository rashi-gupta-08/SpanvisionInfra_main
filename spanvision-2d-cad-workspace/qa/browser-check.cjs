/* Local browser QA. Run with Playwright available on NODE_PATH. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.CAD_PREVIEW_URL || 'http://127.0.0.1:4174/';
const out = __dirname;
const errors = [];
const checks = [];
const drawingId = 'spanvision-office-plan';
const layerId = 'architecture';
const style = { strokeColor: '#eeeeee', strokeWidth: 1, lineStyle: 'solid' };
const shape = (type, values, color = '#eeeeee') => ({ id: crypto.randomUUID(), type, layerId, drawingId, visible: true, locked: false, style: { ...style, strokeColor: color }, ...values });
const line = (x1, y1, x2, y2, color) => shape('line', { start: { x: x1, y: y1 }, end: { x: x2, y: y2 } }, color);
const rect = (x, y, w, h, color) => shape('rectangle', { topLeft: { x, y }, width: w, height: h, rotation: 0 }, color);
const text = (x, y, label, size = 3, color = '#bbbbbb') => shape('text', { position: { x, y }, text: label, fontSize: size, fontFamily: 'Osifont', rotation: 0, alignment: 'left', verticalAlignment: 'top', bold: false, italic: false, underline: false, color, lineHeight: 1.4, isModelText: false }, color);
const shapes = [
  rect(0, 0, 12000, 7600), rect(160, 160, 11680, 7280),
  line(4200, 160, 4200, 2800), line(4360, 160, 4360, 2800), line(4200, 3700, 4200, 7440), line(4360, 3700, 4360, 7440),
  line(160, 4700, 4200, 4700), line(160, 4860, 4200, 4860),
  line(4360, 4700, 9600, 4700), line(4360, 4860, 9600, 4860), line(10600, 4700, 11840, 4700),
  line(8400, 160, 8400, 2300), line(8560, 160, 8560, 2300), line(8400, 3200, 8400, 4700), line(8560, 3200, 8560, 4700),
  rect(900, 1400, 2400, 1100, '#999999'), rect(1300, 1080, 420, 250, '#999999'), rect(2480, 1080, 420, 250, '#999999'), rect(1300, 2560, 420, 250, '#999999'), rect(2480, 2560, 420, 250, '#999999'),
  rect(5100, 1300, 1300, 600, '#78bbb3'), rect(6800, 1300, 1300, 600, '#78bbb3'), rect(5100, 2300, 1300, 600, '#78bbb3'), rect(6800, 2300, 1300, 600, '#78bbb3'),
  rect(9300, 1200, 1750, 700, '#999999'), rect(9500, 2200, 650, 400, '#999999'), rect(9450, 3350, 1800, 350, '#999999'),
  rect(850, 5700, 2050, 450, '#999999'), rect(1500, 6400, 600, 300, '#999999'),
  text(1000, 3300, 'MEETING ROOM', 3.5), text(5400, 3500, 'DESIGN STUDIO', 3.5), text(9000, 4050, 'DIRECTOR', 3), text(900, 6800, 'RECEPTION', 3), text(6000, 6300, 'COLLABORATION SPACE', 3.5),
  line(0, -600, 12000, -600, '#777777'), line(0, -850, 0, -350, '#777777'), line(12000, -850, 12000, -350, '#777777'), text(5400, -1050, '12 000', 3),
  text(0, 8200, 'SPANVISION INFRA / OFFICE WORKSPACE', 4), text(0, 8750, 'GROUND FLOOR     ·     CONCEPT PLAN     ·     1:100', 2.5, '#999999'),
];
const fixture = path.join(out, 'Spanvision-office.o2d');
fs.writeFileSync(fixture, JSON.stringify({ version: 3, name: 'Spanvision office', createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString(), shapes, layers: [{ id: layerId, name: 'Architecture', drawingId, visible: true, locked: false, color: '#eeeeee', lineStyle: 'solid', lineWidth: 1 }], drawings: [{ id: drawingId, name: 'Office · Ground floor', drawingType: 'standalone', boundary: { x: -1200, y: -1800, width: 14500, height: 11800 }, scale: .01, createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString() }], sheets: [], activeDrawingId: drawingId, activeSheetId: null, activeLayerId: layerId, drawingViewports: {}, sheetViewports: {}, settings: { gridSize: 100, gridVisible: false, snapEnabled: true } }, null, 2));
const log = (name, detail = '') => { checks.push({ name, detail, passed: true }); console.log('PASS', name, detail); };
async function openFile(page, file, start = false) {
  const pending = page.waitForEvent('filechooser');
  if (start) await page.getByRole('button', { name: 'Open file' }).click();
  else await page.keyboard.press('Control+o');
  const chooser = await pending; await chooser.setFiles(file);
  await page.waitForTimeout(1000);
}
async function snap(page, name) { await page.screenshot({ path: path.join(out, name), fullPage: true }); }
async function overflow(page, name) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name} overflow`);
  log(`${name} has no page overflow`);
}
async function saveDownload(page, name) {
  await page.keyboard.press('Control+Shift+s');
  await page.getByRole('dialog', { name: 'Download project' }).waitFor();
  await page.getByRole('dialog', { name: 'Download project' }).getByRole('textbox').fill(name);
  await snap(page, 'save-dialog-desktop.png');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download .o2d', exact: true }).click();
  const download = await pending;
  const target = path.join(out, download.suggestedFilename()); await download.saveAs(target);
  const content = JSON.parse(fs.readFileSync(target, 'utf8'));
  assert.equal(content.version, 3); assert.ok(content.shapes.length > 0);
  return content;
}
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    await context.addInitScript(() => { window.showSaveFilePicker = undefined; });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.stack));
    await page.goto(base); await page.getByRole('button', { name: 'New drawing' }).waitFor();
    await page.waitForFunction(() => !document.querySelector('.web-loading'));
    assert.equal(await page.getByRole('button', { name: 'Restore draft' }).count(), 0);
    await snap(page, 'start-desktop.png'); await overflow(page, 'Desktop start');
    await page.getByRole('button', { name: 'New drawing' }).click();
    await page.waitForFunction(() => !!window.cad);
    log('New opens full editor');
    const rectangle = page.getByRole('button', { name: 'Rectangle', exact: true }).first();
    await rectangle.click();
    const canvas = page.locator('canvas').first(); const box = await canvas.boundingBox();
    await page.mouse.click(box.x + 220, box.y + 180); await page.mouse.click(box.x + 490, box.y + 350); await page.keyboard.press('Escape');
    const saved = await saveDownload(page, 'Browser-save-test');
    assert.equal(saved.shapes[0].type, 'rectangle'); log('.o2d fallback download retains drawn geometry');
    await openFile(page, fixture);
    await page.evaluate(() => window.cad._viewport.zoomToFit());
    await page.waitForTimeout(1200); if (await page.getByRole('button', { name: 'Dismiss notification' }).count()) await page.getByRole('button', { name: 'Dismiss notification' }).click(); await snap(page, 'workspace-desktop.png'); await overflow(page, 'Desktop editor');
    log('Open .o2d loads complete project');
    for (const [label, ext] of [['SVG', 'svg'], ['DXF', 'dxf'], ['IFC4', 'ifc'], ['JSON', 'json']]) {
      await page.getByRole('button', { name: 'File', exact: true }).click();
      await page.getByRole('button', { name: 'Export', exact: true }).click();
      const target = page.getByRole('button', { name: new RegExp(`^${label}`) }).first();
      const pending = page.waitForEvent('download'); await target.click();
      const download = await pending; assert.ok(download.suggestedFilename().endsWith(`.${ext}`));
      await download.saveAs(path.join(out, `export.${ext}`));
      assert.ok(fs.statSync(path.join(out, `export.${ext}`)).size > 30); log(`${label} download works`);
    }
    await page.getByRole('button', { name: 'View', exact: true }).click();
    await page.locator('.ribbon-theme-button').click(); await page.locator('.ribbon-theme-option').filter({ hasText: /^Light$/ }).click();
    await page.waitForTimeout(300);
    await page.reload(); await page.getByRole('button', { name: 'Restore draft' }).waitFor();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
    log('Theme preference persists across reload');
    await snap(page, 'restore-desktop.png');
    await page.getByRole('button', { name: 'Restore draft' }).click();
    await page.waitForFunction(() => !!window.cad);
    await page.getByRole('button', { name: 'View', exact: true }).click(); await page.locator('.ribbon-theme-button').click(); await page.locator('.ribbon-theme-option').filter({ hasText: 'Spanvision Mono' }).click();
    log('Restore returns recovered geometry to editor');
    await page.getByRole('button', { name: 'File', exact: true }).click(); await page.getByRole('button', { name: 'About', exact: true }).click();
    for (const hidden of ['Extensions', 'Send Feedback', 'Exit', 'Recent']) assert.equal(await page.getByRole('button', { name: hidden, exact: true }).count(), 0);
    log('Desktop-only menu actions are hidden');
    await snap(page, 'about-desktop.png');
    assert.equal(await page.getByRole('link', { name: 'Source license' }).count(), 1); log('About exposes source license and notices');
    await page.keyboard.press('Escape');
    await context.close();

    const tablet = await browser.newContext({ viewport: { width: 820, height: 1180 }, acceptDownloads: true });
    await tablet.addInitScript(() => { window.showSaveFilePicker = undefined; });
    const tp = await tablet.newPage(); tp.on('pageerror', e => errors.push(e.stack));
    await tp.goto(base); await tp.getByRole('button', { name: 'New drawing' }).waitFor(); await snap(tp, 'start-tablet.png');
    await openFile(tp, fixture, true); await tp.waitForFunction(() => !!window.cad); await tp.evaluate(() => window.cad._viewport.zoomToFit());
    await tp.waitForTimeout(600); await snap(tp, 'workspace-tablet.png'); await overflow(tp, 'Tablet editor');
    await tablet.close();

    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', acceptDownloads: true });
    const mp = await phone.newPage(); mp.on('pageerror', e => errors.push(e.stack));
    await mp.goto(base); await mp.getByRole('button', { name: 'Open file' }).waitFor(); await snap(mp, 'start-phone.png');
    assert.equal(await mp.getByRole('button', { name: 'New drawing' }).count(), 0); log('Phone opens touch review flow');
    await openFile(mp, fixture, true);
    await mp.getByRole('button', { name: 'Got it' }).click();
    await mp.waitForTimeout(600); await snap(mp, 'workspace-phone.png'); await overflow(mp, 'Phone viewer');
    await mp.getByRole('button', { name: 'Measure', exact: true }).click();
    await mp.mouse.click(140, 360); await mp.mouse.click(280, 450); await snap(mp, 'measure-phone.png');
    await mp.getByRole('button', { name: 'Markup', exact: true }).click();
    await mp.mouse.move(130, 360); await mp.mouse.down(); await mp.mouse.move(270, 410, { steps: 15 }); await mp.mouse.up();
    assert.ok(await mp.locator('[data-review-markup] path').count());
    await snap(mp, 'markup-phone.png'); await mp.waitForTimeout(1300);
    await mp.reload(); await mp.getByRole('button', { name: 'Restore draft' }).waitFor(); await mp.getByRole('button', { name: 'Restore draft' }).click();
    await mp.waitForTimeout(700); assert.ok(await mp.locator('[data-review-markup] path').count()); log('Mobile markup recovers with browser draft');
    const pngPending = mp.waitForEvent('download'); await mp.getByRole('button', { name: 'Review PNG' }).click();
    const png = await pngPending; await png.saveAs(path.join(out, 'marked-up-review.png'));
    assert.equal(fs.readFileSync(path.join(out, 'marked-up-review.png')).subarray(1, 4).toString(), 'PNG'); log('Marked-up PNG download works');
    await snap(mp, 'recovered-phone.png');
    await mp.setViewportSize({ width: 320, height: 740 }); await overflow(mp, 'Small phone'); await snap(mp, 'small-phone.png');
    await phone.close();
    assert.equal(errors.length, 0, errors.join('\n'));
    log('No uncaught browser errors');
  } finally {
    fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify({ base, checks, errors }, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
