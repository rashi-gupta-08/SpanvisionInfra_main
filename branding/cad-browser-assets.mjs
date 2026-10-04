// Refresh standalone browser assets only when the validated native build is unchanged.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {root,brand,files,fingerprint,digest,write} from './common.mjs';
const module=brand.modules.find(item=>item.id==='cad');
const base=path.join(root,module.directory),dist=path.join(base,module.dist);
const snapshot=path.join(root,'qa/motion/cad-browser-baseline.json');
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const assets=['appearance.js','appearance.css'];
function nativeInputs(){
  const inputs=['src','site','assets','locales','web'].flatMap(directory=>files(path.join(base,directory))).filter(file=>/\.(tsx?|jsx?|css|html|json|rs|ftl|svg|mjs)$/.test(file)&&!assets.some(name=>file===path.join(base,'web',name)));
  for(const name of ['brand.json','package.json','index.html','preview.html','web-app.html','Cargo.toml'])if(fs.existsSync(path.join(base,name)))inputs.push(path.join(base,name));
  return Object.fromEntries([...new Set(inputs)].sort().map(file=>[path.relative(base,file),sha(file)]));
}
function engineArtifacts(){
  return Object.fromEntries(files(path.join(dist,'app')).filter(file=>/\.(wasm|js)$/.test(file)&&!assets.some(name=>file===path.join(dist,'app',name))).sort().map(file=>[path.relative(dist,file),sha(file)]));
}
if(process.argv[2]==='prepare'){
  const stamp=JSON.parse(fs.readFileSync(path.join(dist,'suite-build.json'),'utf8'));
  assert.equal(stamp.sourceFingerprint,fingerprint(module),'Start from a verified, current native build');
  assert.equal(stamp.brandDigest,digest(module));
  const engines=engineArtifacts();assert.ok(Object.keys(engines).some(name=>name.endsWith('.wasm')));
  write(path.relative(root,snapshot),JSON.stringify({stamp,native:nativeInputs(),engines},null,2)+'\n');
  console.log('Captured the validated CAD inputs and engine hashes.');
}else if(process.argv[2]==='refresh'){
  const before=JSON.parse(fs.readFileSync(snapshot,'utf8'));
  assert.equal(before.stamp.brandDigest,digest(module),'Brand changed; a full build is required');
  assert.deepEqual(nativeInputs(),before.native,'Native inputs changed; a full build is required');
  assert.deepEqual(engineArtifacts(),before.engines,'Engine outputs changed; a full build is required');
  for(const name of assets){
    const source=path.join(base,'web',name),target=path.join(dist,'app',name);
    fs.copyFileSync(source,target);assert.equal(sha(source),sha(target));
  }
  write(path.relative(root,path.join(dist,'suite-build.json')),JSON.stringify({id:'cad',brandDigest:digest(module),sourceFingerprint:fingerprint(module),builtAt:new Date().toISOString(),nativeBuiltAt:before.stamp.nativeBuiltAt||before.stamp.builtAt,buildKind:'browser-assets'},null,2)+'\n');
  assert.deepEqual(nativeInputs(),before.native);
  assert.deepEqual(engineArtifacts(),before.engines);
  console.log('CAD browser assets refreshed; native inputs and compiled engine are unchanged.');
}else throw new Error('Use prepare before editing browser assets, then refresh.');
