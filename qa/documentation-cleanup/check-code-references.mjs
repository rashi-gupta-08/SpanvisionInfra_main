import fs from 'node:fs';
import path from 'node:path';
import {root} from '../../branding/common.mjs';

const out=path.join(root,'qa/documentation-cleanup');
const results=JSON.parse(fs.readFileSync(path.join(out,'results.json'),'utf8'));
const undoArchiveReferences=text=>text.replace(/\.\.\/source-provenance\/[^/]+\//g,'');
const checks=[];
for(const changed of results.updatedLinks){
 if(!/\.(ts|tsx|js|jsx|mjs|rs|py|sh)$/.test(changed.path))continue;
 const current=fs.readFileSync(path.join(root,changed.path),'utf8');
 const original=fs.readFileSync(path.join(out,'original-links',changed.path),'utf8');
 if(undoArchiveReferences(original)!==undoArchiveReferences(current))throw new Error(`Source difference beyond archived-document paths: ${changed.path}`);
 checks.push({file:changed.path,kind:'Only archived-document paths changed; all other text identical'});
}
fs.writeFileSync(path.join(out,'code-reference-checks.json'),JSON.stringify({checkedAt:new Date().toISOString(),checks},null,2)+'\n');
console.log(`PASS: ${checks.length} code/script files changed only archived-document paths; all other source text is identical.`);
