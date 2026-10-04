import fs from 'node:fs';
import { chromium } from 'playwright';
import {brand} from '../../branding/common.mjs';
fs.mkdirSync('qa/modes',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const results={};
for(const m of brand.modules.filter(m=>!process.argv.includes('--first')||['cad','cad2d','bim','pdf','ifc'].includes(m.id))){
 const page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try {await page.goto(`http://127.0.0.1:${m.port}${m.path}?appearance=light`,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(m.id==='cad'?10000:2500);
 results[m.id]=await page.evaluate(()=>({mode:document.documentElement.dataset.svMode,theme:document.documentElement.dataset.theme,control:!!document.querySelector('#sv-color-mode'),body:getComputedStyle(document.body).backgroundColor,header:getComputedStyle(document.querySelector('.titlebar,.preview-header,.brand-header,header')||document.body).backgroundColor,selectors:[...document.querySelectorAll('header,[class*="titlebar"],[class*="header"]')].slice(0,10).map(e=>e.tagName+'.'+e.className),text:document.body.innerText.slice(0,110)}));results[m.id].errors=errors;
 await page.screenshot({path:`qa/modes/${m.id}-light.png`});
 if(await page.locator('#sv-color-mode').count()){await page.locator('#sv-color-mode').selectOption('dark');await page.waitForTimeout(500);results[m.id].dark=await page.evaluate(()=>({mode:document.documentElement.dataset.svMode,theme:document.documentElement.dataset.theme,body:getComputedStyle(document.body).backgroundColor}));await page.screenshot({path:`qa/modes/${m.id}-dark.png`});}
 }catch(e){results[m.id]={error:String(e),errors};}
 console.log(m.id,JSON.stringify(results[m.id]));await page.close();
}
fs.writeFileSync('qa/modes/probe-results.json',JSON.stringify(results,null,2));await browser.close();
