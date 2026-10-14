const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'../../SpanvisionCAD/dist');
const report = {verifiedAt:new Date().toISOString(),checks:[]};
const server = http.createServer((req,res)=>{
  let name = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(name.endsWith('/'))name+='index.html';
  const file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(!fs.existsSync(file)){res.writeHead(404).end();return;}
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.json':'application/json','.svg':'image/svg+xml','.ttf':'font/ttf'};
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});
async function state(page){return page.evaluate(async()=>{
  const bindings=window.wasmBindings;
  const ticket=bindings.ocs_control_submit(JSON.stringify({op:'state'}));
  for(let i=0;i<200;i++){
    const value=bindings.ocs_control_take(ticket);
    if(value)return JSON.parse(value);
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  throw new Error('CAD state timeout');
});}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    for(const [mode,launch] of [['dark',true],['light',true],['dark',false]]){
      const context=await browser.newContext({viewport:{width:1360,height:900}});
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      try{
        await page.goto(`${base}/app/?appearance=${mode}${launch?'&launch=workspace':''}`,{waitUntil:'domcontentloaded'});
        await page.locator('canvas').first().waitFor({state:'visible',timeout:60000});
        await page.locator('#loading').waitFor({state:'hidden',timeout:30000});
        const before=await state(page);
        const active=before.documents.find(document=>document.id===before.document_id);
        assert.equal(active.start,!launch);
        assert.equal(await page.locator('html').getAttribute('data-sv-mode'),mode);
        // Repeated launch must preserve the active drawing, never create a duplicate.
        await page.evaluate(()=>window.SpanvisionCADLaunch());
        const after=await state(page);
        assert.equal(after.document_id,before.document_id);
        assert.deepEqual(after.documents,before.documents);
        assert.deepEqual(errors,[]);
        await page.waitForTimeout(700);
        await page.screenshot({path:path.join(__dirname,`cad-shell-${mode}-${launch?'workspace':'standalone'}.png`)});
        report.checks.push({mode,launch,activeDocument:active,repeatPreservesDrawing:true,errors,passed:true});
        console.log(`${mode} ${launch?'workspace':'standalone'}: PASS`);
      } finally {await context.close();}
    }
    report.passed=true;
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
    await fsp.writeFile(path.join(__dirname,'cad-shell-results.json'),JSON.stringify(report,null,2));
  }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
