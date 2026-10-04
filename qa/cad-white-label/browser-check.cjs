const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
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
      await page.goto('http://127.0.0.1:4220/');
      await page.getByRole('button', { name: /^Open file/ }).waitFor();
      await page.waitForFunction(() => !document.querySelector('.web-loading'));
      assert.match(await page.title(), /2D CAD.*Spanvision Infra/);
      assert.doesNotMatch(await page.locator('body').innerText(), /OpenAEC|Open 2D Studio|Open2DStudio|geptechniek/i);
      await page.screenshot({ path: path.join(__dirname, `2d-start-${width}.png`), fullPage: true });
      await page.goto('http://127.0.0.1:4220/legal.html');
      assert.match(await page.title(), /Legal and licenses.*Spanvision Infra/);
      assert.match(await page.locator('body').innerText(), /Impertio/);
      assert.match(await page.locator('body').innerText(), /OpenAEC Foundation/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      for (const url of ['/LICENSE.md', '/NOTICE.md', '/logo.svg']) {
        assert.ok((await context.request.get(`http://127.0.0.1:4220${url}`)).ok(), url);
      }
      await page.screenshot({ path: path.join(__dirname, `2d-legal-${width}.png`), fullPage: true });
      assert.deepEqual(externalRequests, []);
      assert.deepEqual(errors, []);
      checks.push({ width, branding: 'passed', legalLinks: 'passed', legalOverflow: false, externalRequests, errors });
      await context.close();
    }
    fs.writeFileSync(path.join(__dirname, 'browser-branding.json'), JSON.stringify(checks, null, 2) + '\n');
    console.log('Passed 2D CAD branding, legal links, and external request checks at three viewport widths.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
