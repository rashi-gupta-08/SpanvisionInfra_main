import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

export function buildEnvironment() {
  const env={...process.env};
  if(process.platform!=='win32')return env;
  const tools=env.SPANVISION_TOOLCHAIN_ROOT||'D:/SpanvisionToolchain';
  if(!fs.existsSync(tools))return env;
  const vcvars=path.join(tools,'BuildTools/VC/Auxiliary/Build/vcvars64.bat');
  if(fs.existsSync(vcvars)) {
    const output=execFileSync(env.ComSpec||'C:/Windows/System32/cmd.exe',['/d','/c',`call "${vcvars}" >nul && set`],{encoding:'utf8',windowsHide:true,windowsVerbatimArguments:true});
    for(const line of output.split(/\r?\n/)){const split=line.indexOf('=');if(split>0)env[line.slice(0,split)]=line.slice(split+1);}
  }
  const sdk='C:/Program Files (x86)/Windows Kits/10';
  const sdkLib=path.join(sdk,'Lib');
  const version=fs.existsSync(sdkLib)?fs.readdirSync(sdkLib).filter(v=>fs.existsSync(path.join(sdkLib,v,'um/x64/kernel32.lib'))).sort().at(-1):null;
  const msvcRoot=path.join(tools,'BuildTools/VC/Tools/MSVC');
  const msvc=fs.existsSync(msvcRoot)?fs.readdirSync(msvcRoot).sort().at(-1):null;
  if(version){
    env.LIB=[...(msvc?[path.join(msvcRoot,msvc,'lib/x64')]:[]),path.join(sdkLib,version,'um/x64'),path.join(sdkLib,version,'ucrt/x64'),env.LIB||''].join(';');
    env.INCLUDE=[...(msvc?[path.join(msvcRoot,msvc,'include')]:[]),...['shared','um','ucrt','winrt'].map(d=>path.join(sdk,'Include',version,d)),env.INCLUDE||''].join(';');
    env.WindowsSdkDir=sdk+'/';env.WindowsSDKVersion=version+'/';env.UCRTVersion=version;env.UniversalCRTSdkDir=sdk+'/';
  }
  const extra=[path.join(tools,'pile-tools/wasm-pack-v0.15.0-x86_64-pc-windows-msvc'),path.join(tools,'BuildTools/Common7/IDE/CommonExtensions/Microsoft/CMake/CMake/bin'),path.join(tools,'BuildTools/Common7/IDE/CommonExtensions/Microsoft/CMake/Ninja'),...(version?[path.join(sdk,'bin',version,'x64')]:[]),'C:/Windows/System32'];
  const previousPath=env.Path||env.PATH||'';for(const key of Object.keys(env))if(key.toLowerCase()==='path')delete env[key];env.Path=[...extra,previousPath].join(';');
  env.CARGO_HOME=env.CARGO_HOME||path.join(tools,'CargoCache');
  env.CARGO_TARGET_DIR=env.CARGO_TARGET_DIR||path.join(tools,'pile-target');
  env.CARGO_BUILD_JOBS=env.CARGO_BUILD_JOBS||'2';
  env.CMAKE_GENERATOR=env.CMAKE_GENERATOR||'Ninja';
  env.LIBCLANG_PATH=env.LIBCLANG_PATH||path.join(tools,'pile-tools/libclang/libclang-18.1.1.data/platlib/clang/native');
  env.TEMP=path.join(tools,'pile-temp');fs.mkdirSync(env.TEMP,{recursive:true});env.TMP=env.TEMP;env.npm_config_cache=path.join(tools,'pile-npm-cache');
  return env;
}
