import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { root, brand, digest, fingerprint } from './common.mjs';

export function syncStl({module,emit}) {
 const identity={organization:brand.organization,product:module.productName,mark:module.mark,version:'1.1.1',theme:brand.theme,palette:brand.palette,services:brand.services,instanceMarker:'spanvision-stl-3d-map-workspace',brandDigest:digest(module),hubPort:brand.hub.port};
 emit(`${module.directory}/brand.json`,JSON.stringify(identity,null,2)+'\n');
 const p=brand.palette;
 emit(`${module.directory}/web/brand-palette.css`,`:root {\n${Object.entries(p).map(([k,v])=>` --sv-${k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}: ${v};`).join('\n')}\n}\n`);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="STL"><rect x="1" y="1" width="62" height="62" rx="12" fill="${p.page}" stroke="${p.text}" stroke-opacity=".2"/><g fill="none" stroke="${p.text}" stroke-width="3" stroke-linejoin="miter"><path d="M22 23h-9v9h9v9h-9M27 23h14m-7 0v18M46 23v18h10"/></g></svg>\n`;
 emit(`${module.directory}/web/stl-mark.svg`,svg);
}
export function stlInputs(module) {
 const base=path.join(root,module.directory);
 function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name==='__pycache__'?[]:e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
 return [...walk(path.join(base,'app')).filter(f=>f.endsWith('.py')),...walk(path.join(base,'web')), ...walk(path.join(base,'legal')), ...['brand.json','requirements.txt','run_app.py','LICENSE'].map(f=>path.join(base,f))].sort().map(f=>path.relative(base,f).replaceAll('\\','/'));
}
export function pythonPath() {
 if(process.env.SPANVISION_STL_PYTHON)return process.env.SPANVISION_STL_PYTHON;
 const app=path.join(root,'spanvision-stl-3d-map-workspace');
 const choices=process.platform==='win32'?[path.join(app,'.venv/Scripts/python.exe'),'D:/CAD/spanvision-stl-runtime/venv/Scripts/python.exe']:[path.join(app,'.venv/bin/python')];
 return choices.find(f=>fs.existsSync(f))||'python';
}
export function stopStl(child){
 if(!child||child.exitCode!==null)return;
 if(process.platform==='win32')spawnSync(path.join(process.env.SystemRoot||'C:/Windows','System32/taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
 else child.kill();
}
export async function startStl(module) {
 const stamp=JSON.parse(fs.readFileSync(path.join(root,module.directory,module.dist,'suite-build.json'),'utf8'));
 if(stamp.sourceFingerprint!==fingerprint(module)||stamp.brandDigest!==digest(module))throw new Error('Rebuild STL to preview the latest edition.');
 const url=`http://127.0.0.1:${module.port}`;
 try {
  const response=await fetch(url+'/__stl/status',{signal:AbortSignal.timeout(1200)});
  const active=await response.json();
  if(active.id!=='stl'||!active.available||active.sourceFingerprint!==stamp.sourceFingerprint||active.brandDigest!==stamp.brandDigest)throw new Error('STL port is occupied by a different or outdated server.');
  return null;
 } catch(error){if(error.message?.includes('occupied'))throw error;}
 const child=spawn(pythonPath(),['-m','uvicorn','app.main:app','--host','127.0.0.1','--port',String(module.port),'--no-access-log'],{cwd:path.join(root,module.directory),windowsHide:true,env:{...process.env,SPANVISION_STL_PREVIEW:'1'},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',data=>process.stdout.write(data));child.stderr.on('data',data=>process.stderr.write(data));
 let failure;child.on('error',e=>failure=e);
 for(let i=0;i<100;i++){
  if(failure)throw failure;
  if(child.exitCode!==null)throw new Error('STL backend failed to start. Check its Python environment or occupied port.');
  try {const active=await(await fetch(url+'/__stl/status',{signal:AbortSignal.timeout(800)})).json();if(active.available&&active.sourceFingerprint===stamp.sourceFingerprint)return child;}catch{}
  await new Promise(r=>setTimeout(r,200));
 }
 stopStl(child);throw new Error('STL backend did not become ready.');
}
