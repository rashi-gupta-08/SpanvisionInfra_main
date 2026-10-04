import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root,brand } from './common.mjs';
const out=path.join(root,'qa/suite/screenshots');fs.mkdirSync(out,{recursive:true});
const base=`http://127.0.0.1:${brand.hub.port}`;
const results=[],errors=[],requests=[];
const onlyWidth=process.argv.find(arg=>arg.startsWith('--width='))?.split('=')[1];
const onlyModules=process.argv.find(arg=>arg.startsWith('--modules='))?.split('=')[1].split(',');
const browser=await chromium.launch({channel:'msedge',headless:true});
const record=(scenario,details={})=>results.push({scenario,...details});
const upstream=/Open Pointcloud Studio|OpenNDStudio|Open Geotechniek Studio|Open Speech Studio|Impertio|OpenAEC|Open PDF Studio|Open Calc Studio|Open CAD Studio|Monty IFC Viewer/i;
try {
 for(const [width,height] of [[390,844],[820,1180],[1440,900],[320,740]].filter(item=>!onlyWidth||item[0]===Number(onlyWidth))){
  const page=await browser.newPage({viewport:{width,height}});page.setDefaultTimeout(90000);
  page.on('pageerror',error=>errors.push({width,message:error.message}));
  page.on('request',req=>{if(/openaec|open-aec\.(com|org)|open-feedback/i.test(req.url()))requests.push(req.url());});
  for(const route of ['landing','modules','login','signup','account']){
    await page.goto(`${base}/#${route}`);await page.locator('main').waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} overflows at ${width}`);
    assert.doesNotMatch(await page.locator('main').innerText(),upstream);
    if(['login','signup','account'].includes(route)) {
      const controls=page.locator('main input,main select');
      for(let index=0;index<await controls.count();index++) {
        const style=await controls.nth(index).evaluate(element=>({background:getComputedStyle(element).backgroundColor,height:element.getBoundingClientRect().height}));
        assert.equal(style.background,'rgb(32, 32, 32)',`${route} control lacks the shared grayscale style`);
        assert.ok(style.height>=44,`${route} control has a small touch target`);
      }
    }
    if(['landing','modules'].includes(route)) {
      assert.equal(await page.locator('main h1').innerText(),brand.hub.organization);
      assert.equal(await page.locator('.company-catalog .module-card').count(),brand.modules.length);
      assert.equal(await page.title(),`${brand.hub.organization} — Engineering tools`);
      assert.doesNotMatch(await page.locator('body').innerText(),/geptechniek workspace/i);
      for(const module of brand.modules) {
        const heading=page.locator(`[data-module=${module.id}] h3`);
        assert.equal(await heading.innerText(),module.label);
      }
    }
    await page.screenshot({path:path.join(out,`hub-${route}-${width}.png`),fullPage:route==='landing'});
    record('hub-layout',{route,width});
  }
  await page.goto(base+'/#landing');
  await page.getByRole('button',{name:'Explore scan & OCR',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();
  const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=height+1);
  await dialog.getByRole('button',{name:'Preview OCR',exact:true}).focus();await page.keyboard.press('Tab');
  assert.ok(await page.evaluate(()=>document.activeElement.closest('dialog')),'scan focus escaped');
  await page.screenshot({path:path.join(out,`hub-scan-${width}.png`)});
  await dialog.getByRole('button',{name:'Preview OCR',exact:true}).click();
  await dialog.getByText('Recognizing text…',{exact:false}).waitFor();
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await dialog.waitFor({state:'hidden'});
  assert.equal((await page.evaluate(()=>document.activeElement.textContent)).trim(),'Explore scan & OCR');
  await page.getByRole('button',{name:'Explore scan & OCR',exact:true}).click();
  await dialog.getByRole('button',{name:'Preview OCR',exact:true}).click();
  await dialog.getByText('Preview complete.',{exact:false}).waitFor();
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  record('scan-focus-cancel-complete',{width});
  await page.goto(base+'/#signup');
  await page.getByRole('button',{name:'Preview account',exact:true}).click();await page.getByRole('alert').waitFor();
  await page.getByRole('textbox',{name:'Full name'}).fill('Taylor Reviewer');
  await page.getByRole('textbox',{name:'Email address'}).fill('review@example.test');
  await page.locator('input[name=password]').fill('preview-only-123');
  await page.getByRole('button',{name:'Preview account',exact:true}).click();await page.waitForURL('**#account');
  await page.getByRole('textbox',{name:'Display name'}).fill('Updated Reviewer');
  await page.getByRole('button',{name:'Save preview changes',exact:false}).click();await page.getByRole('status').waitFor();
  assert.equal(await page.evaluate(()=>localStorage.length),0);
  await page.reload();assert.equal(await page.getByRole('textbox',{name:'Display name'}).inputValue(),'Alex Morgan');
  record('account-validation-memory-only',{width});
  await page.goto(base+'/#modules');
  const links=page.locator('.module-card a[target="_blank"]');
  for(let i=0;i<await links.count();i++)assert.equal(await links.nth(i).getAttribute('rel'),'noopener noreferrer');
  for(const module of (process.argv.includes("--hub-only") ? [] : brand.modules.filter(module=>!onlyModules||onlyModules.includes(module.id)))){
    const item=await (await page.request.get(base+'/__suite/status')).json();
    if(!item.modules.find(m=>m.id===module.id).available){assert.ok(await page.locator(`[data-module=${module.id}] button:disabled`).isVisible());record('module-unavailable-state',{module:module.id,width});continue;}
    const editor=await browser.newPage({viewport:{width,height}});
    editor.on('pageerror',error=>errors.push({module:module.id,width,message:error.message}));
    await editor.goto(`http://127.0.0.1:${module.port}${module.path}`,{waitUntil:'domcontentloaded',timeout:60000});
    if(module.id==='cad'){await editor.locator('#loading').waitFor({state:'hidden',timeout:120000});}
    else await editor.waitForTimeout(1200);
    assert.ok(await editor.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${module.label} overflows at ${width}`);
    if(module.id!=='cad')assert.doesNotMatch(await editor.locator('body').innerText(),upstream);
    await editor.screenshot({path:path.join(out,`${module.id}-${width}.png`)});record('editor-layout',{module:module.id,width});await editor.close();
  }
  await page.close();
 }
 assert.deepEqual(requests,[],'Inherited hosted service request');
 assert.deepEqual(errors,[],'Browser errors');
}catch(error){errors.push({message:error.message});process.exitCode=1;}
finally{fs.writeFileSync(path.join(root,'qa/suite/browser-results.json'),JSON.stringify({results,errors,requests},null,2)+'\n');await browser.close();}
console.log(`${results.length} scenarios checked; ${errors.length} errors. See qa/suite/browser-results.json.`);
