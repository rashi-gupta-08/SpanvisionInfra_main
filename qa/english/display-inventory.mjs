import fs from 'node:fs';
import ts from '../../calc-workspace/node_modules/typescript/lib/typescript.js';
const old=JSON.parse(fs.readFileSync('qa/english/dutch-inventory.json','utf8'));
const dutch=/\b(bestand(?:en)?|opslaan|sluiten|annuleren|nieuw(?:e)?|weergave|instelling(?:en)?|bereken(?:ing(?:en)?)?|verwijder(?:en)?|toevoegen|bewerken|eigenschappen|selecteer|tekening(?:en)?|venster|materiaal|beton|hout|staal|belasting(?:en)?|resulta(?:at|ten)|rapport|gegev(?:en|ens)|onderdeel|totaal|geen|vul|bekijk|herstel|breedte|hoogte|lengte|grond|paal|sondering(?:en)?|gebruik|gereed|fout|waarschuwing|invoer|uitvoer|druk|trek|reken(?:en)?|ontwerp|taal|kopieer|plak|helptekst|begroting|uitgebreid|afdrukken|afmetingen|wijzig(?:en)?|zoeken|zonder|met|kies|naar|van|op|voor|uit|aantal|horizontaal|verticaal|delen|bevestigen|laden|geladen|verbinding|werkvlak|knip|terug|volgende|naam|omschrijving|statussen|standaard)\b/i;
const result={};
for(const [id,rows] of Object.entries(old)){
 const found=[];
 for(const file of [...new Set(rows.map(r=>r.file))]){
  const text=fs.readFileSync(file,'utf8');
  if(file.endsWith('.svelte')){
   for(const m of text.matchAll(/>([^<>\n{}]+)</g))if(dutch.test(m[1]))found.push({file,text:m[1].trim(),kind:'markup'});
   for(const m of text.matchAll(/(?:title|placeholder|aria-label|alt|label)[=:]\s*["']([^"']+)["']/g))if(dutch.test(m[1]))found.push({file,text:m[1],kind:'attribute'});
  }else{
   const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
   function visit(n){
    if(n.parent&&(ts.isJsxText(n)||ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)||ts.isTemplateHead(n)||ts.isTemplateMiddle(n)||ts.isTemplateTail(n))&&dutch.test(n.text)){
     const p=n.parent;
     const property=ts.isPropertyAssignment(p)&&p.initializer===n&&['label','name','title','description','hint','invoke','caption','placeholder','help','tooltip','defaultValue','shortDescription'].includes(p.name.getText(source));
     const attribute=ts.isJsxAttribute(p)&&['title','placeholder','aria-label','alt'].includes(p.name.text);
     let ancestor=p;while(ancestor&&!ts.isJsxExpression(ancestor)&&!ts.isCallExpression(ancestor))ancestor=ancestor.parent;
     if((ts.isJsxText(n)||property||attribute||ancestor&&ts.isJsxExpression(ancestor))&&!/[a-z]-[a-z]|\.\//.test(n.text)&&!(ts.isPropertyAssignment(p)&&p.name===n))found.push({file,text:n.text.trim(),kind:ts.SyntaxKind[n.kind]});
    }
    ts.forEachChild(n,visit);
   }visit(source);
  }
 }
 result[id]=found;
}
fs.writeFileSync('qa/english/display-inventory.json',JSON.stringify(result,null,2));
for(const [id,rows] of Object.entries(result))console.log(id+': '+rows.length);
