// One-time move from suite-wide stamps to stamps scoped to each app.
// Reuse an existing build only when every source byte matches its old stamp.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {brand,root,digest,fingerprint,write} from './common.mjs';
const prior={...brand,modules:brand.modules.filter(module=>module.id!=='speech')};
const candidates=[digest(),createHash('sha256').update(JSON.stringify(prior)).digest('hex')];
for(const module of brand.modules.filter(module=>module.id!=='speech')){
 const filename=path.join(module.directory,module.dist,'suite-build.json');
 if(!fs.existsSync(path.join(root,filename)))continue;
 const stamp=JSON.parse(fs.readFileSync(path.join(root,filename),'utf8'));
 if(stamp.brandDigest===digest(module)&&stamp.sourceFingerprint===fingerprint(module))continue;
 const verified=candidates.find(candidate=>stamp.brandDigest===candidate&&stamp.sourceFingerprint===fingerprint(module,candidate));
 if(!verified){console.log(`${module.label}: source differs; rebuild required.`);continue;}
 write(filename,JSON.stringify({...stamp,brandDigest:digest(module),sourceFingerprint:fingerprint(module),stampMigration:'module-scoped; original source verified'},null,2)+'\n');
 console.log(`${module.label}: unchanged build retained with verified source.`);
}
