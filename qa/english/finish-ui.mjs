import fs from 'node:fs';
import ts from '../../calc-workspace/node_modules/typescript/lib/typescript.js';
const norm=s=>s.trim().replace(/\s+/g,' ');
const dictionary={
 ...JSON.parse(fs.readFileSync('qa/english/final-ui-translations.json','utf8')),
 'Afmeting (b×h)':'Dimensions (w×h)', 'Beweegbare vakken':'Opening cells', 'Gem. Ug glas (W/m²K)':'Average glazing Ug (W/m²K)', 'Gem. Uw-waarde':'Average Uw value', 'Geselecteerd vak':'Selected cell', 'Glaslat 20x34,5mm (isolatie/triple)':'Glazing bead 20×34.5 mm (insulated/triple)', 'Materiaalverdeling (kozijnen)':'Material distribution (frames)', 'Raamtype-verdeling (vakken)':'Window type distribution (cells)', 'Vakken':'Cells', 'g-waarde':'g value', 'Samenvoegen (splitsing opheffen)':'Merge (remove split)',
 'Isolatie EPS':'EPS insulation', 'Dubbele buiging':'Biaxial bending', 'EC3: Buiging + normaalkracht (art. 6.2.9)':'EC3: Bending and axial force (clause 6.2.9)', 'EC3: Materiaaleigenschappen (tabel 3.1)':'EC3: Material properties (Table 3.1)',
 'In een rekenblad zijn deze namen direct te gebruiken, bijvoorbeeld':'You can use these names directly in a worksheet, for example',
 'Klik een fragment om het in de editor in te voegen. Sluit dit paneel door iets in de editor te typen.':'Click a snippet to insert it into the editor. Typing in the editor closes this panel.',
 'dagen. Dit blad past die toe zoals de norm voorschrijft. De referentie-uitwerking rekent hem wél uit maar gebruikt hem niet in β(t':'days. This worksheet applies it as specified in the standard. The reference calculation evaluates it but does not use it in β(t',
 'mm · berekend':'mm · calculated', 'mm · buiging (6.11)':'mm · bending (6.11)', '· plaat h =':'· plate h =', '· plaat':'· plate',
 'EN 1990: Aanpassing referentieperiode':'EN 1990: Reference period adjustment', 'EN 1990: BGT combinaties (SLS)':'EN 1990: Serviceability combinations (SLS)', 'EN 1990: Belastingcombinaties compleet':'EN 1990: Complete load combinations', 'EN 1990: Geotechnisch (groep C)':'EN 1990: Geotechnical (group C)', 'EN 1990: Rekenwaarden en toetsing':'EN 1990: Design values and checks', 'EN 1990: UGT Aardbeving':'EN 1990: Seismic ultimate limit state', 'EN 1990: UGT Buitengewoon (brand/schok)':'EN 1990: Accidental ultimate limit state (fire/impact)', 'EN 1990: UGT Fundamenteel (STR/GEO)':'EN 1990: Fundamental ultimate limit state (STR/GEO)', 'EN 1990: UGT Statisch evenwicht (EQU)':'EN 1990: Static equilibrium ultimate limit state (EQU)', 'EN 1991-1-3: Sneeuwbelasting (NL)':'EN 1991-1-3: Snow load (Netherlands)', 'EN 1991-1-4: Windbelasting (NL)':'EN 1991-1-4: Wind load (Netherlands)'
};
for(const prefix of ['Endpoint snap','Midpoint snap','Intersection snap','Page setup','Toggle header','Toggle footer','Include diagrams'])dictionary[prefix+' (binnenkort beschikbaar)']=prefix+' (coming soon)';
const map=new Map(Object.entries(dictionary).map(([k,v])=>[norm(k),v]));
const inventory=JSON.parse(fs.readFileSync('qa/english/all-ui-text.json','utf8'));
const files=[...new Set(['frame','fem','bim','calculation'].flatMap(id=>inventory[id].map(row=>row.file)))];
let count=0;
for(const file of files){
 const before=fs.readFileSync(file,'utf8');let after=before;
 if(file.endsWith('.svelte')){for(const [k,v]of map)after=after.replaceAll(k,v);}
 else {
  const source=ts.createSourceFile(file,before,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS),edits=[];
  function visit(n){if(n.parent&&(ts.isJsxText(n)||ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))){const p=n.parent,value=map.get(norm(n.text));if(value!==undefined&&!(ts.isPropertyAssignment(p)&&p.name===n))edits.push({start:n.getStart(source),end:n.end,text:ts.isJsxText(n)?n.getText(source).replace(n.text.trim(),value):ts.isJsxAttribute(p)?'{'+JSON.stringify(value)+'}':JSON.stringify(value)});}ts.forEachChild(n,visit);}visit(source);
  for(const e of edits.sort((a,b)=>b.start-a.start))after=after.slice(0,e.start)+e.text+after.slice(e.end);
  count+=edits.length;
 }
 if(before!==after)fs.writeFileSync(file,after);
}
const updated='open-vision-studio/src/components/dialogs/JustUpdatedDialog.tsx';fs.writeFileSync(updated,fs.readFileSync(updated,'utf8').replace('${justUpdated.from} naar ${justUpdated.to}','${justUpdated.from} to ${justUpdated.to}'));
console.log(`Finished ${count} additional interface captions.`);
