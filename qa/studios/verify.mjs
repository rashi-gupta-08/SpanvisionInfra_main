import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { root,brand,digest,fingerprint } from '../../branding/common.mjs';

const out=path.join(root,'qa/studios');
fs.mkdirSync(out,{recursive:true});
const hub=`http://127.0.0.1:${brand.hub.port}`;
const studios=brand.modules.filter(module=>module.kind==='studio');
const results=[],errors=[];
const record=(scenario,details={})=>{results.push({scenario,passed:true,...details});console.log(`PASS ${scenario}`);};
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
await context.addInitScript(()=>{delete window.showOpenFilePicker;delete window.showSaveFilePicker;});
const page=await context.newPage();
page.setDefaultTimeout(30000);
page.on('pageerror',error=>errors.push({module:'hub',message:error.message}));
const bounds=async target=>assert.ok(await target.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow on ${target.url()}`);
const ready={planner:'.ribbon-tabs',fem:'.ribbon-tabs',frame:'.ribbon-tabs',calculation:'.pg-panel'};
try {
  const status=await(await page.request.get(hub+'/__suite/status')).json();
  for(const module of studios) {
    assert.equal(status.modules.find(item=>item.id===module.id)?.available,true,`${module.label} is unavailable`);
    const stamp=JSON.parse(fs.readFileSync(path.join(root,module.directory,module.dist,'suite-build.json'),'utf8'));
    assert.equal(stamp.brandDigest,digest(module));
    assert.equal(stamp.sourceFingerprint,fingerprint(module));
    const notice=await page.request.get(`${hub}/${module.id}-notices.txt`);
    assert.equal(notice.status(),200);
    assert.ok((await notice.text()).length>50);
  }
  for(const id of ['cad','cad2d','bim'])assert.equal(status.modules.find(item=>item.id===id)?.available,true,`${id} is unavailable`);
  record('All four current studio builds, source notices, CAD and BIM are available');

  for(const width of [320,390,820,1440]) {
    await page.setViewportSize({width,height:900});
    for(const route of ['landing','modules','suggestions']) {
      await page.goto(`${hub}/#${route}`);
      await page.getByRole('link',{name:'Open Open Vision Studio in a new tab',exact:true}).waitFor();
      await bounds(page);
      for(const module of studios) {
        const link=page.getByRole('link',{name:`Open ${module.label} in a new tab`,exact:true});
        assert.equal(await link.count(),1);
        assert.equal(await link.getAttribute('href'),`http://127.0.0.1:${module.port}${module.path}?appearance=dark`);
        assert.equal(await link.getAttribute('rel'),'noopener noreferrer');
      }
    }
    await page.goto(hub+'/#modules');
    await page.locator('[data-module=planner] a').waitFor();
    await page.screenshot({path:path.join(out,`hub-tools-${width}.png`),fullPage:true});
    record('Main overview, Tools and Assistant links fit the viewport',{width});
  }

  for(const module of studios) {
    await page.setViewportSize({width:1440,height:900});
    await page.goto(hub+'/#modules');
    const opening=page.waitForEvent('popup');
    await page.locator(`[data-module=${module.id}]`).getByRole('link').click();
    const app=await opening;
    app.setDefaultTimeout(30000);
    app.on('pageerror',error=>errors.push({module:module.id,message:error.message}));
    await app.waitForLoadState('domcontentloaded');
    if(module.id==='calculation')await app.locator(ready.calculation).waitFor();
    else await app.getByRole('button',{name:'File',exact:true}).waitFor();
    assert.equal(new URL(app.url()).port,String(module.port));
    assert.match(await app.title(),/Vision|Studio/i);
    for(const width of [1440,820,390]) {
      await app.setViewportSize({width,height:900});
      await bounds(app);
      await app.screenshot({path:path.join(out,`${module.id}-${width}.png`)});
    }
    record('Hub launches the existing studio at desktop, tablet and phone sizes',{module:module.id});
    await app.setViewportSize({width:1440,height:900});

    if(module.id==='planner') {
      const welcome=app.locator('[data-ops-welcome-dialog]');
      if(await welcome.isVisible())await welcome.getByRole('button',{name:'Skip',exact:true}).click();
      const choosing=app.waitForEvent('filechooser');
      await app.keyboard.press('Control+o');
      const chooser=await choosing;
      await chooser.setFiles(path.join(root,module.directory,'public/examples/showcase-verbouwing-eengezinswoning.ifc'));
      await app.waitForFunction(()=>document.body.innerText.match(/Tasks:\s*[1-9]\d*/));
      await app.locator('[data-testid="gantt-primary-canvas"]').waitFor();
      const downloading=app.waitForEvent('download');
      await app.keyboard.press('Control+Shift+s');
      const saved=await downloading;
      const target=path.join(out,'planning.ifc');await saved.saveAs(target);
      const content=fs.readFileSync(target,'utf8');
      assert.match(content,/ISO-10303-21/);assert.match(content,/IFCTASK/);
      record('Construction schedule imports tasks and exports an IFC project');
    }
    if(module.id==='fem') {
      await app.getByRole('button',{name:'Analyze',exact:true}).click();
      const solving=app.waitForResponse(response=>response.url().endsWith('/api/solve')&&response.request().method()==='POST');
      await app.getByRole('button',{name:'Solve',exact:true}).click();
      await solving;
      await app.getByText('Solved',{exact:true}).waitFor();
      const text=await app.locator('body').innerText();
      assert.match(text,/Nodes\s+4/);assert.match(text,/Beams\s+3/);
      const stress=text.match(/Max stress\s+([\d.]+)/);
      assert.ok(stress&&Number(stress[1])>0,'The local solver did not produce a stress result');
      record('FEM browser solver computes the included structural model');
    }
    if(module.id==='frame') {
      const wasm=await app.request.get(`http://127.0.0.1:${module.port}/wasm/ofs_wasm_bg.wasm`);
      assert.equal(wasm.status(),200);assert.match(wasm.headers()['content-type'],/application\/wasm/);
      assert.deepEqual([...(await wasm.body()).subarray(0,4)],[0,97,115,109]);
      await app.getByRole('button',{name:'Tilt & turn',exact:true}).click();
      await app.locator('#frame-width').waitFor();
      const previous=await app.locator('#frame-width').inputValue();
      await app.locator('#frame-width').fill('1200');await app.locator('#frame-width').press('Enter');
      await app.keyboard.press('Control+z');
      await app.waitForFunction(value=>document.querySelector('#frame-width')?.value===value,previous);
      assert.match(await app.locator('body').innerText(),/1 frame\(s\)/);
      record('Bundled frame engine creates a frame and preserves edit/undo behavior');
    }
    if(module.id==='calculation') {
      await app.getByRole('button',{name:/Base plate connection/}).click();
      await app.locator('.vd-panel').waitFor();
      await app.locator('.calc-preview-content h1').first().waitFor();
      assert.doesNotMatch(await app.locator('.calc-preview-content').innerText(),/Render error:/);
      const [saved]=await Promise.all([
        app.waitForEvent('download'),
        app.getByRole('button',{name:'Save',exact:true}).last().click()
      ]);
      const target=path.join(out,'calculation.ifccalculation');await saved.saveAs(target);
      const content=JSON.parse(fs.readFileSync(target,'utf8'));
      assert.match(JSON.stringify(content.header),/Vision Calculation Studio/);
      assert.match(JSON.stringify(content.header),/Spanvision Infra/);
      record('Calculation designer evaluates a document and downloads its project');
    }
    await bounds(app);
    await app.screenshot({path:path.join(out,`${module.id}-workflow-1440.png`)});
    await app.close();
  }
  assert.deepEqual(errors,[],'Uncaught browser errors');
} catch(error) {
  errors.push({message:error.stack||error.message});process.exitCode=1;
  for(const [index,app] of context.pages().entries())try{await app.screenshot({path:path.join(out,`failure-${index}.png`)});}catch {}
} finally {
  await browser.close();
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2)+'\n');
}
console.log(`${results.length} scenarios passed; ${errors.length} errors.`);
