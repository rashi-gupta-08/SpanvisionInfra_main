import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const root=path.resolve(import.meta.dirname,'../..'),out=import.meta.dirname;
const binary=path.join(root,'delivery/field/windows/Field Workspace.exe');
const profileRoot=path.join(out,'native-profiles-'+Date.now());fs.mkdirSync(profileRoot,{recursive:true});
const records=[];let child,browser,page;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function launch(port) {
 child=spawn(binary,[],{cwd:path.dirname(binary),windowsHide:true,env:{...process.env,SPANVISION_FIELD_DATA_ROOT:profileRoot,WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:`--remote-debugging-port=${port}`},stdio:'ignore'});
 let last;
 for(let attempt=0;attempt<80;attempt++) {
  if(child.exitCode!==null)throw Error('Native application exited with code '+child.exitCode);
  try {browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`,{timeout:750});break;}catch(error){last=error;await delay(250);}
 }
 if(!browser)throw last;
 for(let attempt=0;attempt<40;attempt++){page=browser.contexts().flatMap(context=>context.pages()).find(page=>/tauri\.localhost|tauri:\/\//.test(page.url()));if(page)break;await delay(250);}
 assert.ok(page,'Native main webview missing');page.setDefaultTimeout(15000);
 await page.waitForFunction(()=>window.app&&window.__tauriFs&&window.__tauriDialog&&window.__tauriHttpFetch);await page.evaluate(()=>window.app.ready);
}
async function close() {
 if(page)await page.evaluate(()=>window.__TAURI__.window.getCurrentWindow().close()).catch(()=>{});
 for(let attempt=0;child&&child.exitCode===null&&attempt<40;attempt++)await delay(100);
 if(child&&child.exitCode===null)child.kill();browser=undefined;page=undefined;await delay(1500);
}
function record(name,detail={}) {records.push({name,...detail});console.log(name+' '+JSON.stringify(detail));}
try {
 await launch(9255);
 assert.equal(await page.title(),'Field Workspace');assert.equal(await page.locator('html').getAttribute('data-theme'),'spanvision-mono');
 const title=await page.evaluate(()=>window.__TAURI__.window.getCurrentWindow().title());assert.equal(title,'Field Workspace — Spanvision infra');record('native-window-identity');
 const file=path.join(profileRoot,'native-file-check.json');
 await page.evaluate(async file=>{await window.__tauriFs.writeTextFile(file,'{"nativeFileAccess":true}');},file);
 assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),{nativeFileAccess:true});assert.equal(await page.evaluate(file=>window.__tauriFs.readTextFile(file),file),'{"nativeFileAccess":true}');record('native-filesystem-bridge');
 const connection=await page.evaluate(async()=>{const result=await window.__tauriHttpFetch('https://example.com/');return {status:result.status,ok:result.ok};});assert.ok(connection.ok);record('native-http-bridge',connection);
 const project=fs.readFileSync(path.join(out,'roundtrip-project.json'),'utf8');
 await page.evaluate(async project=>{window.app.applyLoadedJSON(project);const db=await window.app._blobDb();await new Promise(resolve=>{const transaction=db.transaction('blobs','readonly');transaction.objectStore('blobs').getAll();transaction.oncomplete=resolve;});localStorage.setItem('ofs_theme','light');localStorage.setItem('ofs_canvas_background','#424242');localStorage.setItem('ofs_lang','fr');},project);
 await page.reload();await page.waitForFunction(()=>window.app);await page.evaluate(()=>window.app.ready);
 assert.equal(await page.evaluate(()=>window.app.project.number),'SV-024');await page.screenshot({path:path.join(out,'native-windows-light.png'),animations:'disabled'});record('native-project-reload');
 await close();
 const newProfile=path.join(profileRoot,'com.spanvisioninfra.fieldworkspace'),legacyProfile=path.join(profileRoot,'com.openaec.openfieldstudio');
 fs.renameSync(newProfile,legacyProfile);
 await launch(9256);
 const restored=await page.evaluate(()=>({project:window.app.project.number,photo:window.app.tickets[0]?.photos[0]?.data,floor:window.app.floorPlans[0]?.data,signature:window.app.inspections[0]?.signature.data,theme:document.documentElement.dataset.theme,canvas:getComputedStyle(document.getElementById('canvas-container')).backgroundColor,lang:window.app.lang}));
 assert.equal(restored.project,'SV-024');assert.ok(restored.photo.startsWith('data:image/png'));assert.ok(restored.floor.startsWith('data:image/png'));assert.ok(restored.signature.startsWith('data:image/png'));assert.equal(restored.theme,'light');assert.equal(restored.canvas,'rgb(66, 66, 66)');assert.equal(restored.lang,'fr');assert.ok(fs.existsSync(path.join(newProfile,'SPANVISION-MIGRATION.json')));assert.ok(fs.existsSync(legacyProfile));record('native-real-webview-profile-migration',{theme:restored.theme,lang:restored.lang});
 await page.evaluate(()=>{localStorage.setItem('ofs_theme','spanvision-mono');localStorage.removeItem('ofs_canvas_background');window.__fwAppearance.apply('spanvision-mono',true);window.app.setLanguage('en');window.app.selectFloorPlan('floor-1');});
 await page.screenshot({path:path.join(out,'native-windows-workspace.png'),animations:'disabled'});
 await page.evaluate(async base64=>{window.app.switchTab('ifc');const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));await window.app.loadIfcFile(new File([bytes],'native-sample.ifc'));},fs.readFileSync(path.join(root,'ifc-view/demo/Spanvision-IFC-View-Demo.ifc')).toString('base64'));
 const ifcStatus=await page.locator('#ifc-status').innerText();assert.ok(ifcStatus.includes('native-sample.ifc'),'Native IFC: '+ifcStatus);record('native-packaged-ifc',{status:ifcStatus});
 await close();
 fs.writeFileSync(path.join(out,'native-smoke-results.json'),JSON.stringify({status:'passed',records,profileRoot},null,2)+'\n');
} catch(error) {
 fs.writeFileSync(path.join(out,'native-smoke-results.json'),JSON.stringify({status:'failed',records,profileRoot,error:error.stack},null,2)+'\n');throw error;
} finally {await close();}
