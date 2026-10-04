import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { brand, fingerprint, digest, root } from '../../branding/common.mjs';
import path from 'node:path';

const out=path.join(root,'qa/modes');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[];
const modules=[{id:'hub',port:brand.hub.port,path:'/',directory:'suite-hub',dist:'dist'},...brand.modules];
const selected=process.argv.find(arg=>arg.startsWith('--modules='))?.slice(10).split(',');
const widths=process.argv.includes('--desktop-only')?[1440]:[1440,390];
const mean=async buffer=>{
 // Include the entire viewport: a center crop of a narrow screen only samples the map.
 const {data,info}=await sharp(buffer).resize(160,100,{fit:'fill'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
 let total=0;for(let i=0;i<data.length;i+=info.channels)total+=(data[i]+data[i+1]+data[i+2])/3;
 return total/(info.width*info.height);
};
const observe=page=>page.evaluate(()=>({
 mode:document.documentElement.dataset.svMode,
 theme:document.documentElement.dataset.theme,
 saved:localStorage.getItem('spanvision:color-mode'),
 language:document.documentElement.lang,
 text:document.body.innerText.replace(/◐\s*Light\s*Dark/g,''),
 canvasCount:document.querySelectorAll('canvas').length,
 motion:document.documentElement.dataset.svMotion,
 motionElements:document.querySelectorAll('[data-sv-motion-element]').length,
 animatedCanvases:document.querySelectorAll('canvas[data-sv-motion-element]').length,
}));
try {
 for(const module of modules.filter(m=>!selected||selected.includes(m.id))){
  const stamp=JSON.parse(fs.readFileSync(path.join(root,module.directory,module.dist,'suite-build.json'),'utf8'));
  assert.equal(stamp.sourceFingerprint,fingerprint(module),`${module.id}: current build`);
  assert.equal(stamp.brandDigest,digest(module.id==='hub'?undefined:module),`${module.id}: current branding`);
  for(const width of widths){
   const context=await browser.newContext({viewport:{width,height:950},locale:'nl-NL'});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const base=`http://127.0.0.1:${module.port}${module.path}`;
   try {
   await page.goto(base+'?appearance=light',{waitUntil:'domcontentloaded'});
   const control=page.getByRole('combobox',{name:'Color mode',exact:true});
   await control.waitFor({state:'visible',timeout:45000});
   if(module.id==='cad')await page.locator('canvas').first().waitFor({state:'visible',timeout:45000});
   await page.waitForTimeout(module.id==='cad'?1800:1200);
   const light=await observe(page);
   assert.equal(light.mode,'light');assert.equal(light.theme,'light');assert.match(light.language,/^en(?:-|$)/);
   assert.equal(light.motion,'full',`${module.id}: shared motion initialized`);
   assert.ok(light.motionElements>0,`${module.id}: interface motion discovered`);
   assert.equal(light.animatedCanvases,0,`${module.id}: drawing canvases keep their geometry`);
   const box=await control.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1,`${module.id}: switch inside viewport at ${width}`);
   assert.equal(await control.inputValue(),'light');
   if(module.id==='hub'){
    await page.getByRole('link',{name:'Tools',exact:true}).click();
    const links=await page.locator('a[aria-label^="Open "][target="_blank"]').evaluateAll(nodes=>nodes.map(a=>a.href));
    assert.ok(links.length>=16);assert.ok(links.every(url=>new URL(url).searchParams.get('appearance')==='light'));
   }
   const lightImage=await page.screenshot({path:path.join(out,`${module.id}-${width}-light.png`)});
   await control.selectOption('dark');await page.waitForTimeout(module.id==='cad'?1200:600);
   const dark=await observe(page);
   assert.equal(dark.mode,'dark');assert.equal(dark.theme,'spanvision-mono');assert.equal(dark.saved,'dark');
   assert.equal(dark.canvasCount,light.canvasCount,`${module.id}: retains drawing views`);
   const darkImage=await page.screenshot({path:path.join(out,`${module.id}-${width}-dark.png`)});
   const luminance={light:await mean(lightImage),dark:await mean(darkImage)};
   assert.ok(luminance.light-luminance.dark>25,`${module.id}: visible theme change (${JSON.stringify(luminance)})`);
   await page.reload({waitUntil:'domcontentloaded'});await control.waitFor({state:'visible'});await page.waitForTimeout(module.id==='cad'?1800:600);
   assert.equal((await observe(page)).mode,'dark',`${module.id}: remembers choice after reload`);
   await page.goto(base,{waitUntil:'domcontentloaded'});await control.waitFor({state:'visible'});await page.waitForTimeout(module.id==='cad'?1800:600);
   assert.equal((await observe(page)).mode,'dark',`${module.id}: remembers choice without link parameter`);
   await control.selectOption('light');await page.waitForTimeout(module.id==='cad'?1000:400);
   assert.equal((await observe(page)).theme,'light');
   if(module.id==='cad2d' && await page.locator('.web-start-overlay').isVisible() && await page.getByRole('button',{name:/New drawing/}).first().isVisible()){
    await page.getByRole('button',{name:/New drawing/}).first().click();
    await page.locator('.web-start-overlay').waitFor({state:'hidden'});
    await control.waitFor({state:'visible'});await control.selectOption('dark');await page.waitForTimeout(400);
    assert.equal((await observe(page)).theme,'spanvision-mono');
   }
   if(module.id==='hub'){
    await page.getByRole('link',{name:'Tools',exact:true}).click();await control.selectOption('dark');
    const links=await page.locator('a[aria-label^="Open "][target="_blank"]').evaluateAll(nodes=>nodes.map(a=>a.href));
    assert.ok(links.every(url=>new URL(url).searchParams.get('appearance')==='dark'));
   }
   assert.deepEqual(errors,[],`${module.id}: no browser errors`);
   results.push({module:module.id,width,passed:true,luminance});console.log(`PASS ${module.id} at ${width}: both modes, saved preference, English, visible switch`);
   } catch(error) {
    results.push({module:module.id,width,passed:false,error:String(error)});console.log(`FAIL ${module.id} at ${width}: ${error.message}`);
   } finally {await context.close();}
  }
 }
} finally {
 const resultFile=path.join(out,'verification-results.json');
 const previous=selected&&fs.existsSync(resultFile)?JSON.parse(fs.readFileSync(resultFile,'utf8')):[];
 const keys=new Set(results.map(result=>`${result.module}:${result.width}`));
 fs.writeFileSync(resultFile,JSON.stringify([...previous.filter(result=>!keys.has(`${result.module}:${result.width}`)),...results],null,2));
 await browser.close();
}
assert.ok(results.every(result=>result.passed),'Some appearance scenarios failed; see qa/modes/verification-results.json.');
console.log(`PASS ${results.length} appearance scenarios.`);
