import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {root} from './common.mjs';
if(process.platform!=='win32')throw Error('Windows packaging requires a Windows MSVC host.');
const app=path.join(root,'spanvision-field-workspace'),out=path.join(root,'qa/field');fs.mkdirSync(out,{recursive:true});
const cacheRoot=process.env.SPANVISION_TOOLCHAIN_ROOT||'D:/SpanvisionToolchain';
const vcvars=path.join(cacheRoot,'BuildTools/VC/Auxiliary/Build/vcvars64.bat');
const env={...process.env,CARGO_BUILD_JOBS:'2',CARGO_TARGET_DIR:path.join(cacheRoot,'field-target'),CARGO_HOME:path.join(cacheRoot,'CargoCache')};
if(fs.existsSync(vcvars)) {
 const result=execFileSync(process.env.ComSpec||'C:/Windows/System32/cmd.exe',['/d','/c',`call "${vcvars}" >nul && set`],{encoding:'utf8',windowsHide:true,windowsVerbatimArguments:true});
 for(const line of result.split(/\r?\n/)){const split=line.indexOf('=');if(split>0)env[line.slice(0,split)]=line.slice(split+1);}
 env.CARGO_BUILD_JOBS='2';env.CARGO_TARGET_DIR=path.join(cacheRoot,'field-target');env.CARGO_HOME=path.join(cacheRoot,'CargoCache');
}
// This host's SDK is installed separately from the relocated Build Tools.
const sdk='C:/Program Files (x86)/Windows Kits/10';
if(fs.existsSync(path.join(sdk,'Lib'))) {
 const version=fs.readdirSync(path.join(sdk,'Lib')).filter(name=>fs.existsSync(path.join(sdk,'Lib',name,'um/x64/kernel32.lib'))).sort().at(-1);
 const msvcRoot=path.join(cacheRoot,'BuildTools/VC/Tools/MSVC');
 const msvc=fs.existsSync(msvcRoot)?fs.readdirSync(msvcRoot).sort().at(-1):undefined;
 if(version) {
   env.LIB=[...(msvc?[path.join(msvcRoot,msvc,'lib/x64')]:[]),path.join(sdk,'Lib',version,'um/x64'),path.join(sdk,'Lib',version,'ucrt/x64'),env.LIB||''].join(';');
   env.INCLUDE=[...(msvc?[path.join(msvcRoot,msvc,'include')]:[]),...['shared','um','ucrt','winrt'].map(dir=>path.join(sdk,'Include',version,dir)),env.INCLUDE||''].join(';');
   const previousPath=env.Path||env.PATH||'';for(const key of Object.keys(env))if(key.toLowerCase()==='path')delete env[key];
   env.Path=path.join(sdk,'bin',version,'x64')+';C:/Windows/System32;'+previousPath;
   env.WindowsSdkDir=sdk+'/';env.WindowsSDKVersion=version+'/';env.UCRTVersion=version;env.UniversalCRTSdkDir=sdk+'/';
 }
}
async function run(command,args,cwd,logName) {
 await new Promise((resolve,reject)=>{const log=fs.createWriteStream(path.join(out,logName));const child=spawn(command,args,{cwd,env,windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.on('error',reject);child.on('exit',code=>{log.end();code===0?resolve():reject(Error(`${logName} failed (${code}).`));});});
}
console.log('Building Field Workspace Windows x64 application and NSIS installer. Progress: qa/field/native-build.log');
const cargo=path.join(process.env.USERPROFILE,'.cargo/bin/cargo.exe');
await run(cargo,['fetch','--locked','--target','x86_64-pc-windows-msvc'],path.join(app,'src-tauri'),'native-fetch.log');
await run(process.execPath,[path.join(root,'branding/prepare-field.mjs')],root,'native-assets.log');
await run(process.execPath,[path.join(app,'node_modules/@tauri-apps/cli/tauri.js'),'build','--bundles','nsis','--','--locked'],app,'native-build.log');
console.log('Running native profile migration tests.');
await run(cargo,['test','--locked','--release','--lib'],path.join(app,'src-tauri'),'native-tests.log');
const release=path.join(env.CARGO_TARGET_DIR,'release'),delivery=path.join(root,'delivery/field/windows');fs.mkdirSync(delivery,{recursive:true});
fs.copyFileSync(path.join(release,'spanvision-field-workspace.exe'),path.join(delivery,'Field Workspace.exe'));
for(const name of ['WebView2Loader.dll'])if(fs.existsSync(path.join(release,name)))fs.copyFileSync(path.join(release,name),path.join(delivery,name));
fs.cpSync(path.join(app,'legal'),path.join(delivery,'legal'),{recursive:true});
const installers=fs.readdirSync(path.join(release,'bundle/nsis')).filter(name=>name.endsWith('.exe'));
for(const name of installers)fs.copyFileSync(path.join(release,'bundle/nsis',name),path.join(delivery,name));
fs.writeFileSync(path.join(out,'native-build-results.json'),JSON.stringify({build:'passed',migrationTests:'passed',releaseDirectory:release,deliveryDirectory:delivery,installers,signed:false},null,2)+'\n');
console.log('Field Workspace executable, installer and notices delivered.');
