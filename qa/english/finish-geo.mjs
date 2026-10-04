import fs from 'node:fs';
import path from 'node:path';
import ts from '../../calc-workspace/node_modules/typescript/lib/typescript.js';
const root='spanvision-geptechniek-workspace/apps/desktop/src';
const norm=s=>s.trim().replace(/\s+/g,' ');
const map=new Map(Object.entries(JSON.parse(fs.readFileSync('qa/english/geo-ui-translations.json','utf8'))).map(([k,v])=>[norm(k),v]));
const fragments=new Map(Object.entries({'bijsnijden':'crop','bv. Hoofdgebouw paalfundering':'e.g. Main building pile foundation','bv. S':'e.g. S','bedrijven) staat in':'companies) is in','bestand komt te staan wanneer je het project opslaat — IFC5-alpha (IFCX) shaped JSON met IfcProject, IfcSite, IfcBorehole, IfcAnnotation entities en cross-references via':'file when you save the project: IFC5-alpha (IFCX) JSON with IfcProject, IfcSite, IfcBorehole and IfcAnnotation entities, and cross-references through','elementen.':'elements.','functie hebben (ifcgis-0.4+). Herstart de Tauri-dev-app als je net een nieuwe cpt-core build hebt gemaakt.':'function (ifcgis-0.4+). Restart the desktop development app after rebuilding cpt-core.','geotechnisch grondonderzoek':'geotechnical ground investigation','geselecteerd':'selected','laag/lagen — Σ van per-laag bijdragen':'layers — sum of the contributions per layer','lagen ·':'layers ·','m diepte':'m depth','metingen':'measurements','niet getoond':'hidden','om te verplaatsen (cursor volgt; klik commit, Esc cancelt). Sleep aan een hoek-handle om te schalen.':'to move (follows the cursor; click to place, Esc to cancel). Drag a corner handle to resize.','punten ·':'points ·','slagen':'blows','slagen per':'blows per','tijdseries':'time series','tot NAP':'to NAP','verdere bedrijven niet getoond. De catalogus (':'additional companies hidden. The catalog (','wapeningskorf':'reinforcement cage'}));
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(e.name==='i18n'?[]:files(path.join(dir,e.name))):[path.join(dir,e.name)]);}
let count=0;
for(const file of files(root).filter(f=>/\.(tsx?|jsx?)$/.test(f)&&!f.includes('sondeerbedrijven'))){
 const before=fs.readFileSync(file,'utf8'),source=ts.createSourceFile(file,before,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS),edits=[];
 function visit(n){
  if(n.parent&&(ts.isJsxText(n)||ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))){
   const p=n.parent,key=norm(n.text);
   const value=map.get(key)??((ts.isJsxText(n)||ts.isJsxAttribute(p))?fragments.get(key):undefined);
   if(value!==undefined&&!(ts.isPropertyAssignment(p)&&p.name===n)){
    const text=ts.isJsxText(n)?n.getText(source).replace(n.text.trim(),value):ts.isJsxAttribute(p)?'{'+JSON.stringify(value)+'}':JSON.stringify(value);
    edits.push({start:n.getStart(source),end:n.end,text});
   }
  }ts.forEachChild(n,visit);
 }visit(source);
 let after=before;for(const e of edits.sort((a,b)=>b.start-a.start))after=after.slice(0,e.start)+e.text+after.slice(e.end);
 if(after!==before){fs.writeFileSync(file,after);count+=edits.length;}
}
const status=root+'/components/StatusBar.tsx';fs.writeFileSync(status,fs.readFileSync(status,'utf8').replace('useTranslation();','useTranslation("cpt");').replace('"Sonderingen"','"CPTs"'));
const en=root+'/i18n/locales/en/cpt.json',data=JSON.parse(fs.readFileSync(en,'utf8'));data.fileMetadata='File metadata';fs.writeFileSync(en,JSON.stringify(data,null,2)+'\n');
console.log(`Translated ${count} geotechnical labels and fixed the status bar namespace.`);
