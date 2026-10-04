import fs from 'node:fs';
import path from 'node:path';
import { root,brand,appDirectory,write } from './common.mjs';
const slots={hub:'.preview-header',cad:'body',cad2d:'.web-start-brand, .sv-cad2d-titlebar',bim:'.brand-header, .titlebar',pdf:'.window-controls, .title-bar',ifc:'header',calc:'.titlebar',planner:'.title-bar',fem:'.titlebar',frame:'.titlebar',calculation:'.titlebar',geo:'.titlebar-controls',speech:'header',stl:'header',field:'.toolbar-right',pointcloud:'.titlebar',pile:'.titlebar-actions, .titlebar'};
const modules=[...brand.modules,{id:'hub',directory:'suite-hub'}];
for(const module of modules){
 if(process.argv.includes('--without-cad')&&module.id==='cad')continue;
 const selected=process.argv.filter(arg=>!arg.startsWith('--')).slice(2);
 if(selected.length&&!selected.includes(module.id))continue;
 const base=appDirectory(module);
 const folder=module.id==='cad'?'web':module.id==='stl'?'web':'public';
 for(const name of ['appearance.js','appearance.css'])write(path.relative(root,path.join(base,folder,name)),fs.readFileSync(path.join(root,'branding',name),'utf8')+'\n'+fs.readFileSync(path.join(root,'branding',name==='appearance.css'?'accent.css':'map-location.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'branding',name==='appearance.css'?'motion.css':'motion.js'),'utf8'));
 if(['geo','fem','pointcloud','calculation'].includes(module.id)) {
   const source=module.id==='calculation'?path.join(root,module.directory,'packages/desktop'):base;
   write(path.relative(root,path.join(source,'src/suiteMapLocation.ts')),fs.readFileSync(path.join(root,'branding/map-location.ts'),'utf8'));
 }
 const entry=path.join(base,module.id==='cad'?'web-app.html':module.id==='stl'?'web/index.html':'index.html');
 let html=fs.readFileSync(entry,'utf8');
 const prefix=module.id==='stl'?'/static/':module.id==='cad'?'':'/';
 const snippet=`    <link rel="stylesheet" href="${prefix}appearance.css" />\n    <script src="${prefix}appearance.js" data-module="${module.id}" data-slot="${slots[module.id]}"></script>\n`;
 if(!html.includes('data-module="'+module.id+'" data-slot='))html=html.replace('</head>',snippet+'  </head>');
 else html=html.replace(/data-module="([^"]+)" data-slot="[^"]*"/,`data-module="${module.id}" data-slot="${slots[module.id]}"`);
 if(module.id==='cad'&&!html.includes('data-trunk rel="copy-file" href="web/appearance.js"'))html=html.replace('<link data-trunk rel="copy-file" href="web/locale-labels.json" />','<link data-trunk rel="copy-file" href="web/locale-labels.json" />\n    <link data-trunk rel="copy-file" href="web/appearance.js" />\n    <link data-trunk rel="copy-file" href="web/appearance.css" />');
 fs.writeFileSync(entry,html);
}
console.log('Appearance assets installed for the hub and 16 tools.');
