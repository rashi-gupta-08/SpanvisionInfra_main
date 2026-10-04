import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { root } from './common.mjs';
const out=path.join(root,'qa/geotechniek/backend');fs.mkdirSync(out,{recursive:true});
const exe=process.env.SPANVISION_GEO_EXE || path.join(root,'delivery/geotechniek/windows/spanvision-geotechniek-workspace.exe');
const content=fs.readFileSync(path.join(root,'spanvision-geptechniek-workspace/apps/desktop/public/example.gef'),'utf8');
const project={title:'Spanvision QA ground investigation',client:'QA customer',location:'Rotterdam',project_number:'SV-QA-01',author:'QA engineer',date:'2026-10-02'};
const results=[];const record=(name,details={})=>{results.push({name,...details});console.log(name+' passed.');};
// serde/f64 round trips may normalize the final binary rounding digit.
// Keep shape and text exact and require numerical agreement to 1e-12.
function equivalent(actual,expected,label='data') {
 if(typeof expected==='number'){assert.ok(typeof actual==='number'&&Math.abs(actual-expected)<=1e-12,label);return;}
 if(expected&&typeof expected==='object'){assert.ok(actual&&typeof actual==='object',label);assert.deepEqual(Object.keys(actual).sort(),Object.keys(expected).sort(),label);for(const key of Object.keys(expected))equivalent(actual[key],expected[key],label+'.'+key);return;}
 assert.equal(actual,expected,label);
}
const children=[];function start(args,name){const c=spawn(exe,args,{windowsHide:true,stdio:['pipe','pipe','pipe']});children.push(c);c.stderr.pipe(fs.createWriteStream(path.join(out,name+'.log')));return c;}
const base='http://127.0.0.1:8788';
async function api(route,body,kind='json'){const r=await fetch(base+route,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(route==='/api/report'?600000:120000)});assert.ok(r.ok,route+' '+r.status+' '+(!r.ok?await r.text():''));return kind==='bytes'?Buffer.from(await r.arrayBuffer()):kind==='text'?r.text():r.json();}
let error;
try {
 const rest=start(['--serve','--port','8788'],'rest');rest.stdout.pipe(fs.createWriteStream(path.join(out,'rest-stdout.log')));
 let ready=false;for(let i=0;i<60;i++){try{await api('/api/health');ready=true;break;}catch{}await new Promise(r=>setTimeout(r,500));}assert.ok(ready,'REST startup');
 const health=await api('/api/health'),index=await api('/api');assert.match(health.service,/geptechniek workspace/);assert.equal(health.organization,'Spanvision infra');assert.doesNotMatch(JSON.stringify(index),/OpenAEC|Open Geotechniek Studio/);record('REST identity and route catalogue',{health});
 const first=await api('/api/cpts',{content,filename:'example.gef'});
 const second=await api('/api/cpts',{content:content.replaceAll(first.id,'SV-QA-CPT-02'),filename:'second.gef'});assert.notEqual(second.id,first.id);assert.equal((await api('/api/cpts')).length,2);
 const layers=await api('/api/cpts/'+first.id+'/layers');assert.ok(layers.length>0);assert.ok((await api('/api/cpts/'+first.id+'/csv',null,'text')).length>1000);record('GEF import, retained measurements, layers and CSV',{cptId:first.id,layerCount:layers.length});
 for(const [name,ids] of [['single-cpt',[first.id]],['multiple-cpt',[first.id,second.id]]]){
  const started=Date.now();console.log('Generating '+name+' report…');
  const bytes=await api('/api/report',{cpt_ids:ids,project,sections:{cover:true,coordTable:true,map:false,perCpt:true,sbtLegend:true,metadata:true}},'bytes');assert.equal(bytes.subarray(0,4).toString(),'%PDF');fs.writeFileSync(path.join(out,name+'.pdf'),bytes);record(name+' report',{bytes:bytes.length,elapsedMs:Date.now()-started});
 }
 for(const format of ['ifc4x3','ifcx']){const exported=await api('/api/ifc',{cpt_ids:[first.id],project,format});assert.match(exported.content,/geptechniek workspace/);assert.doesNotMatch(exported.content,/Open Geotechniek Studio|OpenAEC Foundation/);fs.writeFileSync(path.join(out,format==='ifcx'?'cpt.ifcx.json':'cpt.ifc'),exported.content);record(format+' presentation');}
 const mcp=start(['--mcp'],'mcp'),pending=new Map();let id=0;
 createInterface({input:mcp.stdout}).on('line',line=>{try{const v=JSON.parse(line);const p=pending.get(v.id);if(p){pending.delete(v.id);clearTimeout(p.timer);v.error?p.reject(Error(JSON.stringify(v.error))):p.resolve(v.result);}}catch{}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const current=++id;const timer=setTimeout(()=>{pending.delete(current);reject(Error(method+' timeout'));},120000);pending.set(current,{resolve,reject,timer});mcp.stdin.write(JSON.stringify({jsonrpc:'2.0',id:current,method,params})+'\n');});
 const tool=async(name,args={})=>{const r=await call('tools/call',{name,arguments:args});assert.ok(!r.isError,JSON.stringify(r));const text=r.content.filter(c=>c.type==='text').map(c=>c.text).join('\n');try{return JSON.parse(text);}catch{return text;}};
 const init=await call('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'Spanvision QA',version:'1'}});assert.equal(init.serverInfo.name,'spanvision-geotechniek-workspace');
 const names=(await call('tools/list')).tools.map(t=>t.name);for(const n of ['cpt_open','project_save_ifcgis_full','generate_report','get_brand'])assert.ok(names.includes(n));
 fs.writeFileSync(path.join(out,'mcp-tools.json'),JSON.stringify(names,null,2)+'\n');record('MCP identity and compatible tool names',{serverInfo:init.serverInfo,toolCount:names.length});
 const tenants=await tool('list_tenants');assert.ok(tenants.some(t=>t.id==='spanvision_infra'));assert.ok(!tenants.some(t=>t.id==='openaec_foundation'));
 assert.deepEqual(await tool('get_brand',{tenant:'openaec_foundation'}),await tool('get_brand',{tenant:'spanvision_infra'}));record('Spanvision tenant and legacy identifier compatibility');
 const imported=await tool('cpt_open',{content,filename:'example.gef'});assert.deepEqual(imported,first);
 const xmlPath=path.join(out,'cpt.xml');await tool('cpt_save_as',{cpt_id:first.id,format:'bro',path:xmlPath});
 const xmlCpt=await tool('cpt_open',{content:fs.readFileSync(xmlPath,'utf8'),filename:'cpt.xml'});assert.equal(xmlCpt.id,first.id);assert.equal(xmlCpt.points.length,first.points.length);record('BRO XML export and import');
 await tool('cpt_open',{content,filename:'example.gef'});
 const legacy=path.join(out,'minimal.ifcgis');await tool('project_save_ifcgis',{project,path:legacy});assert.match(fs.readFileSync(legacy,'utf8'),/geptechniek workspace/);const minimal=await tool('project_open_ifcgis',{path:legacy});assert.equal(minimal.project.title,project.title);equivalent(minimal.cpts,[first]);record('Minimal project round trip and export identity');
 const saved=path.join(out,'full.ifcgis');const logo='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#ff3366" width="20" height="20"/></svg>').toString('base64');
 const payload={header:{schema:'ifcgis-0.4',originating_system:'geptechniek workspace · Geotechniek',timestamp:'2026-10-02T00:00:00Z'},project:{...project,type:'OpenGeoProject'},cpts:[first],bores:[{id:'customer-bore',color:'#ff3366'}],crs:{epsg:28992,name:'Amersfoort / RD New'},title_block:{project:project.title,drawn_by:'QA customer'},tekening:{paper_size:'A3',scale:1000,center:{lat:51.92,lon:4.48,zoom:15},markers:[],overlay:{id:'customer-logo',name:'Customer artwork',kind:'svg',src:logo,width_meters:20,center_lat:51.92,center_lon:4.48}},calculations:[]};
 await tool('project_save_ifcgis_full',{payload,path:saved});const round=await tool('project_open_ifcgis_full',{path:saved});equivalent(round.cpts,payload.cpts);assert.deepEqual(round.title_block,payload.title_block);assert.deepEqual(round.bores,payload.bores);assert.equal(round.tekening.overlay.src,logo);assert.equal(round.tekening.scale,1000);record('Full project round trip preserves data, paper, scale and customer artwork');
 const snapshot=path.join(out,'cpt.ifcgeo');await tool('cpt_save_as',{cpt_id:first.id,format:'ifcgeo',path:snapshot});const expectedSnapshot=structuredClone(first);expectedSnapshot.metadata.source_file='cpt.ifcgeo';equivalent(await tool('cpt_open',{content:fs.readFileSync(snapshot,'utf8'),filename:'cpt.ifcgeo'}),expectedSnapshot);record('Raw IFCGEO snapshot preserves CPT data and records the imported filename');
 await tool('generate_report',{tenant:'spanvision_infra',output_path:path.join(out,'tenant-report.pdf'),report:{template:'constructie_rapport',format:'A3',orientation:'Landscape',project:project.title,client:project.client,author:project.author,date:project.date,sections:[{title:'Customer content',blocks:[{type:'paragraph',text:'Customer content and engineering graphics remain unchanged. José · λ'}]}]}});record('Tenant report generation');
} catch(e){error=e.message;console.error(e.stack);} finally {for(const c of children)c.kill();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,error:error||null},null,2)+'\n');}
if(error)process.exitCode=1;
