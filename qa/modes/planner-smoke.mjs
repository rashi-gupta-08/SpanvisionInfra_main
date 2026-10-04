import path from 'node:path';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { chromium } from 'playwright';
import { build } from '../../open-vision-studio/node_modules/vite/dist/node/index.js';
import { allocateNamedPort } from '../../open-vision-studio/scripts/dev-port.mjs';

const root=path.resolve('open-vision-studio');
const port=await allocateNamedPort(root,'browser');
const out=path.resolve('qa/modes/planner-smoke-build');
process.env.VITE_OPS_BENCH_BRIDGE='1';
await build({root,configFile:path.join(root,'vite.config.ts'),build:{outDir:out},logLevel:'error'});
const server=http.createServer((req,res)=>{
 const file=path.resolve(out,'.'+new URL(req.url,'http://localhost').pathname);
 if(file!==out&&!file.startsWith(out+path.sep)){res.writeHead(403);res.end();return;}
 const target=file===out?path.join(out,'index.html'):file;
 if(!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end();return;}
 const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.woff2':'font/woff2','.svg':'image/svg+xml'};
 res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');fs.createReadStream(target).pipe(res);
});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 const page=await browser.newPage({viewport:{width:1440,height:950}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${port}/?appearance=light`,{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>!!window.__OPS__,{},{timeout:120000});
 const control=page.getByRole('combobox',{name:'Color mode',exact:true});
 await control.waitFor({state:'visible'});
 const snapshot=()=>page.evaluate(()=>{
  const state=window.__OPS__.store.getState();
  return {theme:state.ui.uiTheme,project:state.project.name,tasks:Object.keys(state.tasks).sort()};
 });
 const before=await snapshot();assert.equal(before.theme,'light');
 await control.selectOption('dark');await page.waitForTimeout(200);
 const after=await snapshot();assert.equal(after.theme,'spanvision-mono');
 assert.equal(after.project,before.project);assert.deepEqual(after.tasks,before.tasks);
 await control.selectOption('light');await page.waitForTimeout(200);assert.equal((await snapshot()).theme,'light');
 assert.deepEqual(errors,[]);
 console.log('PASS planner browser smoke: dev bridge, native theme state, project and tasks retained.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
