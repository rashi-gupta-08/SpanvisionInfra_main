import fs from 'node:fs';
import path from 'node:path';
import ts from '../../calc-workspace/node_modules/typescript/lib/typescript.js';
const brand=JSON.parse(fs.readFileSync('branding/brand.json','utf8'));
const inventory=JSON.parse(fs.readFileSync('qa/english/dutch-inventory.json','utf8'));
const map=new Map();
const flatten=(obj,prefix='',out={})=>{for(const [k,v] of Object.entries(obj)){const key=prefix?prefix+'.'+k:k;if(typeof v==='string')out[key]=v;else if(v&&typeof v==='object')flatten(v,key,out);}return out;};
function pairs(nlFile,enFile){if(!fs.existsSync(nlFile)||!fs.existsSync(enFile))return;const nl=flatten(JSON.parse(fs.readFileSync(nlFile,'utf8'))),en=flatten(JSON.parse(fs.readFileSync(enFile,'utf8')));for(const [key,value] of Object.entries(nl))if(en[key]&&value!==en[key])map.set(value,en[key]);}
function files(dir){if(!fs.existsSync(dir))return [];return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(['node_modules','dist','target','vendor','wasm','__tests__'].includes(e.name)?[]:files(path.join(dir,e.name))):[path.join(dir,e.name)]);}
for(const module of brand.modules){
 const base=module.id==='pdf'?module.directory+'/js/i18n':module.id==='ifc'?'ifc-view/apps/desktop/src/i18n':module.id==='calculation'?'vision-calculation-studio/packages/desktop/src/i18n':module.directory+'/'+(module.frontendDirectory?module.frontendDirectory+'/':'')+'src/i18n';
 for(const file of files(base).filter(f=>/[/\\]locales[/\\]nl[/\\].*\.json$/.test(f)))pairs(file,file.replace(/([/\\]locales[/\\])nl([/\\])/,'$1en$2'));
 pairs(base+'/locales/nl.json',base+'/locales/en.json');
}
pairs('frame-vision-studio/ui/src/locales/nl.json','frame-vision-studio/ui/src/locales/en.json');
Object.entries(JSON.parse(fs.readFileSync('qa/english/manual-translations.json','utf8'))).forEach(([nl,en])=>map.set(nl,en));
Object.entries(JSON.parse(fs.readFileSync('qa/english/more-translations.json','utf8'))).forEach(([nl,en])=>map.set(nl,en));
const edits=[],remaining={};
for(const [id,rows] of Object.entries(inventory)){
 const moduleFiles=[...new Set(rows.map(r=>r.file))];
 for(const file of moduleFiles){
  if(file.includes('i18n')||file.includes('translations.ts'))continue;
  const source=fs.readFileSync(file,'utf8');const replacements=[];
  const parsed=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  function visit(node){
   const key=typeof node.text==='string'?node.text.trim():'';const translated=map.get(key);
   if(translated){
    const p=node.parent;
    const isValue=ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node);
    const attribute=ts.isJsxAttribute(p)&&['title','placeholder','aria-label','alt'].includes(p.name.text);
    const property=ts.isPropertyAssignment(p)&&p.initializer===node&&['label','name','title','description','hint','invoke','message','caption','placeholder','help','tooltip','defaultValue','shortDescription'].includes(p.name.getText(parsed));
    const displayExpression=ts.isJsxExpression(p)||ts.isConditionalExpression(p)||ts.isBinaryExpression(p)||ts.isReturnStatement(p)||ts.isArrayLiteralExpression(p);
    const call=ts.isCallExpression(p)&&/alert|confirm|prompt|toast|notify|Error|setError|setMessage|setStatus|pushWarning|console/i.test(p.expression.getText(parsed));
    if(ts.isJsxText(node)){
     const raw=node.getText(parsed);replacements.push({start:node.getStart(parsed),end:node.end,text:raw.replace(key,translated)});
    }else if(isValue&&(attribute||property||displayExpression||call))replacements.push({start:node.getStart(parsed),end:node.end,text:JSON.stringify(translated)});
    else if(ts.isTemplateHead(node)||ts.isTemplateMiddle(node)||ts.isTemplateTail(node)){
     const raw=node.getText(parsed);if(raw.includes(key))replacements.push({start:node.getStart(parsed),end:node.end,text:raw.replace(key,translated)});
    }
   }
   ts.forEachChild(node,visit);
  }
  if(!file.endsWith('.svelte'))visit(parsed);
  else {
   // Svelte markup and label/tooltip properties, preserving machine identifiers.
   for(const [nl,en] of map){
    if(!source.includes(nl))continue;
    const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const patterns=[new RegExp(`>(\\s*)${escape(nl)}(\\s*)<`,'g'),new RegExp(`((?:title|placeholder|aria-label|alt)=)"${escape(nl)}"`,'g'),new RegExp(`((?:label|title|description|hint):\\s*)"${escape(nl)}"`,'g')];
    for(let index=0;index<patterns.length;index++)for(const match of source.matchAll(patterns[index]))replacements.push({start:match.index,end:match.index+match[0].length,text:index===0?`>${match[1]}${en}${match[2]}<`:`${match[1]}${JSON.stringify(en)}`});
   }
  }
  const sorted=replacements.sort((a,b)=>b.start-a.start);let after=source,last=Infinity;
  for(const r of sorted){if(r.end>last)continue;after=after.slice(0,r.start)+r.text+after.slice(r.end);last=r.start;}
  if(after!==source){fs.writeFileSync(file,after);edits.push({file,count:replacements.length});}
 }
 remaining[id]=rows.filter(r=>!map.has(r.text)).map(r=>({file:r.file,line:r.line,text:r.text}));
}
fs.writeFileSync('qa/english/known-translations.json',JSON.stringify({edits,remaining},null,2));
console.log(`${edits.length} files translated using matching English source labels.`);
