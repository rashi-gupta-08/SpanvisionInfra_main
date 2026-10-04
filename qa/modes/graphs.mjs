import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {root} from '../../branding/common.mjs';
const out=path.join(root,'qa/modes/repairs');
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[];
const modes=async(page,id,canvas)=>{
 const control=page.getByRole('combobox',{name:'Color mode',exact:true});const records=[];
 for(const mode of ['light','dark','light']){
  await control.selectOption(mode);await page.waitForTimeout(1000);
  const box=await canvas.boundingBox();assert.ok(box.width>350&&box.height>250);
  const buffer=await canvas.screenshot({path:path.join(out,`${id}-graph-${mode}.png`)});
  const {data,info}=await sharp(buffer).removeAlpha().raw().toBuffer({resolveWithObject:true});
  let colorPixels=0,inkPixels=0;for(let i=0;i<data.length;i+=info.channels){
   const lum=(data[i]+data[i+1]+data[i+2])/3;
   if(Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])>55)colorPixels++;
   if(mode==='light'?lum<210:lum>70)inkPixels++;
  }
  assert.ok(id==='fem'?colorPixels>300:inkPixels>2000,`${id}/${mode}: model or result graph is absent (${inkPixels} ink pixels)`);records.push({mode,colorPixels,inkPixels});
 }
 return records;
};
try{
 for(const id of ['fem','bim','ifc']){
  const page=await browser.newPage({viewport:{width:1440,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   const ports={fem:4270,bim:4260,ifc:3005};await page.goto(`http://127.0.0.1:${ports[id]}${id==='bim'?'/viewer':'/'}?appearance=light`);
   await page.getByRole('combobox',{name:'Color mode',exact:true}).waitFor();
   if(id==='fem'){
    await page.getByRole('button',{name:'Fit',exact:true}).first().click();
    await page.getByRole('button',{name:'Analyze',exact:true}).click();
    await page.getByRole('button',{name:'Solve',exact:true}).click();await page.getByText('Solved',{exact:true}).waitFor();
    await page.getByText('Bending Moment (M)',{exact:true}).click();
    assert.match(await page.locator('body').innerText(),/Max stress\s+[\d.]+/);
   }else{
    await page.locator('input[type=file][accept*=".ifc"]').first().setInputFiles(path.join(root,'ifc-view/demo/Spanvision-IFC-View-Demo.ifc'));
    await page.waitForTimeout(3500);
    if(id==='bim')await page.locator('.canvas-welcome').waitFor({state:'hidden'});
    else await page.getByText('Drag your IFC file here',{exact:true}).waitFor({state:'hidden'});
   }
   const canvas=page.locator('canvas').filter({visible:true}).first();await canvas.waitFor();
   const records=await modes(page,id,canvas);assert.deepEqual(errors,[]);results.push({id,passed:true,records});console.log(`PASS ${id}: loaded geometry/results visible in both modes`);
  }catch(error){await page.screenshot({path:path.join(out,`${id}-graph-failure.png`)});results.push({id,passed:false,error:error.message});console.error(`FAIL ${id}: ${error.message}`);}
  finally{await page.close();}
 }
}finally{await browser.close();fs.writeFileSync(path.join(out,'graphs.json'),JSON.stringify(results,null,2));}
assert.ok(results.every(r=>r.passed),'Loaded canvas checks failed');
