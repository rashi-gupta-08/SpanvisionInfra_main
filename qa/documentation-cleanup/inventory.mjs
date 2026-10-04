import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root,brand} from '../../branding/common.mjs';

const directory=path.join(root,'qa/documentation-cleanup');fs.mkdirSync(directory,{recursive:true});
const excluded=['node_modules','target','dist','dist-preview','.git','.venv','venv','site-packages','gen','artifacts','qa','vendor','vendored','deps','libs','build','binaries','bin','runtimes','__pycache__','.cache','dependency-licenses','licenses'];
const modules=brand.modules.filter(m=>!['cad','cad2d'].includes(m.id)).map(m=>({...m,documentationRoot:m.id==='pdf'?'spanvision-pdf-workspace':m.directory}));
const entries=[];
for(const module of modules){
  const args=['--files','--hidden','-g','*.md','-g','*.MD',...excluded.flatMap(name=>['-g',`!**/${name}/**`]),module.documentationRoot];
  const result=spawnSync('rg',args,{cwd:root,encoding:'utf8',windowsHide:true});
  if(result.status!==0&&result.status!==1)throw new Error(result.stderr);
  const files=result.stdout.trim().split(/\r?\n/).filter(Boolean);
  for(const file of files){const relative=path.relative(path.join(root,module.documentationRoot),path.join(root,file)).replaceAll('\\','/');entries.push({module:module.id,tool:module.label,moduleRoot:module.documentationRoot,path:file.replaceAll('\\','/'),relative,bytes:fs.statSync(path.join(root,file)).size});}
}
fs.writeFileSync(path.join(directory,'inventory.json'),JSON.stringify({checkedAt:new Date().toISOString(),excluded,entries},null,2)+'\n');
for(const module of modules){
 const list=entries.filter(e=>e.module===module.id),dirs={};
 for(const e of list){const key=e.relative.includes('/')?e.relative.split('/')[0]:'(root)';dirs[key]=(dirs[key]||0)+1;}
 console.log(JSON.stringify({module:module.id,count:list.length,directories:dirs,rootFiles:list.filter(e=>!e.relative.includes('/')).map(e=>e.relative),nonPublic:list.filter(e=>!e.relative.startsWith('public/')&&!e.relative.includes('/public/')&&!/(^|\/)(legal|licenses|dependency-licenses)(\/|$)/i.test(e.relative)&&!/(license|notices?|attribution|copyright)/i.test(path.basename(e.relative))).length}));
}
