import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import {root,brand,appDirectory} from './common.mjs';
import {generatePileIcons} from './pile.mjs';
import {generatePointcloudIcons} from './pointcloud.mjs';
if(process.argv.includes('--modules=pile')) { await generatePileIcons(root,brand.modules.find(module=>module.id==='pile')); process.exit(0); }
if(process.argv.includes('--modules=pointcloud')) {
 await generatePointcloudIcons(root,brand.modules.find(module=>module.id==='pointcloud'));
 process.exit(0);
}
const moduleFilter=process.argv.find(arg=>arg.startsWith('--modules='))?.slice('--modules='.length).split(',');
const selectedModules=brand.modules.filter(module=>!moduleFilter||moduleFilter.includes(module.id));
async function generateCadIcons(module) {
  const app=appDirectory(module);
  const master=await sharp(fs.readFileSync(path.join(root,module.logo))).resize(1024).png().toBuffer();
  const output=path.join(root,'branding/icons',module.id);fs.mkdirSync(output,{recursive:true});
  const input=path.join(output,'master.png');fs.writeFileSync(input,master);
  execFileSync(process.execPath,[path.join(root,'calc-workspace/node_modules/@tauri-apps/cli/tauri.js'),'icon',input,'--output',output],{stdio:'pipe'});
  const ico=await pngToIco(await sharp(master).resize(256).png().toBuffer());
  if(module.id==='cad') {
   for(const [file,size] of [['favicon.png',96],['icon-192.png',192],['icon-512.png',512],['apple-touch-icon.png',180]])await sharp(master).resize(size).png().toFile(path.join(app,'site',file));
   fs.writeFileSync(path.join(app,'site/favicon.ico'),ico);fs.writeFileSync(path.join(app,'packaging/windows/AppIcon.ico'),ico);
  } else {
   const dest=path.join(app,'src-tauri/icons');fs.mkdirSync(dest,{recursive:true});
   for(const file of fs.readdirSync(output))if(file!=='master.png')fs.cpSync(path.join(output,file),path.join(dest,file),{recursive:true});
   for(const file of ['o2d-document.ico','dxf-document.ico'])fs.writeFileSync(path.join(dest,file),ico);
   fs.writeFileSync(path.join(app,'public/favicon.ico'),ico);
   await sharp(master).resize(256).png().toFile(path.join(app,'snap/gui/spanvision-2d-cad-workspace.png'));
  }
}
if(moduleFilter && selectedModules.every(module=>['cad','cad2d'].includes(module.id))) {
 for(const module of selectedModules) await generateCadIcons(module);
 console.log('CAD application, favicon and native packaging icons generated.');process.exit(0);
}
const svg=fs.readFileSync(path.join(root,'branding/gw-mark.svg'));
const icons=path.join(root,'branding/icons');fs.mkdirSync(icons,{recursive:true});
const master=await sharp(svg).resize(1024).png().toBuffer();
fs.writeFileSync(path.join(icons,'master.png'),master);
execFileSync(process.execPath,[path.join(root,'calc-workspace/node_modules/@tauri-apps/cli/tauri.js'),'icon',path.join(icons,'master.png'),'--output',icons],{stdio:'pipe'});
for(const module of selectedModules) {
 if(['cad','cad2d'].includes(module.id)){await generateCadIcons(module);continue;}
 // Imported browser applications retain their bundled branded icons.
 if(module.id==='bim'||module.kind==='studio')continue;
 if(module.id==='pile'){await generatePileIcons(root,module);continue;}
 if(module.id==='pointcloud') {await generatePointcloudIcons(root,module);continue;}
 const app=appDirectory(module);
 if(module.id==='stl') {
   const buffer=await sharp(fs.readFileSync(path.join(app,'web/stl-mark.svg'))).resize(256).png().toBuffer();
   const ico=await pngToIco(buffer);
   fs.writeFileSync(path.join(app,'web/favicon.ico'),ico);fs.writeFileSync(path.join(app,'packaging/app.ico'),ico);
   continue;
 }
 if(module.id==='field') {
   const fieldMaster=await sharp(fs.readFileSync(path.join(app,'public/fw-mark.svg'))).resize(1024).png().toBuffer();
   const source=path.join(app,'public/icon_256.png'); await sharp(fieldMaster).resize(256).png().toFile(source);
   execFileSync(process.execPath,[path.join(app,'node_modules/@tauri-apps/cli/tauri.js'),'icon',source,'--output',path.join(app,'src-tauri/icons')],{stdio:'pipe'});
   const ico=await pngToIco(await sharp(fieldMaster).resize(256).png().toBuffer());
   fs.writeFileSync(path.join(app,'public/favicon.ico'),ico); fs.writeFileSync(path.join(app,'public/icon.ico'),ico);
   continue;
 }
 if(module.id==='speech') {
   const speechMaster=await sharp(fs.readFileSync(path.join(app,'public/sw-mark.svg'))).resize(1024).png().toBuffer();
   const source=path.join(app,'src/assets/icon.png');fs.writeFileSync(source,speechMaster);
   execFileSync(process.execPath,[path.join(root,'calc-workspace/node_modules/@tauri-apps/cli/tauri.js'),'icon',source,'--output',path.join(app,'src-tauri/icons')],{stdio:'pipe'});
   fs.writeFileSync(path.join(app,'public/favicon.ico'),await pngToIco(await sharp(speechMaster).resize(256).png().toBuffer()));
   continue;
 }
 if(module.id!=='cad') {
   const dest=path.join(app,'src-tauri/icons');fs.mkdirSync(dest,{recursive:true});
   for(const file of ['32x32.png','128x128.png','128x128@2x.png','icon.png','icon.ico','icon.icns'])if(fs.existsSync(path.join(icons,file)))fs.copyFileSync(path.join(icons,file),path.join(dest,file));
   fs.writeFileSync(path.join(app,'public/favicon.ico'),await pngToIco(await sharp(master).resize(256).png().toBuffer()));
 }
 if(module.id==='geo') {
   execFileSync(process.execPath,[path.join(app,'node_modules/@tauri-apps/cli/tauri.js'),'icon',path.join(icons,'master.png'),'--output',path.join(app,'src-tauri/icons')],{stdio:'pipe'});
   for(const name of ['gef','ifcgeo','ifcgis'])fs.copyFileSync(path.join(icons,'icon.ico'),path.join(app,`src-tauri/icons/file-associations/${name}.ico`));
   continue;
 }
 const pngs=module.id==='cad'?['site/favicon.png','site/icon-192.png','site/icon-512.png','site/apple-touch-icon.png']:module.id==='ifc'?['public/app-icon.png']:module.id==='pdf'?['public/icon.png','src-tauri/icons/icon-new-preview.png','src-tauri/icons/file-icon.png','../mcpb/icon.png','../snap/gui/open-pdf-studio.png']:module.id==='calc'?['snap/gui/calc-workspace.png']:['snap/gui/spanvision-2d-cad-workspace.png'];
 for(const file of pngs){const dest=path.resolve(app,file);fs.mkdirSync(path.dirname(dest),{recursive:true});const size=file.includes('192')?192:file.includes('512')?512:file.includes('apple-touch')?180:file.includes('favicon.png')?96:256;await sharp(master).resize(size).png().toFile(dest);}
 if(module.id==='cad')for(const file of ['site/favicon.ico','packaging/windows/AppIcon.ico'])fs.writeFileSync(path.join(app,file),await pngToIco(await sharp(master).resize(256).png().toBuffer()));
 if(module.id==='pdf') {
   for(const size of [16,32,48,64,128,256])await sharp(master).resize(size).png().toFile(path.join(app,`src-tauri/icons/file-icon-${size}.png`));
   for(const file of ['public/icon.ico','src-tauri/icons/file-icon.ico'])fs.copyFileSync(path.join(icons,'icon.ico'),path.join(app,file));
 }
}
console.log(`${brand.mark} application, favicon and native packaging icons generated.`);
