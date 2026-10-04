import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 for(const module of [
  {id:'ifc',port:3005,path:'/',key:'ifc-view.canvas-color',value:'#202020'},
  {id:'bim',port:4260,path:'/viewer',key:'spanvision:vision-bim-validator:canvasColor',value:'#123456'},
  {id:'pointcloud',port:4250,path:'/',key:'spanvision.pointcloud.appearance.v1',value:JSON.stringify({version:1,uiTheme:'spanvision-mono',canvasBackground:'#123456'})},
 ]){
  const context=await browser.newContext();await context.addInitScript(({key,value})=>localStorage.setItem(key,value),module);
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${module.port}${module.path}?appearance=light`);
  const control=page.getByRole('combobox',{name:'Color mode',exact:true});await control.waitFor();await page.waitForTimeout(500);
  for(const mode of ['dark','light']){
   await control.selectOption(mode);await page.waitForTimeout(250);
   const value=await page.evaluate(key=>localStorage.getItem(key),module.key);
   if(module.id==='pointcloud')assert.equal(JSON.parse(value).canvasBackground,'#123456');else assert.equal(value,module.value);
  }
  assert.deepEqual(errors,[]);console.log(`PASS ${module.id}: custom canvas color retained in both modes`);await context.close();
 }
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4230/?appearance=light#account');
 const header=page.getByRole('combobox',{name:'Color mode',exact:true});await header.waitFor();
 const account=page.getByRole('combobox',{name:'Interface theme',exact:true});await account.selectOption('dark');
 assert.equal(await header.inputValue(),'dark');await header.selectOption('light');assert.equal(await account.inputValue(),'light');
 console.log('PASS hub: account settings and header mode switch stay synchronized');
} finally {await browser.close();}
