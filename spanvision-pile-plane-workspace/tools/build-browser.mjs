import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {buildEnvironment} from './toolchain.mjs';
const env=buildEnvironment();
// Keep the browser cache independent of the native release target used by Tauri.
const localTools=env.SPANVISION_TOOLCHAIN_ROOT||'D:/SpanvisionToolchain';
if(env.SPANVISION_PILE_WASM_TARGET)env.CARGO_TARGET_DIR=env.SPANVISION_PILE_WASM_TARGET;
else if(process.platform==='win32'&&fs.existsSync(localTools))env.CARGO_TARGET_DIR=path.join(localTools,'pile-target');
const npm=process.platform==='win32'?'npm.cmd':'npm';
const child=spawn(npm,['run','build'],{cwd:process.cwd(),env,stdio:'inherit',windowsHide:true,shell:process.platform==='win32'});
child.on('error',error=>{console.error(error);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
