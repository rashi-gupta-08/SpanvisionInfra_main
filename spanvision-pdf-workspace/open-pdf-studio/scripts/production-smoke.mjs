import { spawn } from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const app=path.resolve(import.meta.dirname,'..'), qa=path.resolve(app,'../qa');
const server=spawn(process.execPath,[path.join(app,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port','3085','--strictPort'],{cwd:app,windowsHide:true,stdio:'pipe'});
let browser;
try{
  let ready=false;
  for(let i=0;i<30;i++){try{ready=(await fetch('http://127.0.0.1:3085')).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,500));}
  assert.ok(ready,'production preview did not start');
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:3085/preview.html');
  await page.getByRole('heading',{name:'Clarity, on every page.'}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'spanvision-mono');
  await page.goto('http://127.0.0.1:3085');await page.locator('#placeholder').waitFor();
  const chooser=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:'Open PDF',exact:true}).click();
  await (await chooser).setFiles(path.join(app,'public/sample-project.pdf'));
  await page.waitForFunction(()=>document.querySelector('#pdf-canvas')?.width>100 && getComputedStyle(document.querySelector('#placeholder')).display==='none');
  await page.waitForTimeout(1500);
  await page.keyboard.press('Control+2');await page.waitForTimeout(800);
  await page.screenshot({path:path.join(qa,'production-workspace-1440.png')});
  assert.deepEqual(errors,[]);
  console.log('Production landing and PDF editor load and render correctly.');
}finally{await browser?.close();server.kill();}
