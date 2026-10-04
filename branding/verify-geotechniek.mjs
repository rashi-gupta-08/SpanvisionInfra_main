import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root } from './common.mjs';
const out=path.join(root,'qa/geotechniek');fs.mkdirSync(path.join(out,'screenshots'),{recursive:true});
const results=[],errors=[],requests=[];
const browser=await chromium.launch({channel:'msedge',headless:true});
const record=(scenario,width,details={})=>results.push({scenario,width,...details});
const upstream=/OpenAEC|Open Geotechniek Studio|OpenGeoStudio/i;
const check=async(page,name,width)=>{
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name} overflow at ${width}`);
 assert.doesNotMatch(await page.locator('body').innerText(),upstream,`${name} presentation`);
 await page.screenshot({path:path.join(out,'screenshots',`${name}-${width}.png`)});
 record(name,width);
};
try {
 for(const [width,height] of [[320,740],[390,844],[820,1180],[1440,900]]) {
  const context=await browser.newContext({viewport:{width,height},locale:'en-US',acceptDownloads:true});
  const page=await context.newPage();page.setDefaultTimeout(90000);
  page.on('pageerror',e=>errors.push({width,message:e.message}));
  page.on('request',r=>{if(/openaec|open-feedback/i.test(r.url()))requests.push(r.url());});
  await page.goto('http://127.0.0.1:4235/',{waitUntil:'domcontentloaded',timeout:120000});
  await page.getByText('example.gef',{exact:true}).first().waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'spanvision-mono');
  const palette=await page.evaluate(()=>{const s=getComputedStyle(document.documentElement);return Object.fromEntries(['--theme-bg','--theme-content-bg','--theme-text-secondary','--domain-cpt-qc','--domain-cpt-fs','--domain-cpt-rf'].map(k=>[k,s.getPropertyValue(k).trim()]));});
  assert.equal(palette['--theme-bg'],'#000000');assert.equal(palette['--theme-content-bg'],'#1B1B1B');
  assert.equal(palette['--theme-text-secondary'],'#999999');
  assert.equal(palette['--domain-cpt-qc'],'#D97706');assert.equal(palette['--domain-cpt-fs'],'#EA580C');assert.equal(palette['--domain-cpt-rf'],'#F59E0B');
  await check(page,'chart',width);record('fresh-theme-and-retained-curves',width,{palette});
  if(width<=1100){
   const trigger=page.getByRole('button',{name:'Explorer',exact:true});await trigger.click();
   const drawer=page.getByRole('dialog',{name:'Explorer'});await drawer.waitFor();
   const bounds=await drawer.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);
   for(let i=0;i<12;i++){await page.keyboard.press('Tab');assert.ok(await drawer.evaluate(d=>d.contains(document.activeElement)));}
   await page.screenshot({path:path.join(out,'screenshots',`explorer-${width}.png`)});
   await page.keyboard.press('Escape');await drawer.waitFor({state:'hidden'});assert.ok(await trigger.evaluate(el=>el===document.activeElement));
   record('drawer-focus-and-escape',width);
  }
  const settings=page.getByRole('button',{name:'Preferences',exact:true});await settings.click();
  let dialog=page.getByRole('dialog',{name:'Settings',exact:true});await dialog.waitFor();
  const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1);
  for(let i=0;i<20;i++){await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(d=>d.contains(document.activeElement)));}
  await dialog.getByRole('button',{name:'Appearance',exact:true}).click();await check(page,'settings',width);
  await dialog.locator('.theme-dropdown-trigger').click();await dialog.locator('.theme-dropdown-item').filter({hasText:'Light'}).first().click();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.locator('html').getAttribute('data-theme'),'spanvision-mono');
  assert.ok(await settings.evaluate(el=>el===document.activeElement));record('settings-focus-live-preview-cancel',width);
  await page.getByRole('button',{name:'Site plan',exact:true}).click();await page.locator('.tek-canvas').waitFor();
  await page.waitForTimeout(600);assert.equal(await page.locator('.tek-canvas').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(27, 27, 27)');
  await check(page,'drawing',width);
  if(width===1440) {
   const logoChooser=page.waitForEvent('filechooser');await page.locator('.tek-db-logo-clickable').click();
   await (await logoChooser).setFiles({name:'customer-logo.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="140" height="40"><rect width="140" height="40" fill="#3366ff"/><text x="12" y="26" fill="#ffffff" font-size="18">Customer</text></svg>')});
   const logo=page.locator('.tek-db-logo-custom');await logo.waitFor();assert.match(await logo.getAttribute('src'),/^data:image\/svg\+xml;base64,/);
   assert.equal(await logo.evaluate(e=>getComputedStyle(e).filter),'none');await check(page,'customer-logo',width);
  }
  await page.getByRole('button',{name:'Home',exact:true}).click();
  await page.locator('.ribbon-tab.file-tab').click();
  const chooser=page.waitForEvent('filechooser');await page.locator('.backstage-item').filter({hasText:/^Open/}).first().click();
  await (await chooser).setFiles(path.join(root,'spanvision-geptechniek-workspace/apps/desktop/public/example.gef'));
  await page.locator('.backstage-overlay').waitFor({state:'hidden'});record('browser-gef-import',width);
  await page.locator('.ribbon-tab.file-tab').click();await page.locator('.backstage-item').filter({hasText:/^New/}).first().click();
  await page.getByRole('button',{name:'Project info',exact:true}).click();
  dialog=page.getByRole('dialog').filter({hasText:/Project info/});await dialog.waitFor();
  await check(page,'project-dialog',width);
  const importChooser=page.waitForEvent('filechooser');await dialog.getByRole('button',{name:'Add CPT',exact:false}).click();
  await (await importChooser).setFiles(path.join(root,'spanvision-geptechniek-workspace/apps/desktop/public/example.gef'));
  await dialog.getByText('CPT000000036564',{exact:true}).waitFor();await page.keyboard.press('Escape');
  record('browser-project-import',width);
  // Saved preferences deliberately keep the original keys and values.
  await page.evaluate(()=>{localStorage.setItem('ogs:theme',JSON.stringify('blueprint'));localStorage.setItem('ogs:language',JSON.stringify('nl'));localStorage.setItem('ogs:ext.tekening.enabled',JSON.stringify(false));});
  await page.reload();await page.getByText('example.gef',{exact:true}).first().waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'blueprint');assert.equal(await page.locator('html').getAttribute('lang'),'nl');
  assert.equal(await page.getByRole('button',{name:'Site plan',exact:true}).count(),0);record('saved-theme-language-extension-preferences',width);
  await context.close();
 }
 assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
}catch(e){errors.push({message:e.message});process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({results,errors,requests},null,2)+'\n');await browser.close();}
console.log(`${results.length} Geotechniek scenarios checked; ${errors.length} errors.`);
