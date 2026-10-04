// One-time migration of edition presentation. Protocols, source archives and legal records are excluded.
import fs from 'node:fs';
import path from 'node:path';
import {root,brand,files,displayName,write} from './common.mjs';
const previous={cad:['CAD — Spanvision Infra','CAD by Spanvision Infra','CAD - Spanvision Infra'],cad2d:['2D CAD Workspace'],pdf:['pdf workspace'],ifc:['IFC View'],calc:['Calc workspace']};
for(const module of brand.modules) {
  const base=path.join(root,module.directory);
  const roots=module.id==='cad'?['src','site','locales','packaging','snap','web','index.html','web-app.html','README.md']:module.id==='ifc'?['apps','brands','README.md','package.json']:['src','js','styles','preview','public','snap','src-tauri/tauri.conf.json','src-tauri/nsis','src-tauri/installer','mcp-server','mcp-stdio','mcpb','index.html','preview.html','README.md'];
  const list=roots.flatMap(dir=>fs.existsSync(path.join(base,dir)) && fs.statSync(path.join(base,dir)).isFile()?[path.join(base,dir)]:files(path.join(base,dir)));
  for(const file of list) {
    if(!/\.(tsx?|jsx?|css|html|json|rs|ftl|md|toml|xml|plist|desktop|yaml|yml|nsi|nsh|wxs|sh)$/.test(file))continue;
    if(/(?:\.test\.|\/test\/|\\test\\|notices\.md|NOTICE|LICENSE|ATTRIBUTION)/i.test(file))continue;
    let source=fs.readFileSync(file,'utf8'), updated=source;
    for(const term of previous[module.id])updated=updated.replaceAll(term,displayName(module));
    updated=updated.replaceAll('Spanvision Infra',brand.organization);
    // Explicit mark literals only: never touch drawing data or customer account initials.
    updated=updated.replace(/>SV<|>CW</g,`>${brand.mark}<`).replace(/alt="(?:SV|CW|2D)"/g,`alt="${brand.mark}"`);
    if(updated!==source)fs.writeFileSync(file,updated);
  }
}
// The Calc binary filename is a compatibility path; its display title is independent.
const calc=path.join(root,'calc-workspace/scripts/sync-brand.mjs');
let source=fs.readFileSync(calc,'utf8').replace('config.mainBinaryName = brand.product;','// Keep the installed executable path stable across display-name changes.');
source=source.replace('window.title = brand.product;','window.title = `${brand.product} — ${brand.organization}`;');
fs.writeFileSync(calc,source);
const native=path.join(root,'SpanvisionCAD/src/ui/style/spanvision_mono.rs');
source=fs.readFileSync(native,'utf8').replace('use iced::{Color, Theme};','use iced::Theme;').replace(/pub const PAGE:[\s\S]*?pub const FOCUS:[^;]+;/,'#[path = "brand_palette.rs"]\nmod brand_palette;\npub use brand_palette::*;');
fs.writeFileSync(native,source);
for(const [file,importLine] of [
 ['calc-workspace/src/main.tsx','import "./styles/brand-palette.css";'],
 ['calc-workspace/src/lib/index.tsx','import "../styles/brand-palette.css";'],
 ['spanvision-2d-cad-workspace/src/main.tsx','import "./styles/brand-palette.css";'],
 ['ifc-view/apps/desktop/src/index.tsx','import "./styles/brand-palette.css";']
]) {const absolute=path.join(root,file);let value=fs.readFileSync(absolute,'utf8');if(!value.includes(importLine))fs.writeFileSync(absolute,value+'\n'+importLine+'\n');}
for(const file of ['spanvision-pdf-workspace/open-pdf-studio/index.html','spanvision-pdf-workspace/open-pdf-studio/preview.html']) {
 const absolute=path.join(root,file);let value=fs.readFileSync(absolute,'utf8');if(!value.includes('href="/brand-palette.css"'))fs.writeFileSync(absolute,value.replace('</head>','<link rel="stylesheet" href="/brand-palette.css">\n</head>'));
}
// Validation reads the local generated identity rather than an obsolete product name.
const validator=path.join(root,'ifc-view/scripts/validate-brand.mjs');
source=fs.readFileSync(validator,'utf8').replace("organizationName: 'Spanvision Infra'","organizationName: brand.organizationName").replace("productName: 'IFC View'","productName: brand.productName").replace("ownershipLabel: 'by Spanvision Infra'","ownershipLabel: `by ${brand.organizationName}`");fs.writeFileSync(validator,source);
const cadCheck=path.join(root,'SpanvisionCAD/scripts/check_brand.py');source=fs.readFileSync(cadCheck,'utf8').replace('("CAD - Spanvision Infra", executable)','(brand["product"], executable)');fs.writeFileSync(cadCheck,source);
console.log('Migrated presentation names; preserved compatibility and attribution.');
