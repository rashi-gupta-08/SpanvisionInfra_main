import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {root} from './common.mjs';
import {pythonPath} from './stl.mjs';
const app=path.join(root,'spanvision-stl-3d-map-workspace');
const out=path.join(root,'delivery/stl/windows');
const qa=path.join(root,'qa/stl');fs.mkdirSync(out,{recursive:true});fs.mkdirSync(qa,{recursive:true});
if(process.platform==='win32'&&fs.existsSync('D:/CAD/spanvision-stl-runtime')){fs.mkdirSync('D:/CAD/spanvision-stl-runtime/temp',{recursive:true});process.env.TEMP='D:/CAD/spanvision-stl-runtime/temp';process.env.TMP=process.env.TEMP;}
async function run(cmd,args,cwd,name){await new Promise((resolve,reject)=>{const log=fs.createWriteStream(path.join(qa,name+'.log'));const child=spawn(cmd,args,{cwd,windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.on('error',reject);child.on('exit',code=>{log.end();code===0?resolve():reject(new Error(name+' failed. See qa/stl/'+name+'.log'));});});}
await run(process.execPath,[path.join(root,'branding/sync.mjs')],root,'native-brand');
await run(process.execPath,[path.join(root,'branding/icons-stl.mjs')],root,'native-icons');
await run(pythonPath(),['packaging/prepare.py'],app,'native-notices');
await run(process.execPath,[path.join(root,'branding/build.mjs'),'stl','hub'],root,'native-web');
await run(pythonPath(),['-m','PyInstaller','packaging/stl.spec','--noconfirm','--distpath',path.join(out,'portable'),'--workpath','D:/CAD/spanvision-stl-runtime/pyinstaller-build'],app,'native-build');
const choices=[process.env.SPANVISION_STL_ISCC,'D:/CAD/spanvision-stl-runtime/InnoPortable/package/bin/ISCC.exe',process.env.LOCALAPPDATA+'/Programs/Inno Setup 6/ISCC.exe','C:/Program Files (x86)/Inno Setup 6/ISCC.exe'].filter(Boolean);
const compiler=choices.find(file=>fs.existsSync(file));if(!compiler)throw new Error('Set SPANVISION_STL_ISCC to an Inno Setup compiler. The portable app is already built.');
await run(compiler,['/O'+out,'/DSourceDir='+path.join(out,'portable/STL-3D map workspace'),path.join(app,'packaging/stl.iss')],app,'native-installer');
await run(pythonPath(),[path.join(app,'packaging/deliver.py'),out],app,'native-delivery');
console.log('Windows portable ZIP and installer: '+out);
