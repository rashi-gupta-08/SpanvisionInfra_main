import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { root, brand } from '../../branding/common.mjs';

const out=path.join(root,'qa/modes/repairs');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const selected=process.argv.slice(2);
const results=[];
async function gridMetrics(buffer) {
 const {data,info}=await sharp(buffer).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const hist=new Map();
 for(let i=0;i<data.length;i+=info.channels){const key=[data[i],data[i+1],data[i+2]].join(',');hist.set(key,(hist.get(key)||0)+1);}
 const background=[...hist.entries()].sort((a,b)=>b[1]-a[1])[0][0].split(',').map(Number);
 const bg=background.reduce((a,b)=>a+b)/3;
 const counts=[];
 for(const fraction of [.19,.37,.53,.71,.89]){
  const y=Math.floor(info.height*fraction);let edges=0,previous=false;
  for(let x=0;x<info.width;x++){
   const i=(y*info.width+x)*info.channels;
   const rgb=[data[i],data[i+1],data[i+2]];
   const delta=Math.abs(rgb.reduce((a,b)=>a+b)/3-bg);
   const line=delta>5&&delta<110&&Math.max(...rgb)-Math.min(...rgb)<40;
   if(line&&!previous)edges++;previous=line;
  }
  counts.push(edges);
 }
 return {background,gridLines:counts.sort((a,b)=>a-b)[2]};
}
try {
 for(const module of brand.modules.filter(m=>!selected.length||selected.includes(m.id))){
  const context=await browser.newContext({viewport:{width:1440,height:950}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try {
   await page.goto(`http://127.0.0.1:${module.port}${module.path}?appearance=light`,{waitUntil:'domcontentloaded'});
   const control=page.getByRole('combobox',{name:'Color mode',exact:true});await control.waitFor({state:'visible',timeout:45000});
   await page.waitForTimeout(module.id==='cad'?2500:1000);
   if(module.id==='bim'){
    await page.getByRole('link',{name:'Open BIM workspace'}).click();await page.locator('.app-shell').waitFor();
   }
   if(module.id==='cad2d'){
    await page.getByRole('button',{name:/^New drawing/}).click();await page.locator('.web-start-overlay').waitFor({state:'hidden'});
    await page.waitForFunction(()=>!!window.cad);
   }
   if(module.id==='cad') {await page.mouse.click(804,298);await page.waitForTimeout(1200);}
   const modes=[];
   for(const mode of ['light','dark','light']){
    await control.selectOption(mode);await page.waitForTimeout(module.id==='cad'?1400:650);
    const accent=await page.evaluate(()=>{
     const s=getComputedStyle(document.documentElement);
     const value=s.getPropertyValue('--theme-accent').trim();
     const expected=s.getPropertyValue('--sv-text').trim();
     const colorful=[...document.querySelectorAll('button, .titlebar-title, .ribbon-group-label')].flatMap(el=>{
      if(el.getBoundingClientRect().y>205||!el.getBoundingClientRect().width)return [];
      const style=getComputedStyle(el);const found=[];
      for(const role of ['color','backgroundColor','borderBottomColor']){
       const rgb=style[role].match(/^rgb\((\d+), (\d+), (\d+)\)$/)?.slice(1).map(Number);
       if(rgb&&Math.max(...rgb)-Math.min(...rgb)>70)found.push({text:el.textContent.slice(0,45),role,value:style[role]});
      }
      return found;
     });
     return {value,expected,colorful};
    });
    assert.equal(accent.value,accent.expected,`${module.id}: common accent`);
    assert.deepEqual(accent.colorful,[],`${module.id}: toolbar retains a historic color: ${JSON.stringify(accent.colorful)}`);
    if(module.id==='bim'){
     const title=await page.locator('.titlebar-title').boundingBox();const buttons=await page.locator('.titlebar-controls').boundingBox();
     assert.ok(title.x+title.width<=buttons.x+1,'BIM title overlaps its controls');
    }
    let grid;
    if(['cad','cad2d','fem'].includes(module.id)){
     const canvas=page.locator('canvas').first();await canvas.waitFor({state:'visible'});
     const box=await canvas.boundingBox();
     const region=module.id==='cad'?{x:320,y:290,width:800,height:200}:{x:box.x+90,y:box.y+90,width:Math.min(400,box.width-180),height:180};
     grid=await gridMetrics(await page.screenshot({clip:region}));
     assert.ok(grid.gridLines>=3,`${module.id}/${mode}: grid is not visible (${JSON.stringify(grid)})`);
     const luminosity=grid.background.reduce((a,b)=>a+b)/3;
     assert.ok(mode==='light'?luminosity>200:luminosity<65,`${module.id}/${mode}: canvas does not follow mode`);
    }
    modes.push({mode,grid,accent:accent.value});
    await page.screenshot({path:path.join(out,`${module.id}-${mode}.png`)});
   }
   if(module.id==='cad2d'){
    await page.getByRole('button',{name:'Rectangle',exact:true}).first().click();
    const box=await page.locator('canvas').first().boundingBox();
    await page.mouse.click(box.x+210,box.y+210);await page.mouse.click(box.x+510,box.y+390);await page.keyboard.press('Escape');
    const shapes=await page.evaluate(()=>window.cad._entities.list());assert.equal(shapes[0].type,'rectangle');
    for(const mode of ['light','dark']){
     await control.selectOption(mode);await page.waitForTimeout(650);
     assert.deepEqual(await page.evaluate(()=>window.cad._entities.list()),shapes,'Mode switch changes geometry');
     const image=await page.screenshot({path:path.join(out,`cad2d-drawing-${mode}.png`),clip:{x:box.x+190,y:box.y+185,width:340,height:230}});
     const {data,info}=await sharp(image).removeAlpha().raw().toBuffer({resolveWithObject:true});
     let ink=0;for(let i=0;i<data.length;i+=info.channels){const lum=(data[i]+data[i+1]+data[i+2])/3;if(mode==='light'?lum<160:lum>125)ink++;}
     assert.ok(ink>300,`${mode}: rectangle ink not visible (${ink} pixels)`);
    }
   }
   assert.deepEqual(errors,[],'Browser errors');results.push({module:module.id,passed:true,modes});console.log(`PASS ${module.id}: shared accent, active canvas and mode switching`);
  }catch(error){await page.screenshot({path:path.join(out,`${module.id}-failure.png`)});results.push({module:module.id,passed:false,error:error.message});console.error(`FAIL ${module.id}: ${error.message}`);}
  finally{await context.close();}
 }
}finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await browser.close();}
assert.ok(results.every(r=>r.passed),'Appearance repairs need further work.');
