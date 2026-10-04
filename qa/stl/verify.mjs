import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {root,brand,fingerprint} from '../../branding/common.mjs';
const base='http://127.0.0.1:8765',out=path.join(root,'qa/stl');
const fixture=JSON.parse(fs.readFileSync(path.join(out,'fixture.json'),'utf8'));
const results=[],errors=[],inheritedRequests=[];
const record=(scenario,width)=>results.push({scenario,width});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const module=brand.modules.find(m=>m.id==='stl');const health=await(await fetch(base+'/__stl/status')).json();assert.ok(health.available);assert.equal(health.sourceFingerprint,fingerprint(module));
 for(const [width,height] of [[320,740],[390,844],[820,1180],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height},acceptDownloads:true});const page=await context.newPage();
  page.on('pageerror',e=>errors.push({width,message:e.message}));page.on('request',req=>{if(/openaec|open-stl-3dmap-studio|fonts\.googleapis|fonts\.gstatic|unpkg/.test(req.url()))inheritedRequests.push(req.url());});
  await page.route('**/api/search?*',route=>route.fulfill({json:{results:[{label:'Utrecht fixture',type:'City',lat:52.0885,lon:5.117},{label:'Utrecht second',type:'Street',lat:52.088,lon:5.116}]}}));
  await page.route('**/api/area',route=>route.fulfill({json:fixture.area}));
  await page.route('**/api/build',route=>{const body=route.request().postDataJSON();return body.choose_dir?route.fulfill({status:409,json:{detail:'Cancelled.'}}):route.fulfill({json:fixture.build});});
  await page.route('**/api/export-dir/pick',route=>route.fulfill({json:{path:'D:/Selected exports',changed:true}}));
  await page.route('**/api/download/fixture/*',route=>route.fulfill({body:fs.readFileSync(path.join(out,'exports',decodeURIComponent(route.request().url().split('/').pop()))),headers:{'Content-Type':'application/octet-stream','Content-Disposition':'attachment'}}));
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('html').getAttribute('data-theme'),'spanvision-mono');
  assert.equal(await page.locator('#map').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(27, 27, 27)');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.doesNotMatch(await page.locator('body').innerText(),/OpenAEC|Open STL|Kaart Bouwer/);
  await page.screenshot({path:path.join(out,`workspace-${width}.png`)});record('fresh-mono-layout',width);
  await page.getByRole('button',{name:'About',exact:true}).click();const dialog=page.getByRole('dialog');const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=height);
  await page.screenshot({path:path.join(out,`about-${width}.png`)});await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'btn-about');record('about-focus-and-notices',width);
  const settings=async()=>{if(width<768)await page.getByRole('button',{name:'Settings',exact:true}).click();};await settings();
  await page.locator('#search').fill('Utrecht');await page.locator('#location-0').waitFor();await page.locator('#search').press('ArrowUp');assert.equal(await page.locator('#search').getAttribute('aria-activedescendant'),'location-1');await page.locator('#search').press('ArrowDown');assert.equal(await page.locator('#search').getAttribute('aria-activedescendant'),'location-0');await page.locator('#search').press('Enter');record('keyboard-location-suggestions',width);
  await settings();await page.getByRole('button',{name:'Area around map center',exact:true}).click();await page.getByRole('button',{name:'Load map data',exact:true}).click();await page.waitForFunction(()=>!document.getElementById('sec-design').inert);
  await page.waitForFunction(()=>!pendingAreaFit&&!map._animatingZoom&&!map._panAnim?._inProgress&&map.getSize().x>0&&map.getBounds().contains(areaRect.getBounds()));
  assert.ok(await page.evaluate(()=>map.getBounds().contains(areaRect.getBounds())&&map.getZoom()<20));
  await settings();await page.locator('#btn-draw').click();const canvasBox=await page.locator('#map').boundingBox();await page.mouse.move(canvasBox.x+70,canvasBox.y+70);await page.mouse.down();await page.mouse.move(canvasBox.x+150,canvasBox.y+150,{steps:6});await page.mouse.up();assert.equal(await page.locator('#btn-draw').getAttribute('aria-pressed'),'false');assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('3dmaps.project')).bbox_wgs84));record('draw-area-boundary',width);
  await settings();await page.locator('#btn-mode-box').click();await page.mouse.move(canvasBox.x+50,canvasBox.y+50);await page.mouse.down();await page.mouse.move(canvasBox.x+170,canvasBox.y+170,{steps:6});await page.mouse.up();await settings();await page.locator('#btn-mode-click').click();assert.equal(await page.locator('#btn-mode-click').getAttribute('aria-pressed'),'true');record('drag-box-and-click-mode',width);
  await page.screenshot({path:path.join(out,`map-loaded-${width}.png`)});
  await settings();await page.locator('.building-list-wrap summary').click();await page.locator('#building-list input').first().check();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('3dmaps.project')).hidden_building_ids.length),1);await page.getByRole('button',{name:'Show all buildings',exact:true}).click();assert.equal(await page.locator('#building-list input:checked').count(),0);record('hide-and-restore-buildings',width);
  await page.locator('#design-file').setInputFiles(path.join(out,'exports','fixture_1_base.stl'));await page.locator('#design-controls').waitFor({state:'visible'});
  await page.locator('#design-lon').fill('5.117');await page.locator('#design-lon').press('Tab');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('3dmaps.project')).design.anchor_lonlat[0]),5.117);
  await page.locator('#design-rot').fill('45');await page.locator('#design-rot').press('Tab');await page.locator('#design-slot').selectOption('3');await page.getByRole('button',{name:'Place at map center',exact:true}).click();record('real-stl-import-and-keyboard-placement',width);
  await page.locator('#set-shrubs').check();await page.locator('#slots select[data-key=shrubs]').selectOption('5');assert.ok(await page.locator('#slot-warn').isVisible());
  await page.locator('#btn-pick-dir').click();await page.waitForFunction(()=>document.getElementById('export-dir').value==='D:/Selected exports');
  await page.locator('#btn-build-as').click();await page.getByText('Save cancelled.',{exact:true}).waitFor();
  await page.locator('#btn-build').click();await page.locator('.files a').first().waitFor();const downloadPromise=page.waitForEvent('download');await page.locator('.files a').first().click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'fixture.3mf');record('folder-choice-cancel-generate-download',width);
  await page.getByRole('button',{name:'Remove design',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('3dmaps.project')).design.filename==='');
  await page.locator('#theme-select').selectOption('light');await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await page.locator('#theme-select').selectOption('spanvision-mono');await settings();await page.locator('#set-size').fill('170');await page.locator('#set-size').press('Tab');await page.reload();assert.equal(await page.locator('#set-size').inputValue(),'170');record('theme-and-project-persistence',width);
  await settings();await page.screenshot({path:path.join(out,`settings-${width}.png`)});await context.close();
 }
 for(const saved of ['dark','light','']){const context=await browser.newContext();await context.addInitScript(value=>localStorage.setItem('oststl.theme',value),saved);const page=await context.newPage();await page.goto(base);assert.equal(await page.locator('#theme-select').inputValue(),saved);assert.equal(await page.evaluate(()=>localStorage.getItem('oststl.theme')),saved);await context.close();record('legacy-theme-'+(saved||'system'));}
 const offline=await browser.newContext();await offline.route('https://**',route=>route.abort());const page=await offline.newPage();await page.goto(base);assert.ok(await page.locator('#map').isVisible());assert.ok(await page.evaluate(()=>typeof L.map==='function'));await page.evaluate(()=>document.fonts.ready);await offline.close();record('interface-without-cdn-access');
 assert.deepEqual(inheritedRequests,[]);assert.deepEqual(errors,[]);
}catch(error){errors.push({message:error.stack});process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({results,errors,inheritedRequests},null,2));await browser.close();}
console.log(`${results.length} STL scenarios checked; ${errors.length} errors. See qa/stl/browser-results.json.`);
