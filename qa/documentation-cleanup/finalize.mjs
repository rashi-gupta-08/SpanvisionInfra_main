import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {root,brand,fingerprint,digest} from '../../branding/common.mjs';

const out=path.join(root,'qa/documentation-cleanup');
const results=JSON.parse(fs.readFileSync(path.join(out,'results.json'),'utf8'));
const plan=JSON.parse(fs.readFileSync(path.join(out,'plan.json'),'utf8'));
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const roots=[...new Set(plan.moves.map(e=>e.moduleRoot))];
for(const toolRoot of roots){
 if(toolRoot==='open-vision-studio')continue;
 const file=path.join(root,toolRoot,'README.md');
 if(!fs.existsSync(file))continue;
 let text=fs.readFileSync(file,'utf8');
 if(text.includes('## Documentation archive'))continue;
 text=text.trimEnd()+`\n\n## Documentation archive\n\nHistorical plans, research, logs and superseded source documentation have moved out of this tool to [the suite source archive](../source-provenance/${toolRoot}/). Current run instructions, useful technical guides, in-app Help and required source/license notices remain with the application.\n`;
 fs.writeFileSync(file,text);
}

const verified=[];
for(const moved of plan.moves){
 if(fs.existsSync(path.join(root,moved.path)))throw new Error(`Still present: ${moved.path}`);
 if(sha(path.join(root,moved.destination))!==moved.sha256)throw new Error(`Archive content changed: ${moved.destination}`);
 verified.push(moved.path);
}
const protectedEntries=plan.retained.filter(e=>/(^|\/)(public|legal)(\/|$)|license|notice|attribution|copyright/i.test(e.relative));
for(const e of protectedEntries)if(sha(path.join(root,e.path))!==e.sha256)throw new Error(`Protected content changed: ${e.path}`);

const movedSources=new Set(plan.moves.map(e=>path.resolve(root,e.path).toLowerCase()));
const brokenMovedLinks=[];
const existingArchiveLinks=[];
for(const e of plan.retained){
 const file=path.join(root,e.path),text=fs.readFileSync(file,'utf8');
 for(const match of text.matchAll(/\]\((<?)([^)\r\n]+?)(>?)\)/g)){
   const target=match[2].split('#')[0];
   if(!target||/^[a-z][a-z0-9+.-]*:|^\/\//i.test(target))continue;
   const absolute=path.resolve(path.dirname(file),target.replaceAll('%20',' '));
   if(movedSources.has(absolute.toLowerCase()))brokenMovedLinks.push({file:e.path,target});
   if(absolute.toLowerCase().startsWith(path.join(root,'source-provenance').toLowerCase()+path.sep)){
      if(!fs.existsSync(absolute))throw new Error(`Broken archive link: ${e.path}: ${target}`);
      existingArchiveLinks.push({file:e.path,target});
   }
 }
}
if(brokenMovedLinks.length)throw new Error(JSON.stringify(brokenMovedLinks));
const buildModules=[{id:'hub',directory:'suite-hub',dist:'dist'},...brand.modules];
for(const module of buildModules){
 const stamp=JSON.parse(fs.readFileSync(path.join(root,module.directory,module.dist,'suite-build.json'),'utf8'));
 if(stamp.sourceFingerprint!==fingerprint(module)||stamp.brandDigest!==digest(module.id==='hub'?undefined:module))throw new Error(`Build is stale: ${module.id}`);
}
const status=await(await fetch('http://127.0.0.1:4230/__suite/status')).json();
const available=status.modules.filter(module=>module.available).length;
if(available!==16)throw new Error('Not all tool previews are available');
const report={checkedAt:new Date().toISOString(),archivedFilesVerified:verified.length,protectedFilesUnchanged:protectedEntries.length,archiveLinksVerified:existingArchiveLinks.length,brokenMovedLinks,modules:roots.map(toolRoot=>({directory:toolRoot,archived:plan.moves.filter(e=>e.moduleRoot===toolRoot).length})),refreshedBuilds:results.changedBuilds,currentBuilds:buildModules.length,availableTools:available};
fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
