import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {root} from './common.mjs';
import {buildEnvironment} from '../spanvision-pile-plane-workspace/tools/toolchain.mjs';
if(process.platform!=='win32')throw Error('Windows packaging requires a Windows MSVC host.');
const source=path.join(root,'spanvision-pile-plane-workspace'),app=path.join(source,'apps/pile-plan-studio');
const out=path.join(root,'qa/pile');fs.mkdirSync(out,{recursive:true});
const env=buildEnvironment();
env.CARGO_TARGET_DIR=path.join(env.SPANVISION_TOOLCHAIN_ROOT||'D:/SpanvisionToolchain','pile-native-target');
const log=fs.createWriteStream(path.join(out,'native-build.log'));
console.log('Building Windows executable and NSIS installer. Progress: qa/pile/native-build.log');
const child=spawn(process.execPath,[path.join(app,'node_modules/@tauri-apps/cli/tauri.js'),'build','--bundles','nsis','--','--locked'],{cwd:app,env,windowsHide:true});
child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
child.on('error',error=>{log.end();console.error(error);process.exitCode=1;});
child.on('close',code=>{
  log.end();if(code!==0){process.exitCode=code??1;console.error('Native build failed; see log.');return;}
  const release=path.join(env.CARGO_TARGET_DIR,'release'),delivery=path.join(root,'delivery/pile/windows');fs.mkdirSync(delivery,{recursive:true});
  fs.copyFileSync(path.join(release,'spanvision-pile-plane-workspace.exe'),path.join(delivery,'spanvision-pile-plane-workspace.exe'));
  fs.cpSync(path.join(source,'legal'),path.join(delivery,'legal'),{recursive:true});
  const installers=fs.readdirSync(path.join(release,'bundle/nsis')).filter(name=>name.endsWith('.exe'));
  for(const name of installers)fs.copyFileSync(path.join(release,'bundle/nsis',name),path.join(delivery,name));
  fs.writeFileSync(path.join(out,'native-build-results.json'),JSON.stringify({build:'passed',version:'0.4.2',signed:false,deliveryDirectory:delivery,installers},null,2)+'\n');
  console.log('Pile Plane Workspace executable and installer delivered.');
});
