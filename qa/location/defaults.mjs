import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {brand,root} from '../../branding/common.mjs';
import {waitForPreview} from './ready.mjs';
await waitForPreview();
const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
const selected=process.argv.find(arg=>arg.startsWith('--modules='))?.slice(10).split(',');
try{
 for(const module of [{id:'hub',port:4230,path:'/'},...brand.modules].filter(m=>!selected||selected.includes(m.id))){
  const context=await browser.newContext();const page=await context.newPage();
  await page.addInitScript(()=>{
   for(const key of ['ifc-view.theme','ocs-theme','ops-theme','fem2d-theme','oststl.theme','ofs_theme','spanvision:vision-bim-validator:theme'])localStorage.setItem(key,'light');
   for(const key of ['spanvision.cad.settings','spanvision-pdf-workspace.preferences','pdfEditorPreferences','ocs:settings','ofs-settings','spanvision-calculation-preferences','spanvision_speech_settings'])localStorage.setItem(key,JSON.stringify({theme:key==='spanvision.cad.settings'?{name:'Light'}:'light'}));
   localStorage.setItem('spanvision.settings.uiTheme',JSON.stringify('light'));localStorage.setItem('ogs:theme',JSON.stringify('light'));
   localStorage.setItem('spanvision.pointcloud.appearance.v1',JSON.stringify({version:1,uiTheme:'light'}));
  });
  try{
   const url=`http://127.0.0.1:${module.port}${module.path}`;await page.goto(url);
   const selector=page.getByRole('combobox',{name:'Color mode',exact:true});await selector.waitFor({timeout:60000});await page.waitForTimeout(module.id==='cad'?2000:800);
   assert.equal(await page.locator('html').getAttribute('data-sv-mode'),'dark');assert.equal(await selector.inputValue(),'dark');
   assert.equal(await page.locator('html').getAttribute('data-theme'),'spanvision-mono');
   await selector.selectOption('light');await page.goto(url);await selector.waitFor();assert.equal(await selector.inputValue(),'light');
   results.push({id:module.id,passed:true});console.log(`PASS ${module.id}: Dark default, explicit Light remembered`);
  }catch(error){results.push({id:module.id,passed:false,error:error.message});console.error(`FAIL ${module.id}: ${error.message}`);}
  finally{await context.close();}
 }
}finally{await browser.close();const file=path.join(root,'qa/location/defaults.json');const previous=selected&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];fs.writeFileSync(file,JSON.stringify([...previous.filter(r=>!results.some(n=>n.id===r.id)),...results],null,2));}
assert.ok(results.every(r=>r.passed),'Default appearance checks failed');
