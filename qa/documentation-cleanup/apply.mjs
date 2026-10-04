import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {root,brand,fingerprint,digest} from '../../branding/common.mjs';

const out=path.join(root,'qa/documentation-cleanup');
const plan=JSON.parse(fs.readFileSync(path.join(out,'plan.json'),'utf8'));
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const key=file=>path.resolve(file).toLowerCase();
const under=(file,directory)=>key(file).startsWith(key(directory)+path.sep);
const archiveRoot=path.join(root,'source-provenance');
const protectedPaths=plan.retained.filter(e=>/(^|\/)(public|legal)(\/|$)|license|notice|attribution|copyright/i.test(e.relative));
const archivedBySource=new Map(plan.moves.map(e=>[key(path.join(root,e.path)),e]));
const beforeFingerprints=Object.fromEntries(brand.modules.map(m=>[m.id,fingerprint(m)]));

// Validate the complete set of exact file targets before moving any file.
for(const e of plan.moves){
 const source=path.resolve(root,e.path),target=path.resolve(root,e.destination),moduleRoot=path.resolve(root,e.moduleRoot);
 const realModuleRoot=fs.realpathSync(moduleRoot);
 if(!under(source,moduleRoot)||!under(target,archiveRoot)||!under(fs.realpathSync(source),realModuleRoot))throw new Error(`Unsafe target: ${e.path}`);
 if(!/\.md$/i.test(source)||sha(source)!==e.sha256)throw new Error(`Unexpected source: ${e.path}`);
 if(fs.existsSync(target))throw new Error(`Archive already exists: ${e.destination}`);
}

const ignore=JSON.parse(fs.readFileSync(path.join(out,'inventory.json'),'utf8')).excluded;
const extensions=['md','MD','ts','tsx','js','jsx','mjs','cjs','rs','py','html','json','yml','yaml','ps1','sh','txt','toml'];
const toolRoots=[...new Set(plan.moves.map(e=>e.moduleRoot))];
const args=['--files','--hidden',...extensions.flatMap(ext=>['-g',`*.${ext}`]),...ignore.flatMap(name=>['-g',`!**/${name}/**`]),'-g','!**/*.min.*',...toolRoots];
const listed=spawnSync('rg',args,{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});
if(listed.status!==0)throw new Error(listed.stderr);
const updated=[];
for(const listedPath of listed.stdout.trim().split(/\r?\n/).filter(Boolean)){
 const absolute=path.resolve(root,listedPath);
 if(archivedBySource.has(key(absolute))||fs.statSync(absolute).size>1024*1024)continue;
 const rel=path.relative(root,absolute).replaceAll('\\','/');
 const moduleRoot=toolRoots.find(dir=>under(absolute,path.join(root,dir)));
 if(!moduleRoot||rel.includes('/public/')||rel.includes('/legal/')||/(license|notices?|attribution|copyright)/i.test(path.basename(rel)))continue;
 let text=fs.readFileSync(absolute,'utf8'),original=text;
 // First adjust normal file-relative Markdown links; skip remote URLs.
 text=text.replace(/(\]\()(<?)([^)\r\n]+?)(>?)(\))/g,(match,left,open,target,close,right)=>{
   if(/^[a-z][a-z0-9+.-]*:|^#|^\/\//i.test(target))return match;
   const [filePart,...anchor]=target.split('#');
   const clean=filePart.replaceAll('%20',' ');
   const moved=archivedBySource.get(key(path.resolve(path.dirname(absolute),clean)));
   if(!moved)return match;
   const replacement=path.relative(path.dirname(absolute),path.join(root,moved.destination)).replaceAll('\\','/');
   return `${left}${open}${replacement}${anchor.length?'#'+anchor.join('#'):''}${close}${right}`;
 });
 // Root-relative plain references in comments, inline code and documentation.
 for(const e of plan.moves.filter(e=>e.moduleRoot===moduleRoot).sort((a,b)=>b.relative.length-a.relative.length)){
   const escaped=e.relative.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   const pattern=new RegExp(`(?<![A-Za-z0-9_./\\\\-])${escaped}(?![A-Za-z0-9_.-])`,'g');
   const target=path.relative(path.join(root,moduleRoot),path.join(root,e.destination)).replaceAll('\\','/');
   text=text.replace(pattern,target);
 }
 if(text===original)continue;
 const backup=path.join(out,'original-links',rel);
 fs.mkdirSync(path.dirname(backup),{recursive:true});fs.writeFileSync(backup,original);
 fs.writeFileSync(absolute,text);updated.push({path:rel,beforeSha256:createHash('sha256').update(original).digest('hex'),afterSha256:sha(absolute)});
}

for(const e of plan.moves){
 const source=path.resolve(root,e.path),target=path.resolve(root,e.destination);
 fs.mkdirSync(path.dirname(target),{recursive:true});
 try{fs.renameSync(source,target);}catch(error){
   if(error.code!=='EXDEV')throw error;
   fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);
   if(sha(target)!==e.sha256)throw new Error(`Archive copy verification failed: ${e.path}`);
   fs.unlinkSync(source);
 }
 if(fs.existsSync(source)||sha(target)!==e.sha256)throw new Error(`Move verification failed: ${e.path}`);
}
for(const e of protectedPaths){if(sha(path.join(root,e.path))!==e.sha256)throw new Error(`Protected content changed: ${e.path}`);}

const changedBuilds=brand.modules.filter(m=>fingerprint(m)!==beforeFingerprints[m.id]).map(m=>m.id);
const results={completedAt:new Date().toISOString(),archived:plan.moves.length,retained:plan.retained.length,archiveBytes:plan.moves.reduce((sum,e)=>sum+e.bytes,0),updatedLinks:updated,changedBuilds,protectedFilesChecked:protectedPaths.length,moves:plan.moves};
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify({archived:results.archived,retained:results.retained,updatedLinkFiles:updated.length,changedBuilds,protectedFilesChecked:protectedPaths.length,updated:updated.map(e=>e.path)},null,2));
