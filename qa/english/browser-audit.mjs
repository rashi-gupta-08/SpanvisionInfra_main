import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const brand=JSON.parse(fs.readFileSync('branding/brand.json','utf8'));
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({locale:'nl-NL',viewport:{width:1440,height:1000}});
await context.addInitScript(()=>{
 for(const key of ['i18nextLng','ofs_lang','ops-locale','ops-docs-locale','locale','fem2d-locale','field_language'])localStorage.setItem(key,'nl');
 localStorage.setItem('ogs:language',JSON.stringify('nl'));
 localStorage.setItem('spanvision-calculation-preferences',JSON.stringify({language:'nl'}));
 localStorage.setItem('spanvision_speech_settings',JSON.stringify({ui_language:'nl',language:'nl',auto_paste:false}));
 localStorage.setItem('ocs:settings',JSON.stringify({locale:'nl',reportLocale:'nl',theme:'spanvision-mono'}));
});
const results={};
for(const m of brand.modules){
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{await page.goto(`http://127.0.0.1:${m.port}${m.path}`,{waitUntil:'domcontentloaded',timeout:25000});await page.waitForTimeout(1400);
 if(m.id==='cad')await page.locator('canvas').first().waitFor({timeout:45000});
 results[m.id]={lang:await page.locator('html').getAttribute('lang'),title:await page.title(),text:await page.locator('body').innerText(),options:await page.locator('select option').allTextContents(),errors};
 }catch(error){results[m.id]={error:String(error),errors};}
 await page.close();console.log(m.id+': '+results[m.id].lang+' '+errors.length+' errors');
}
fs.writeFileSync('qa/english/browser-audit.json',JSON.stringify(results,null,2));
await browser.close();
for(const m of brand.modules){assert.match(results[m.id].lang||'',/^en(?:-|$)/,`${m.id} did not start in English`);assert.deepEqual(results[m.id].errors,[],`${m.id} had browser errors`);assert.ok(!results[m.id].error,`${m.id} failed to load`);assert.doesNotMatch(results[m.id].options.join('\n'),/Nederlands|Dutch|Deutsch|Français|Chinese|中文/,`${m.id} exposes another language`);}
console.log('PASS: all 16 tools use English with a Dutch browser locale and saved Dutch preferences.');
