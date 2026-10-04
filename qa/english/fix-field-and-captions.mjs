import fs from 'node:fs';
import vm from 'node:vm';
import ts from '../../calc-workspace/node_modules/typescript/lib/typescript.js';
const lang=vm.runInNewContext(fs.readFileSync('spanvision-field-workspace/public/lang.js','utf8')+';LANG');
const map={...Object.fromEntries(Object.keys(lang.nl).filter(k=>lang.en[k]&&lang.en[k]!==lang.nl[k]).map(k=>[lang.nl[k],lang.en[k]])),
 'Rekenwijze':'Calculation method','Grondslagen (NEN-EN 1990 + NB)':'Basis of design (NEN-EN 1990 + NB)',
 'Nieuw project':'New project','Voorbeeld':'Preview','PDF opslaan':'Save PDF','Afgeleid: K':'Derived: K',
 'I — kust':'I — coast','II — overgang':'II — transition','III — binnenland':'III — inland',
 'Standaard 67mm Meranti':'Standard 67 mm Meranti','Standaard 67mm Accoya':'Standard 67 mm Accoya',
 'Zwaar 78mm Meranti':'Heavy 78 mm Meranti','Passief 90mm Meranti':'Passive 90 mm Meranti',
 'Kunststof 82mm VEKA Softline':'uPVC 82 mm VEKA Softline','Kunststof 88mm Kömmerling':'uPVC 88 mm Kömmerling',
 'Hefschuif':'Lift-and-slide','Hefschuifdeur':'Lift-and-slide door','Stolp':'French casement','💾 Opslaan als sjabloon':'💾 Save as template',
 'Kunststof':'uPVC','Hout-aluminium':'Timber-aluminum',
 'Bepaalt K_FI (Table NB.A1.1): CC1 → 0,90 · CC2 → 1,00 · CC3 → 1,10. Elk blad krijgt zowel CC als K_FI.':'Defines K_FI (Table NB.A1.1): CC1 → 0.90 · CC2 → 1.00 · CC3 → 1.10. Each sheet receives both CC and K_FI.'};
const htmlFile='spanvision-field-workspace/index.html';
let html=fs.readFileSync(htmlFile,'utf8');
html=html.replace(/>([^<>]+)</g,(m,text)=>map[text.trim()]?'>'+text.replace(text.trim(),map[text.trim()])+'<':m);
html=html.replace(/((?:title|placeholder|alt)=["'])([^"']+)(["'])/g,(m,start,text,end)=>map[text]?start+map[text]+end:m);
fs.writeFileSync(htmlFile,html);
const fieldFile='spanvision-field-workspace/public/app.js';
const files=[fieldFile,'vision-calculation-studio/packages/desktop/src/store/projectGegevens.ts','vision-calculation-studio/packages/desktop/src/store/projectStore.ts','vision-calculation-studio/packages/desktop/src/components/calc/ProjectGegevensPanel.tsx','vision-calculation-studio/packages/desktop/src/components/calc/WindAreaMap.tsx','vision-calculation-studio/packages/desktop/src/components/ribbon/CalcTab.tsx'];
for(const file of files){const text=fs.readFileSync(file,'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS),edits=[];
 function visit(n){if(n.parent&&(ts.isStringLiteral(n)||ts.isJsxText(n))&&map[n.text.trim()]){
 const p=n.parent;const code=(ts.isPropertyAssignment(p)&&(p.name===n||['category','role','id','value'].includes(p.name.getText(source))))||ts.isBinaryExpression(p)||ts.isArrayLiteralExpression(p);
 if(!code)edits.push({start:n.getStart(source),end:n.end,value:ts.isJsxText(n)?n.getText(source).replace(n.text.trim(),map[n.text.trim()]):ts.isJsxAttribute(p)?'{'+JSON.stringify(map[n.text.trim()])+'}':JSON.stringify(map[n.text.trim()])});
 }ts.forEachChild(n,visit);}visit(source);let after=text;for(const e of edits.sort((a,b)=>b.start-a.start))after=after.slice(0,e.start)+e.value+after.slice(e.end);
 if(file===fieldFile)after=after.replaceAll("'nl-NL'","'en-GB'").replaceAll('Gegenereerd met Field Workspace','Generated with Field Workspace').replaceAll(' op ${new Date()',' on ${new Date()');
 fs.writeFileSync(file,after);
}
for(const file of ['frame-vision-studio/ui/src/components/shell/Ribbon.svelte','frame-vision-studio/ui/src/lib/layout.js','frame-vision-studio/ui/src/components/editor/CellContextMenu.svelte','frame-vision-studio/ui/src/components/profile-editor/ProfileParams.svelte','frame-vision-studio/ui/src/components/project/DashboardView.svelte']){
 let text=fs.readFileSync(file,'utf8');for(const [from,to] of Object.entries(map))text=text.replaceAll(JSON.stringify(from),JSON.stringify(to)).replaceAll('>'+from+'<','>'+to+'<');text=text.replace('💾 Opslaan als sjabloon','💾 Save as template');fs.writeFileSync(file,text);
}
const speech='spanvision-speech-workspace/src/lib/localData.ts';let speechText=fs.readFileSync(speech,'utf8').replace('language:"en",ui_language:"en",model_name','model_name');fs.writeFileSync(speech,speechText);
const drawing='spanvision-2d-cad-workspace/src/components/panels/DrawingPropertiesPanel.tsx';fs.writeFileSync(drawing,fs.readFileSync(drawing,'utf8').replaceAll('.toLocaleDateString()',".toLocaleDateString('en-GB')"));
const drafts='spanvision-2d-cad-workspace/src/components/web/WebApp.tsx';fs.writeFileSync(drafts,fs.readFileSync(drafts,'utf8').replace('toLocaleString(undefined,',"toLocaleString('en-GB',"));
console.log('Updated legacy field interface, template captions and date labels.');
