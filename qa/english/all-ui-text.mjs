import fs from 'node:fs';
import path from 'node:path';
import ts from '../../calc-workspace/node_modules/typescript/lib/typescript.js';
function files(dir){if(!fs.existsSync(dir))return [];return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(['node_modules','dist','target','vendor','locales','__tests__','wasm','i18n'].includes(e.name)?[]:files(path.join(dir,e.name))):[path.join(dir,e.name)]);}
const roots={calculation:'vision-calculation-studio/packages/desktop/src',geo:'spanvision-geptechniek-workspace/apps/desktop/src',frame:'frame-vision-studio/ui/src',bim:'vision-bim-validator/viewer/src',cad2d:'spanvision-2d-cad-workspace/src',pdf:'spanvision-pdf-workspace/open-pdf-studio/js',fem:'fem-vision-studio/src'};
const out={};
for(const [id,root] of Object.entries(roots)){
 const rows=[];
 for(const file of files(root).filter(f=>/\.(tsx?|jsx?|svelte)$/.test(f)&&!/\.test\./.test(f))){
  const text=fs.readFileSync(file,'utf8');
  if(file.endsWith('.svelte')){for(const m of text.matchAll(/>([^<>\n{}]+)</g))if(/[a-zA-Z]{2}/.test(m[1]))rows.push({file,text:m[1].trim()});continue;}
  const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  function visit(n){if(n.parent&&(ts.isJsxText(n)||ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)||ts.isTemplateHead(n)||ts.isTemplateMiddle(n)||ts.isTemplateTail(n))&&/[a-zA-Z]{2}/.test(n.text)){
   const p=n.parent;
   const property=ts.isPropertyAssignment(p)&&p.initializer===n&&['label','name','title','description','hint','invoke','caption','placeholder','help','tooltip','defaultValue','shortDescription','uitleg'].includes(p.name.getText(source));
   const attribute=ts.isJsxAttribute(p)&&['title','placeholder','aria-label','alt'].includes(p.name.text);
   const conditional=ts.isConditionalExpression(p)&&p.condition!==n;
   if(ts.isJsxText(n)||property||attribute||ts.isJsxExpression(p)||conditional)rows.push({file,text:n.text.trim()});
  }ts.forEachChild(n,visit);}visit(source);
 }
 out[id]=rows;
}
fs.writeFileSync('qa/english/all-ui-text.json',JSON.stringify(out,null,2));
const lists=Object.fromEntries(Object.entries(out).map(([id,rows])=>[id,[...new Set(rows.map(r=>r.text))].sort()]));
fs.writeFileSync('qa/english/all-ui-lists.json',JSON.stringify(lists,null,2));
console.log(Object.fromEntries(Object.entries(lists).map(([id,rows])=>[id,rows.length])));
