import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve(import.meta.dirname);fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},locale:'en-US'});
page.on('pageerror',error=>console.log('PAGE ERROR:',error.message));
await page.goto('http://127.0.0.1:4245/');await page.waitForFunction(()=>window.app);await page.evaluate(()=>window.app.ready);
for(const width of [1440,390]) {
 await page.setViewportSize({width,height:900});
 for(const tab of ['project','opname','inspectie','oplevering','dashboard','koppelingen']) {
  await page.evaluate(tab=>window.app.switchTab(tab),tab);
  await page.screenshot({path:path.join(out,`initial-${tab}-${width}.png`),animations:'disabled'});
  const state=await page.evaluate(()=>({theme:document.documentElement.dataset.theme,overflow:document.documentElement.scrollWidth>innerWidth,bg:getComputedStyle(document.body).backgroundColor,offscreen:[...document.querySelectorAll('main *, .main-content *')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&(r.right>innerWidth+1||r.left< -1)&&getComputedStyle(el).display!=='none';}).map(el=>({tag:el.tagName,id:el.id,cls:el.className,text:el.textContent.trim().slice(0,30)})).slice(0,8)}));
  console.log(JSON.stringify({width,tab,...state}));
 }
}
await browser.close();
