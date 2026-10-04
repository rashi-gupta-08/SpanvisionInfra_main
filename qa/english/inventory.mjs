import fs from 'node:fs';
import path from 'node:path';
import ts from '../../calc-workspace/node_modules/typescript/lib/typescript.js';
const brand=JSON.parse(fs.readFileSync('branding/brand.json','utf8'));
const dutch=/\b(bestand(?:en)?|opslaan|sluiten|annuleren|nieuw(?:e)?|weergave|instelling(?:en)?|bereken(?:ing(?:en)?)?|verwijder(?:en)?|toevoegen|bewerken|eigenschappen|selecteer|tekening(?:en)?|venster|materiaal|beton|hout|staal|belasting(?:en)?|resulta(?:at|ten)|rapport|gegev(?:en|ens)|onderdeel|totaal|geen|vul|bekijk|herstel|breedte|hoogte|lengte|grond|paal|sondering(?:en)?|gebruik|gereed|fout|waarschuwing|invoer|uitvoer|druk|trek|reken(?:en)?|ontwerp|taal|kopieer|plak|helptekst|begroting|uitgebreid|afdrukken|afmetingen|wijzig(?:en)?|zoeken|zoeken|zonder|met|kies|naar|van|op|voor|uit|aantal|horizontaal|verticaal|delen|bevestigen|laden|geladen|verbinding|werkvlak|knip|terug|volgende|naam|omschrijving|statussen|standaard)\b/i;
function files(dir){if(!fs.existsSync(dir))return [];return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(['node_modules','dist','target','locales','__tests__','vendor','wasm'].includes(e.name)?[]:files(path.join(dir,e.name))):[path.join(dir,e.name)]);}
const result={};
for(const module of brand.modules){
 if(module.id==='cad')continue;
 const roots=module.id==='calculation'?['vision-calculation-studio/packages/desktop/src','vision-calculation-studio/packages/web/src','vision-calculation-studio/packages/core/src']:module.id==='pdf'?[module.directory+'/js']:module.id==='stl'?[module.directory+'/web']:module.id==='ifc'?['ifc-view/apps/desktop/src']:module.frontendDirectory?[module.directory+'/'+module.frontendDirectory+'/src']:[module.directory+'/src'];
 const rows=[];
 for(const file of roots.flatMap(files).filter(f=>/\.(tsx?|jsx?|svelte)$/.test(f)&&!/(\.test\.|i18n|translations\.ts)/.test(f))){
  const text=fs.readFileSync(file,'utf8');
  if(file.endsWith('.svelte')){
   for(const match of text.matchAll(/>([^<>\n{}]+)</g))if(dutch.test(match[1]))rows.push({file,line:text.slice(0,match.index).split('\n').length,text:match[1].trim()});
  }
  const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  function visit(node){
   if((ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)||ts.isJsxText(node)||ts.isTemplateHead(node)||ts.isTemplateMiddle(node)||ts.isTemplateTail(node))&&dutch.test(node.text)){
    const p=node.parent;
    if(!(ts.isPropertyAssignment(p)&&p.name===node)&&!(ts.isJsxAttribute(p)&&!['title','placeholder','aria-label','alt'].includes(p.name.text))&&!/(import|className|\.\/|\.\.\/)/.test(node.text))rows.push({file,line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,text:node.text.trim()});
   }
   ts.forEachChild(node,visit);
  }
  visit(source);
 }
 result[module.id]=rows;
}
fs.writeFileSync('qa/english/dutch-inventory.json',JSON.stringify(result,null,2));
console.log(Object.fromEntries(Object.entries(result).map(([id,rows])=>[id,{count:rows.length,examples:rows.slice(0,9).map(x=>x.text.slice(0,100))}])));
