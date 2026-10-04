import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { root } from './common.mjs';
const app=path.join(root,'spanvision-geptechniek-workspace/apps/desktop');
const output=path.join(root,'qa/geotechniek');fs.mkdirSync(output,{recursive:true});
const cacheRoot=process.env.SPANVISION_TOOLCHAIN_ROOT || (process.platform==='win32'?'D:/SpanvisionToolchain':path.join(root,'.native-cache'));
const env={...process.env,CARGO_BUILD_JOBS:process.env.CARGO_BUILD_JOBS || '1',CARGO_TARGET_DIR:path.join(cacheRoot,'geo-target'),CARGO_HOME:path.join(cacheRoot,'CargoCache')};
function run(command,args,cwd,logName){
 return new Promise((resolve,reject)=>{
  const log=fs.createWriteStream(path.join(output,logName));
  const child=spawn(command,args,{cwd,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
  child.on('error',reject);child.on('exit',code=>{log.end();code===0?resolve():reject(Error(logName+' failed ('+code+').'));});
 });
}
if(process.platform!=='win32')throw Error('Use a Windows MSVC host for the Windows installer.');
console.log('Building locked Windows executable and NSIS installer. See qa/geotechniek/native-build.log.');
await run(process.execPath,[path.join(app,'node_modules/@tauri-apps/cli/tauri.js'),'build','--bundles','nsis','--','--locked'],app,'native-build.log');
console.log('Checking native preference migration and report serialization.');
await run('cargo',['test','--locked','--release','--lib'],path.join(app,'src-tauri'),'native-tests.log');
const release=path.join(env.CARGO_TARGET_DIR,'release');
const delivery=path.join(root,'delivery/geotechniek/windows');fs.mkdirSync(delivery,{recursive:true});
for(const name of ['spanvision-geotechniek-workspace.exe','WebView2Loader.dll'])fs.copyFileSync(path.join(release,name),path.join(delivery,name));
fs.cpSync(path.join(app,'src-tauri/tenants'),path.join(delivery,'tenants'),{recursive:true});
const installers=fs.readdirSync(path.join(release,'bundle/nsis')).filter(f=>f.endsWith('.exe'));
for(const name of installers)fs.copyFileSync(path.join(release,'bundle/nsis',name),path.join(delivery,name));
fs.writeFileSync(path.join(output,'native-build-results.json'),JSON.stringify({build:'passed',migrationTests:'passed',releaseDirectory:release,deliveryDirectory:delivery,installers},null,2)+'\n');
console.log('Windows executable and installer copied to delivery/geotechniek/windows.');
