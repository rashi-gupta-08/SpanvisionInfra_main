import fs from 'node:fs/promises';
import path from 'node:path';
import {root,brand,fingerprint,digest} from '../../branding/common.mjs';

const modules = [];
for (const module of [{id:'hub',directory:'suite-hub',dist:'dist'},...brand.modules]) {
  const stamp = JSON.parse(await fs.readFile(path.join(root,module.directory,module.dist,'suite-build.json'),'utf8'));
  let manifest = null;
  const candidates = [path.join(root,module.directory,module.frontendDirectory||'', 'package.json'),path.join(root,module.directory,'package.json')];
  for(const file of candidates) {try {manifest = JSON.parse(await fs.readFile(file,'utf8'));break;}catch{}}
  modules.push({id:module.id,label:module.label||brand.suiteName,directory:module.directory,manifestVersion:manifest?.version||null,stamp,sourceCurrent:stamp.sourceFingerprint===fingerprint(module),brandCurrent:stamp.brandDigest===digest(module.id==='hub'?undefined:module)});
}
const response=await fetch('http://127.0.0.1:4230/__suite/status');
const status=await response.json();
const nativeArtifacts=[];
for(const module of ['field','geotechniek','pile','stl']) {
  const directory=path.join(root,'delivery',module,'windows');
  try {for(const file of await fs.readdir(directory)) {
    if(!/\.(exe|zip|json)$/i.test(file))continue;
    const stat=await fs.stat(path.join(directory,file));
    nativeArtifacts.push({module,file,path:path.join(directory,file),bytes:stat.size,modified:stat.mtime.toISOString()});
  }}catch(error){nativeArtifacts.push({module,error:error.message});}
}
const report={checkedAt:new Date().toISOString(),modules,status,nativeArtifacts};
await fs.writeFile(path.join(root,'qa/comparison/local-status.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checkedAt:report.checkedAt,modules:modules.map(m=>({id:m.id,version:m.manifestVersion,sourceCurrent:m.sourceCurrent,brandCurrent:m.brandCurrent})),availability:status.modules?.map(m=>({id:m.id,available:m.available})),nativeArtifacts},null,2));
