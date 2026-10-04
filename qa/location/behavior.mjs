import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {root} from '../../branding/common.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
try{
 for(const scenario of ['late-response','retry-denied','retry-timeout','unsupported','saved-project']){
  const context=await browser.newContext({viewport:{width:1440,height:950}});const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route(/https:\/\/(?:\w+\.)?(?:tile.openstreetmap.org|service.pdok.nl)\//,route=>route.abort());
  await page.addInitScript(scenario=>{
   window.locationCalls=0;
   if(scenario==='saved-project')localStorage.setItem('3dmaps.project',JSON.stringify({bbox_wgs84:[4.88,52.36,4.9,52.38]}));
   Object.defineProperty(navigator,'geolocation',{value:scenario==='unsupported'?undefined:{getCurrentPosition(success,error){
    const calls=++window.locationCalls;
    if(scenario==='retry-denied'&&calls===1)return error({code:1});
    if(scenario==='retry-timeout'&&calls===1)return error({code:3});
    setTimeout(()=>success({coords:{latitude:51.5,longitude:-.12,accuracy:20}}),scenario==='late-response'?1200:0);
   }}});
  },scenario);
  try{
   await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});const control=page.locator('#map .sv-map-location');await control.waitFor();
   if(scenario==='late-response'){
    await page.evaluate(()=>map.setView([35.68,139.69],13));await page.waitForTimeout(1500);
    assert.equal(await control.getAttribute('data-location-state'),'manual');assert.ok(Math.abs((await page.evaluate(()=>map.getCenter())).lat-35.68)<.0001);
    await control.getByRole('button',{name:'Use my location'}).click();await page.waitForFunction(()=>document.querySelector('.sv-map-location')?.dataset.locationState==='located');
    assert.ok(Math.abs((await page.evaluate(()=>map.getCenter())).lat-51.5)<.0001);
   }else if(scenario==='saved-project'){
    await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>window.locationCalls),0);
    const center=await page.evaluate(()=>map.getCenter());assert.ok(center.lat>52&&center.lat<53&&center.lng>4&&center.lng<5);
    assert.equal(await control.getAttribute('data-location-state'),'ready');
   }else{
    await page.waitForFunction(()=>document.querySelector('.sv-map-location')?.dataset.locationState==='unavailable');
    assert.match(await control.innerText(),scenario==='unsupported'?/unavailable in this browser/:scenario==='retry-denied'?/permission denied/:/timed out/);
    assert.ok(await control.getByRole('button',{name:'Use my location'}).isEnabled());
    if(scenario!=='unsupported'){await control.getByRole('button',{name:'Use my location'}).click();await page.waitForFunction(()=>document.querySelector('.sv-map-location')?.dataset.locationState==='located');}
   }
   assert.deepEqual(errors,[]);results.push({scenario,passed:true});console.log(`PASS ${scenario}`);
  }catch(error){results.push({scenario,passed:false,error:error.message});console.error(`FAIL ${scenario}: ${error.message}`);}
  finally{await context.close();}
 }
}finally{await browser.close();fs.writeFileSync(path.join(root,'qa/location/behavior.json'),JSON.stringify(results,null,2));}
assert.ok(results.every(r=>r.passed),'Location behavior checks failed');
