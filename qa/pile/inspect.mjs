import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
process.env.TEMP='D:/SpanvisionToolchain/pile-temp';process.env.TMP=process.env.TEMP;
const root=process.cwd(),out=path.join(root,'qa/pile');
const {chromium}=await import(pathToFileURL(path.join(root,'node_modules/playwright/index.mjs')));
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1440,height:900},locale:'en-US'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4255/');
  await page.locator('.viewer-canvas').waitFor({timeout:60000});
  await page.waitForTimeout(1500);
  console.log((await page.locator('body').innerText()).slice(0,3500));
  for(const width of [1440,820,390,320]){
    await page.setViewportSize({width,height:900});await page.waitForTimeout(250);
    console.log(JSON.stringify(await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,theme:document.documentElement.dataset.theme,tone:document.documentElement.dataset.canvasTone,canvas:getComputedStyle(document.querySelector('.viewer-canvas')).backgroundColor,rect:document.querySelector('.viewer-canvas').getBoundingClientRect().toJSON()}))));
    await page.screenshot({path:path.join(out,`initial-${width}.png`)});
  }
  console.log('Page errors: '+JSON.stringify(errors));
}finally{await browser.close();}
