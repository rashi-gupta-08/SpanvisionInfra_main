const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--enable-unsafe-webgpu', '--use-angle=swiftshader', '--enable-webgl', '--disable-gpu-sandbox'] });
  const checks = [];
  try {
    for (const width of [390, 820, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const externalRequests = [];
      const errors = [];
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.protocol.startsWith('http') && url.hostname !== '127.0.0.1') externalRequests.push(request.url());
      });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:4173/');
      assert.match(await page.locator('body').innerText(), /Spanvision Infra/);
      assert.doesNotMatch(await page.locator('body').innerText(), /OpenAEC|OpenCADStudio|geptechniek/i);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(__dirname, `cad-site-${width}.png`), fullPage: true });
      await page.getByRole('link', { name: 'Legal and licenses', exact: true }).click();
      assert.match(await page.title(), /Legal and licenses.*Spanvision Infra/);
      assert.match(await page.locator('body').innerText(), /Hakan Seven/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      for (const url of ['/LICENSE', '/NOTICE.md', '/assets/logo.svg']) {
        assert.ok((await context.request.get(`http://127.0.0.1:4173${url}`)).ok(), url);
      }
      await page.screenshot({ path: path.join(__dirname, `cad-legal-${width}.png`), fullPage: true });
      if (width >= 820) {
        await page.goto('http://127.0.0.1:4173/app/');
        await page.locator('canvas').waitFor({ timeout: 90000 });
        await page.waitForFunction(() => !document.querySelector('#loading'));
        await page.waitForTimeout(2500);
        assert.match(await page.title(), /CAD/);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: path.join(__dirname, `cad-editor-${width}.png`) });
      }
      assert.deepEqual(externalRequests, []);
      assert.deepEqual(errors, []);
      checks.push({ width, siteBranding: 'passed', legalLinks: 'passed', overflow: false, editor: width >= 820 ? 'canvas loaded' : 'website only', externalRequests, errors });
      await context.close();
    }
    fs.writeFileSync(path.join(__dirname, 'native-browser-branding.json'), JSON.stringify(checks, null, 2) + '\n');
    console.log('Passed CAD website branding, legal links, external requests, and desktop/tablet editor startup.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
