import fs from 'node:fs';
import path from 'node:path';
import ts from '../../calc-workspace/node_modules/typescript/lib/typescript.js';
const extra={
 'Maak een nieuw kozijn aan vanuit een sjabloon. Gebruik dit als de gebruiker een nieuw raam, deur of kozijn wil.':'Create a frame from a template when the user requests a new window, door or frame.',
 'Type kozijn: single_turn_tilt (draaikiep), double_turn_tilt (dubbel), sliding_door (schuifpui), front_door (voordeur)':'Frame template: single_turn_tilt (tilt and turn), double_turn_tilt (double), sliding_door or front_door.',
 'Breedte in millimeters (bv. 900, 1200, 1800, 3000)':'Width in millimeters (e.g. 900, 1200, 1800, 3000)',
 'Hoogte in millimeters (bv. 1400, 1500, 2100, 2400)':'Height in millimeters (e.g. 1400, 1500, 2100, 2400)',
 'Profiel sjabloon: hout (standaard-67-meranti (default), standaard-67-accoya, zwaar-78-meranti, passief-90-meranti), kunststof (kunststof-82-veka, kunststof-88-kommerling), aluminium (aluminium-77-reynaers, aluminium-75-schuco)':'Section template: timber (standaard-67-meranti by default, standaard-67-accoya, zwaar-78-meranti, passief-90-meranti), uPVC (kunststof-82-veka, kunststof-88-kommerling), aluminum (aluminium-77-reynaers, aluminium-75-schuco).',
 'Wijzig de breedte en/of hoogte van het huidige kozijn.':'Update the width or height of the current frame.',
 'Nieuwe breedte in mm':'New width in mm','Nieuwe hoogte in mm':'New height in mm',
 'Voeg een verticale verdeler (stijl/tussenstijl) toe op een positie in mm gemeten vanaf links.':'Add a vertical divider at a position in millimeters measured from the left.',
 'Voeg een horizontale verdeler (dorpel/tussendorpel) toe op een positie in mm gemeten vanaf boven.':'Add a horizontal divider at a position in millimeters measured from the top.',
 'Positie in mm vanaf linkerkant':'Position in mm from the left','Positie in mm vanaf bovenkant':'Position in mm from the top',
 'Stel het type van een vak in (glas, draairaam, deur, paneel, etc.). Cell index 0 = linksboven, telt van links naar rechts, boven naar onder.':'Set a cell type (glass, opening window, door, panel, etc.). Cells are indexed from zero, left to right and top to bottom.',
 'Vak index (0-gebaseerd, links-naar-rechts, boven-naar-onder)':'Cell index (zero-based, left to right, top to bottom)','Type paneel':'Panel type',
 'Openingsrichting (optioneel, relevant voor draairamen en deuren)':'Opening direction (optional, for windows and doors)',
 'Stel de binnen- en buitenkleur van het kozijn in met RAL codes.':'Set the inside and outside frame colors using RAL codes.',
 'RAL kleurcode binnenzijde (bv. RAL9010)':'Inside RAL color code (e.g. RAL9010)','RAL kleurcode buitenzijde (bv. RAL7016)':'Outside RAL color code (e.g. RAL7016)',
 'Dupliceer het huidige kozijn met een nieuw merkteken.':'Duplicate the current frame with a new mark.','Nieuw merkteken (bv. K02, K03)':'New mark (e.g. K02, K03)',
 'Bereken de thermische waarde (Uw) van het huidige kozijn. Geen parameters nodig.':'Calculate the thermal transmittance (Uw) of the current frame. No parameters are required.',
 'Haal informatie op over het huidige kozijn (afmetingen, type, vakken, kleuren, profielen). Gebruik dit om de gebruiker te informeren.':'Get information about the current frame: dimensions, type, cells, colors and sections.',
 'EN 1990: Aanpassing referentieperiode':'EN 1990: Reference period adjustment',
 'EN 1990: BGT combinaties (SLS)':'EN 1990: Serviceability combinations (SLS)',
 'EN 1990: Belastingcombinaties compleet':'EN 1990: Complete load combinations',
 'EN 1990: Geotechnisch (groep C)':'EN 1990: Geotechnical (group C)',
 'EN 1990: Rekenwaarden en toetsing':'EN 1990: Design values and checks',
 'EN 1990: UGT Aardbeving':'EN 1990: Seismic ultimate limit state',
 'EN 1990: UGT Buitengewoon (brand/schok)':'EN 1990: Accidental ultimate limit state (fire/impact)',
 'EN 1990: UGT Fundamenteel (STR/GEO)':'EN 1990: Fundamental ultimate limit state (STR/GEO)',
 'EN 1990: UGT Statisch evenwicht (EQU)':'EN 1990: Static equilibrium ultimate limit state (EQU)',
 'EN 1991-1-3: Sneeuwbelasting (NL)':'EN 1991-1-3: Snow load (Netherlands)',
 'EN 1991-1-4: Windbelasting (NL)':'EN 1991-1-4: Wind load (Netherlands)'
};
const norm=s=>s.trim().replace(/\s+/g,' ');
const map=Object.fromEntries(Object.entries({...JSON.parse(fs.readFileSync('qa/english/final-ui-translations.json','utf8')),...JSON.parse(fs.readFileSync('qa/english/messages.json','utf8')),...extra}).map(([k,v])=>[norm(k),v]));
const roots=['vision-calculation-studio/packages/desktop/src','vision-calculation-studio/packages/web/src','vision-calculation-studio/packages/core/src','spanvision-geptechniek-workspace/apps/desktop/src','frame-vision-studio/ui/src','vision-bim-validator/viewer/src','spanvision-2d-cad-workspace/src','spanvision-pdf-workspace/open-pdf-studio/js','fem-vision-studio/src','open-vision-studio/src','spanvision-pile-plane-workspace/apps/pile-plan-studio/src','calc-workspace/src'];
function files(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(['node_modules','dist','target','vendor','locales','__tests__','wasm','i18n'].includes(e.name)?[]:files(path.join(dir,e.name))):[path.join(dir,e.name)]);}
let count=0;
for(const file of roots.flatMap(files).filter(f=>/\.(tsx?|jsx?|svelte)$/.test(f)&&!f.includes('templates')&&!/\.test\./.test(f))){
 const text=fs.readFileSync(file,'utf8');let after=text;
 if(file.endsWith('.svelte')){for(const [k,v] of Object.entries(map))if(after.includes(k)){after=after.replaceAll(k,v);count++;}}
 else {
 const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS),replacements=[];
 function visit(n){
  if(n.parent&&(ts.isJsxText(n)||ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)||ts.isTemplateHead(n)||ts.isTemplateMiddle(n)||ts.isTemplateTail(n))){
   const value=Object.hasOwn(map,norm(n.text)) ? map[norm(n.text)] : undefined;
   if(typeof value === 'string'){const p=n.parent; if(ts.isPropertyAssignment(p)&&p.name===n)return;
    let replacement;
    if(ts.isJsxText(n))replacement=n.getText(source).replace(n.text,n.text.replace(n.text.trim(),value));
    else if(ts.isTemplateHead(n))replacement='`'+value.replaceAll('`','\\`')+'${';
    else if(ts.isTemplateMiddle(n))replacement='}'+value.replaceAll('`','\\`')+'${';
    else if(ts.isTemplateTail(n))replacement='}'+value.replaceAll('`','\\`')+'`';
    else replacement=ts.isJsxAttribute(p)?'{'+JSON.stringify(value)+'}':JSON.stringify(value);
    replacements.push({start:n.getStart(source),end:n.end,value:replacement});
   }
  }ts.forEachChild(n,visit);
 }visit(source);for(const r of replacements.sort((a,b)=>b.start-a.start)){after=after.slice(0,r.start)+r.value+after.slice(r.end);count++;}
 }
 if(after!==text)fs.writeFileSync(file,after);
}
console.log(`Translated ${count} remaining interface texts.`);
