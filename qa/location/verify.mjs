import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {chromium} from 'playwright';
import {root} from '../../branding/common.mjs';
import {waitForPreview} from './ready.mjs';
await waitForPreview();
const out=path.join(root,'qa/location');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[];
const tile=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e8e9eb"/><path d="M0 0L256 256M0 120H256M120 0V256" stroke="#a6adb5" stroke-width="8"/></svg>')).png().toBuffer();
const specs=[
 {id:'geo-mini',port:4235,selector:'.mini-map'},
 {id:'geo-map',port:4235,selector:'.map-view-container',open:page=>page.getByRole('button',{name:'Map',exact:true}).click()},
 {id:'geo-drawing',port:4235,selector:'.tek-canvas',open:page=>page.getByRole('button',{name:'Site plan',exact:true}).click()},
 {id:'fem',port:4270,selector:'.proj-info-map-container .leaflet-container',open:async page=>{await page.getByRole('button',{name:'View',exact:true}).click();await page.locator('button[title="Project Settings"]').click();}},
 {id:'calculation',port:4280,selector:'.wind-area-leaflet'},
 {id:'pointcloud',port:4250,selector:'.bag3d-map-container',open:async page=>{await page.getByRole('button',{name:'Tools',exact:true}).click();await page.getByRole('button',{name:'3D BAG',exact:true}).click();}},
 {id:'stl',port:8765,selector:'#map'},
];
const selected=process.argv.find(a=>a.startsWith('--maps='))?.slice(7).split(',');
async function setup(spec,scenario,geo){
 const context=await browser.newContext({viewport:{width:1440,height:950},geolocation:geo,permissions:scenario==='allowed'?['geolocation']:[]});
 const page=await context.newPage();page.setDefaultTimeout(20000);const errors=[],tiles=[];page.on('pageerror',e=>errors.push(e.message));
 // Test map navigation without sending automated tile requests to public providers.
 await page.route(/https:\/\/(?:\w+\.)?(?:tile.openstreetmap.org|service.pdok.nl)\//,route=>{tiles.push(route.request().url());return route.fulfill({contentType:'image/png',body:tile});});
 if(scenario==='denied')await page.addInitScript(()=>Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(success,error){error({code:1});}}}));
 await page.goto(`http://127.0.0.1:${spec.port}/`);await page.getByRole('combobox',{name:'Color mode',exact:true}).waitFor();
 if(spec.open)await spec.open(page);
 const map=page.locator(spec.selector).first();await map.waitFor();const control=map.locator('.sv-map-location');await control.waitFor();
 return {context,page,map,control,errors,tiles};
}
try{
 for(const spec of specs.filter(s=>!selected||selected.includes(s.id)))for(const scenario of ['allowed','denied']){
  let session;
  try{
   const geo={latitude:13.0827,longitude:80.2707};session=await setup(spec,scenario,geo);const {page,map,control,errors,tiles}=session;
   if(scenario==='allowed'){
    await page.waitForFunction(selector=>document.querySelector(selector)?.querySelector('.sv-map-location')?.dataset.locationState==='located',spec.selector);
    await page.waitForTimeout(700);
    const center=await map.evaluate(n=>{const actual=n.matches('[data-map-latitude]')?n:n.querySelector('[data-map-latitude]');return {lat:Number(actual.dataset.mapLatitude),lng:Number(actual.dataset.mapLongitude)};});
    assert.ok(Math.abs(center.lat-geo.latitude)<.0001&&Math.abs(center.lng-geo.longitude)<.0001,`${spec.id}: wrong center ${JSON.stringify(center)}`);
    assert.ok(tiles.some(url=>url.includes('tile.openstreetmap.org/')),`${spec.id}: worldwide map tiles missing`);
    assert.equal(await page.locator('html').getAttribute('data-sv-mode'),'dark');
    for(const mode of ['light','dark']){
     await page.getByRole('combobox',{name:'Color mode',exact:true}).selectOption(mode);await page.waitForTimeout(250);
     const colors=await control.evaluate(n=>{const s=getComputedStyle(n);return {bg:s.backgroundColor,fg:s.color};});assert.notEqual(colors.bg,colors.fg);
     const attribution=map.locator('.leaflet-control-attribution');
     assert.ok(await attribution.isVisible());
     const attributionColors=await attribution.evaluate(n=>{const s=getComputedStyle(n);return {bg:s.backgroundColor,fg:s.color};});
     const brightness=value=>value.match(/[\d.]+/g).slice(0,3).reduce((sum,n)=>sum+Number(n),0)/3;
     assert.ok(Math.abs(brightness(attributionColors.bg)-brightness(attributionColors.fg))>60,`${spec.id}/${mode}: attribution contrast`);
     await map.screenshot({path:path.join(out,`${spec.id}-${mode}-mock-tiles.png`)});
    }
   }else{
    await page.waitForFunction(selector=>document.querySelector(selector)?.querySelector('.sv-map-location')?.dataset.locationState==='unavailable',spec.selector);
    assert.match(await control.innerText(),/permission denied/i);assert.ok(await control.getByRole('button',{name:'Use my location'}).isEnabled());
   }
   assert.deepEqual(errors,[]);results.push({id:spec.id,scenario,passed:true});console.log(`PASS ${spec.id}: ${scenario}`);
  }catch(error){results.push({id:spec.id,scenario,passed:false,error:error.message});console.error(`FAIL ${spec.id}/${scenario}: ${error.message}`);if(session)await session.page.screenshot({path:path.join(out,`${spec.id}-${scenario}-failure.png`)});}
  finally{await session?.context.close();}
 }
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
assert.ok(results.every(r=>r.passed),'Geographic map checks failed');
