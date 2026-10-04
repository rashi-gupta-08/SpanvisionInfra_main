import { chromium, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('artifacts', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.PREVIEW_URL ?? 'http://127.0.0.1:3022');
await page.locator('.project-browser-tree').waitFor();
await page.evaluate(() => document.fonts.ready);
await expect(page.locator('html')).toHaveAttribute('data-theme', 'spanvision-mono');
await page.getByRole('button', { name: /Voetplaatverbinding/ }).click();
await page.locator('.vd-stage').first().waitFor();
await expect(page.locator('.calc-preview-content h1').first()).toHaveCSS('color', 'rgb(238, 238, 238)');
await page.screenshot({ path: 'artifacts/production-desktop.png', fullPage: true });
expect(errors).toEqual([]);
console.log(JSON.stringify({ title: await page.title(), errors, ready: true }));
await browser.close();
