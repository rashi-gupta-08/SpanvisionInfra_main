import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { root, brand } from '../../branding/common.mjs';
import { startBim } from '../../branding/bim.mjs';

const out=path.join(root,'qa/bim');
fs.mkdirSync(out,{recursive:true});
const bim=brand.modules.find(module=>module.id==='bim');
const hub=`http://127.0.0.1:${brand.hub.port}`;
const base=`http://127.0.0.1:${bim.port}`;
const results=[],errors=[];
const record=(scenario,details={})=>{results.push({scenario,passed:true,...details});console.log(`PASS ${scenario}`);};
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
page.setDefaultTimeout(45000);
page.on('pageerror',error=>errors.push(error.message));
const overflow=async target=>assert.ok(await target.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page has horizontal overflow');
try {
  const catalog=await(await page.request.get(hub+'/__suite/status')).json();
  for(const id of ['cad','cad2d','bim'])assert.equal(catalog.modules.find(module=>module.id===id)?.available,true,`${id} is unavailable`);
  const healthResponse=await page.request.get(base+'/__bim/status',{headers:{Origin:hub}});
  assert.equal(healthResponse.headers()['access-control-allow-origin'],hub);
  assert.equal((await healthResponse.json()).available,true);
  assert.equal(await startBim(bim),null,'The exact running build should be reused');
  record('CAD, 2D CAD and BIM are available; BIM backend can be reused');

  for(const width of [320,390,820,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto(hub+'/#landing');
    await page.locator('[data-module=bim] a').waitFor();
    for(const id of ['cad2d','bim']) {
      const module=brand.modules.find(item=>item.id===id);
      const link=page.locator(`[data-module=${id}]`).getByRole('link',{name:`Open ${module.label} in a new tab`,exact:true});
      assert.equal(await link.getAttribute('href'),`http://127.0.0.1:${module.port}${module.path}?appearance=dark`);
    }
    await overflow(page);
    await page.screenshot({path:path.join(out,`hub-${width}.png`)});
    await page.goto(hub+'/#modules');
    await page.locator('[data-module=bim] a').waitFor();
    await overflow(page);
    record('Main preview company catalog and tool cards',{width});
    await page.goto(base+'/home');
    await page.getByRole('link',{name:'Open BIM workspace'}).waitFor();
    await overflow(page);
    await page.screenshot({path:path.join(out,`bim-home-${width}.png`)});
    record('BIM landing page deep link',{width});
  }

  await page.setViewportSize({width:1440,height:900});
  await page.goto(hub+'/#modules');
  const pendingBim=page.waitForEvent('popup');
  await page.locator('[data-module=bim]').getByRole('link').click();
  const bimPage=await pendingBim;
  bimPage.on('pageerror',error=>errors.push(error.message));
  await bimPage.getByRole('link',{name:'Open BIM workspace'}).click();
  await bimPage.locator('.app-shell').waitFor();
  await bimPage.locator('input[accept=".ifc,.ifcx"]').setInputFiles(path.join(root,'ifc-view/demo/Spanvision-IFC-View-Demo.ifc'));
  await bimPage.getByText('Spanvision-IFC-View-Demo.ifc',{exact:false}).first().waitFor();
  await bimPage.waitForFunction(()=>document.querySelector('canvas')?.width>100);
  await bimPage.waitForTimeout(1500);
  await overflow(bimPage);
  await bimPage.screenshot({path:path.join(out,'bim-model-1440.png')});
  record('Hub launches BIM and imports a geometric IFC model');
  await bimPage.close();

  await page.goto(base+'/validate');
  await page.locator('input[type=file][accept=".ifc"]').setInputFiles(path.join(root,'vision-bim-validator/test/fixtures/sample-fail.ifc'));
  await page.locator('label.ids-option').filter({hasText:'Custom IDS'}).click();
  await page.locator('input[type=file][accept=".ids"]').setInputFiles(path.join(root,'vision-bim-validator/test/fixtures/sample.ids'));
  const submit=page.waitForResponse(response=>response.url()===base+'/api/v1/validate'&&response.request().method()==='POST');
  await page.getByRole('button',{name:'Validate',exact:true}).click();
  const queued=await submit;
  assert.equal(queued.status(),202);
  const job=await queued.json();
  await page.getByRole('button',{name:'Start new validation',exact:true}).waitFor();
  const completed=await(await page.request.get(base+job.status_url)).json();
  assert.equal(completed.status,'completed');
  assert.equal(completed.result.failed_specifications,1);
  assert.equal(completed.result.total_elements_validated,1);
  await page.screenshot({path:path.join(out,'bim-validation-1440.png'),fullPage:true});
  const bcf=await page.request.get(base+job.status_url+'/bcf');
  assert.equal(bcf.status(),200);
  const bcfData=await bcf.body();
  assert.equal(bcfData.subarray(0,2).toString(),'PK');
  fs.writeFileSync(path.join(out,'validation.bcfzip'),bcfData);
  fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(completed,null,2)+'\n');
  record('Real IFC/IDS validation reports a failing element and exports BCF');

  await page.goto(hub+'/#modules');
  const pendingCad=page.waitForEvent('popup');
  await page.locator('[data-module=cad2d]').getByRole('link').click();
  const cad=await pendingCad;
  cad.on('pageerror',error=>errors.push(error.message));
  await cad.evaluate(()=>{window.showSaveFilePicker=undefined;});
  await cad.getByRole('button',{name:/^New drawing/}).click();
  await cad.waitForFunction(()=>!!window.cad);
  await cad.getByRole('button',{name:'Rectangle',exact:true}).first().click();
  const canvas=await cad.locator('canvas').first().boundingBox();
  await cad.mouse.click(canvas.x+220,canvas.y+180);
  await cad.mouse.click(canvas.x+490,canvas.y+350);
  await cad.keyboard.press('Escape');
  await cad.keyboard.press('Control+Shift+s');
  await cad.getByRole('dialog',{name:'Download project'}).getByRole('textbox').fill('Suite CAD verification');
  const pendingDownload=cad.waitForEvent('download');
  await cad.getByRole('button',{name:'Download .o2d',exact:true}).click();
  const drawing=await pendingDownload;
  const drawingFile=path.join(out,'drawing.o2d');
  await drawing.saveAs(drawingFile);
  const saved=JSON.parse(fs.readFileSync(drawingFile,'utf8'));
  assert.equal(saved.shapes[0].type,'rectangle');
  await overflow(cad);
  await cad.screenshot({path:path.join(out,'cad2d-drawing-1440.png')});
  record('Hub launches 2D CAD; drawn geometry survives the project download');
  await cad.close();
  assert.deepEqual(errors,[],'Uncaught browser errors');
} catch(error) {errors.push(error.stack||error.message);process.exitCode=1;}
finally {
  await browser.close();
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2)+'\n');
}
console.log(`${results.length} scenarios passed; ${errors.length} errors.`);
