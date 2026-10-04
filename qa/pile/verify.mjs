import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';
const root=process.cwd(),out=path.join(root,'qa/pile');
if(!fs.existsSync(path.join(root,'branding/brand.json')))throw Error('Run verification from the Spanvision suite root.');
process.env.TEMP=process.env.TEMP||'D:/SpanvisionToolchain/pile-temp';process.env.TMP=process.env.TEMP;
const scripts=['browser-verification','editing-verification','responsive-verification'];let failed=false;
for(const name of scripts){console.log('Verifying '+name+'…');const code=await new Promise(resolve=>{const log=fs.createWriteStream(path.join(out,name+'.log'));const child=spawn(process.execPath,[path.join(out,name+'.mjs')],{cwd:root,env:process.env,windowsHide:true});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.on('error',e=>{log.end();console.error(e);resolve(1);});child.on('close',code=>{log.end();resolve(code??1);});});if(code)failed=true;}
const reports=scripts.map(name=>({suite:name,...JSON.parse(fs.readFileSync(path.join(out,name+'.json'),'utf8'))}));
const cases=reports.flatMap(report=>report.results.map(result=>({suite:report.suite,...result})));const pageErrors=reports.flatMap(report=>report.pageErrors||[]);
const summary={checkedAt:new Date().toISOString(),status:failed||pageErrors.length?'failed':'passed',passed:cases.filter(c=>c.status==='passed').length,failed:cases.filter(c=>c.status==='failed').length,pageErrors,cases};
fs.writeFileSync(path.join(out,'verification-results.json'),JSON.stringify(summary,null,2)+'\n');console.log(`${summary.passed} browser scenarios passed; ${summary.failed} failed.`);if(summary.status!=='passed')process.exitCode=1;
