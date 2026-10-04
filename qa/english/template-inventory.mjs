import fs from 'node:fs';
import path from 'node:path';
import ts from '../../calc-workspace/node_modules/typescript/lib/typescript.js';
const dir='vision-calculation-studio/packages/desktop/src/templates';
const rows=[];
for(const name of fs.readdirSync(dir).filter(f=>f.endsWith('.ts'))){
 const file=path.join(dir,name),text=fs.readFileSync(file,'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 function visit(n){if(ts.isNoSubstitutionTemplateLiteral(n)){
 let select=false,svg=false,hide=false;
 for(const line of n.text.split('\n')){
  const s=line.trim();if(s.startsWith('@select ')){select=true;rows.push(s.match(/"(.*)"/)?.[1]??'');continue;}
  if(s==='@svg'){svg=true;continue;}if(s==='@end'){select=false;svg=false;continue;}
  if(s==='#hide'){hide=true;continue;}if(s==='#show'){hide=false;continue;}
  if(select){rows.push(s.replace(/\s*=.*$/,''));continue;}
  if(svg){for(const m of s.matchAll(/<text[^>]*>([^<]+)<\/text>/g))rows.push(m[1]);continue;}
  if(hide)continue;
  if(/^"|^'|^#{1,6} /.test(s)){rows.push(s.replace(/^(?:"|'|#{1,6} )/,''));continue;}
  for(const m of s.matchAll(/'([^']*)'/g))rows.push(m[1]);
 }
 }ts.forEachChild(n,visit);}visit(source);
}
const unique=[...new Set(rows.filter(s=>/[a-zA-Z]{2}/.test(s)))];
fs.writeFileSync('qa/english/template-text.json',JSON.stringify(unique,null,2));
console.log(`${unique.length} built-in calculation labels and prose fragments.`);
