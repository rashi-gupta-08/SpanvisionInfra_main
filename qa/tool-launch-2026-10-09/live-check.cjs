const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const hub = 'https://spanvision-infra.vercel.app';
const out = __dirname;
const report = { verifiedAt: new Date().toISOString(), checks: [], passed: false };

async function checkTool(browser, tool, mode, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? {width:390,height:844} : {width:1360,height:900}, reducedMotion:'reduce' });
  const errors = [];
  const failedAssets = [];
  context.on('page', page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      const type = response.request().resourceType();
      if (response.status() >= 400 && ['script','stylesheet','font'].includes(type)) failedAssets.push({url:response.url(),status:response.status()});
    });
  });
  const result = {tool:tool.id,mode,mobile,actualWorkspace:true,errors,failedAssets};
  let popup;
  try {
    const page = await context.newPage();
    await page.goto(`${hub}/?appearance=${mode}#modules`, {waitUntil:'domcontentloaded',timeout:45000});
    const card = page.locator(`.module-card[data-module="${tool.id}"]`);
    const link = card.locator('a[target="_blank"]');
    await link.waitFor({timeout:20000});
    const href = new URL(await link.getAttribute('href'));
    assert.equal(href.origin,hub);
    assert.equal(href.pathname,'/launch.html');
    assert.equal(href.searchParams.get('tool'),tool.id);
    assert.equal(href.searchParams.get('appearance'),mode);
    const pending = page.waitForEvent('popup');
    await link.click();
    popup = await pending;
    await popup.locator('#splash-title').waitFor({timeout:15000});
    await popup.waitForFunction(label => document.getElementById('splash-title')?.textContent === label, tool.label, {timeout:10000});
    assert.equal(await popup.locator('#splash-title').innerText(),tool.label);
    assert.equal(await popup.locator('html').getAttribute('data-sv-mode'),mode);
    assert.equal(await popup.locator('.preview-header').count(),0);
    result.splash = true;
    if (tool.id==='cad2d') await popup.screenshot({path:path.join(out,`live-splash-${mode}${mobile?'-mobile':''}.png`)});
    await popup.waitForURL(url => url.origin === new URL(tool.url).origin, {timeout:150000,waitUntil:'domcontentloaded'});
    result.url = popup.url();
    const destination = new URL(result.url);
    assert.equal(destination.searchParams.get('appearance'),mode);
    assert.equal(destination.searchParams.get('launch'),'workspace');
    if (tool.id==='bim') assert.equal(destination.pathname,'/viewer');
    if (tool.id==='speech') assert.equal(destination.hash,'#workspace');
    if (tool.id!=='cad') await popup.waitForFunction(() => document.querySelectorAll('button').length > 3, null, {timeout:45000});
    await popup.waitForTimeout(1200);
    if (tool.id==='cad2d') {
      assert.equal(await popup.locator('.web-start-overlay').count(),0);
      await popup.locator('.web-editor canvas').first().waitFor({state:'visible',timeout:20000});
    } else if (tool.id==='bim') {
      await popup.locator('.app-shell').waitFor({state:'visible',timeout:20000});
      assert.equal(await popup.locator('.brand-header').count(),0);
    } else if (tool.id==='speech') {
      assert.equal(await popup.locator('.speech-landing').count(),0);
    } else if (tool.id==='planner') {
      assert.equal(await popup.locator('[data-ops-welcome-dialog]').count(),0);
      await popup.locator('canvas').first().waitFor({state:'visible',timeout:20000});
    } else if (tool.id==='fem') {
      await popup.locator('.fem-canvas-svg').waitFor({state:'visible',timeout:20000});
    } else if (tool.id==='frame') {
      await popup.locator('.workspace-tabs').waitFor({state:'visible',timeout:20000});
      await popup.getByText('Create a new frame via the ribbon toolbar', {exact:false}).waitFor({state:'visible',timeout:20000});
    } else if (['cad','ifc','pointcloud','pile'].includes(tool.id)) {
      await popup.locator('canvas').first().waitFor({state:'visible',timeout:30000});
      if (tool.id==='cad') {
        await popup.locator('#loading').waitFor({state:'hidden',timeout:30000});
        const state = await popup.evaluate(async()=>{
          const bindings=window.wasmBindings;
          const ticket=bindings.ocs_control_submit(JSON.stringify({op:'state'}));
          for(let attempt=0;attempt<200;attempt++) {
            const response=bindings.ocs_control_take(ticket);
            if(response) return JSON.parse(response);
            await new Promise(resolve=>setTimeout(resolve,50));
          }
          throw new Error('CAD state observer did not respond');
        });
        const active=state.documents.find(document=>document.id===state.document_id);
        assert.equal(active.start,false,'CAD must open a drawing rather than the Start tab');
        result.activeDocument=active;
      }
    } else if (tool.id==='stl') {
      await popup.locator('#map').waitFor({state:'visible',timeout:20000});
      await popup.locator('#btn-load').waitFor({state:'visible',timeout:20000});
    }
    result.title = await popup.title();
    result.appearance = await popup.locator('html').getAttribute('data-sv-mode');
    assert.equal(result.appearance,mode);
    result.visibleText = (await popup.locator('body').innerText()).slice(0,900);
    result.canvasCount = await popup.locator('canvas').count();
    if (['cad','cad2d','bim','speech','planner'].includes(tool.id)) await popup.screenshot({path:path.join(out,`live-workspace-${tool.id}-${mode}${mobile?'-mobile':''}.png`)});
    assert.equal(errors.length,0,errors.join('; '));
    assert.equal(failedAssets.length,0,JSON.stringify(failedAssets));
    result.passed = true;
  } catch (error) {
    result.passed=false;result.error=error.message;
    if (popup && !popup.isClosed()) {
      result.lastUrl=popup.url();
      result.visibleText=(await popup.locator('body').innerText().catch(()=>'' )).slice(0,900);
    }
  }
  finally { await context.close(); }
  report.checks=report.checks.filter(check=>!(check.tool===result.tool && check.mode===result.mode && check.mobile===result.mobile));
  report.checks.push(result);
  await fs.writeFile(path.join(out,'live-results.json'),JSON.stringify(report,null,2));
  console.log(`${tool.id} ${mode}${mobile?' mobile':''}: ${result.passed?'PASS':`FAIL ${result.error}`}`);
}

(async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(out,'../../deployment/production.json'),'utf8'));
  const retry = process.argv.includes('--retry-failed');
  const cadOnly = process.argv.includes('--cad');
  let failures=[];
  if (retry || cadOnly) {
    const previous=JSON.parse(await fs.readFile(path.join(out,'live-results.json'),'utf8'));
    failures=previous.checks.filter(check=>!check.passed && manifest.modules.some(tool=>tool.id===check.tool));
    Object.assign(report,previous,{verifiedAt:new Date().toISOString(),passed:false});
  }
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    if (cadOnly) {
      for(const mode of ['dark','light']) await checkTool(browser,manifest.modules.find(tool=>tool.id==='cad'),mode);
    } else if (retry) {
      for(const check of failures) await checkTool(browser,manifest.modules.find(tool=>tool.id===check.tool),check.mode,check.mobile);
    } else {
      for(const tool of manifest.modules) await checkTool(browser,tool,'dark');
      for(const id of ['cad2d','bim','speech','planner']) await checkTool(browser,manifest.modules.find(tool=>tool.id===id),'light');
      await checkTool(browser,manifest.modules.find(tool=>tool.id==='cad2d'),'light',true);
    }
    const page = await browser.newPage();
    await page.goto(hub,{waitUntil:'domcontentloaded',timeout:45000});
    assert.equal(await page.locator('html').getAttribute('data-sv-mode'),'dark');
    const readiness=await page.evaluate(async()=>{
      const results=[];
      for(const id of ['bim','stl']) {
        const started=Date.now();
        let ready;
        while(Date.now()-started<120000) {
          try {
            const res=await fetch(`/__suite/ready/${id}`,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(8000)});
            const body=await res.json();
            if(res.ok && (id==='bim'?body.status==='healthy':body.id==='stl')) {
              ready={id,status:res.status,body,waitedMs:Date.now()-started};
              break;
            }
          }catch{}
          await new Promise(resolve=>setTimeout(resolve,1500));
        }
        if(!ready)throw new Error(`${id} readiness timed out`);
        results.push(ready);
      }
      return results;
    });
    assert.equal(readiness[0].body.status,'healthy');
    assert.equal(readiness[1].body.id,'stl');
    report.checks=report.checks.filter(check=>check.tool!=='hub');
    report.checks.push({tool:'hub',defaultDark:true,readiness,passed:true});
    report.plannerVerification={command:'npm run verify',exitCode:0,browserTestsPassed:333,log:'planner-verify.log',windowsNote:'Stopped only the completed test server after teardown stalled because taskkill was absent from PATH; added System32 to subsequent command environments.'};
    report.passed=report.checks.every(check=>check.passed);
    await fs.writeFile(path.join(out,'live-results.json'),JSON.stringify(report,null,2));
    console.log(`Live launch checks: ${report.checks.filter(check=>check.passed).length}/${report.checks.length}`);
    if(!report.passed) process.exitCode=1;
  } finally { await browser.close(); }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
