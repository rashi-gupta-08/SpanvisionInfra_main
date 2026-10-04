import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {root} from '../../branding/common.mjs';

const out=path.join(root,'qa/stl');
const fixture=JSON.parse(fs.readFileSync(path.join(out,'fixture.json'),'utf8'));
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 for(const [width,height] of [[320,740],[390,844],[820,1180],[1440,900]]) {
  const context=await browser.newContext({viewport:{width,height}});
  const page=await context.newPage();
  await page.route('**/api/area',route=>route.fulfill({json:fixture.area}));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  const settings=async()=>{if(width<768)await page.getByRole('button',{name:'Settings',exact:true}).click();};
  await settings();
  await page.getByRole('button',{name:'Area around map center',exact:true}).click();
  await page.getByRole('button',{name:'Load map data',exact:true}).click();
  await page.waitForFunction(()=>!document.getElementById('sec-design').inert);
  if(width<768)await page.getByRole('button',{name:'Map',exact:true}).click();
  await page.waitForFunction(()=>!pendingAreaFit&&!map._animatingZoom&&!map._panAnim?._inProgress&&[...document.querySelectorAll('#map .leaflet-tile')].some(tile=>tile.complete&&tile.naturalWidth>0),null,{timeout:15000});
  await page.waitForFunction(()=>Object.values(baseLayers).filter(layer=>map.hasLayer(layer)).every(layer=>!layer.isLoading()),null,{timeout:20000});
  await page.waitForTimeout(750);
  await page.screenshot({path:path.join(out,`preview-map-${width}.png`)});
  await settings();
  await page.locator('aside').evaluate(el=>el.scrollTop=0);
  await page.screenshot({path:path.join(out,`preview-settings-${width}.png`)});
  await context.close();
 }
} finally {await browser.close();}
console.log('Captured map and settings at 320, 390, 820 and 1440 pixels. Map tiles are live; feature data is the deterministic verification fixture.');
