import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import esbuild from '../../open-vision-studio/node_modules/esbuild/lib/main.js';
const root=path.resolve('open-vision-studio'),out=path.resolve('qa/english/planner-tests');fs.mkdirSync(out,{recursive:true});
const tests=['harness','check-holidays','check-calendar-breaks','check-calendar-arith','check-calendar-dialog-commits'];
let failed=false;
for(const test of tests){
 const file=path.join(root,'tests/planning','.english-'+test+'.mjs');
 await esbuild.build({entryPoints:[path.join(root,'tests/planning',test+'.ts')],bundle:true,platform:'node',format:'esm',outfile:file,alias:{'@':path.join(root,'src')},external:['react-dom/server'],logLevel:'warning',define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true','import.meta.env.MODE':'"production"','__OPS_DEV_INSTANCE__':'"test"'}});
 const args=test==='harness'?fs.readdirSync(path.join(root,'tests/planning')).filter(n=>n.startsWith('cases-')&&n.endsWith('.json')&&n!=='cases-p6-verified.json').map(n=>path.join(root,'tests/planning',n)):[];
 const result=spawnSync(process.execPath,[file,...args],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
 fs.writeFileSync(path.join(out,test+'.log'),(result.stdout??'')+(result.stderr??''));fs.unlinkSync(file);console.log(test+': exit '+result.status);if(result.status!==0){failed=true;console.log((result.stderr||result.stdout).slice(-2200));}
}
if(failed)process.exitCode=1;
