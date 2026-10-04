import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {deflateRawSync} from 'node:zlib';
import {root} from './common.mjs';

const destination=path.join(root,'delivery/field');
const browser=JSON.parse(fs.readFileSync(path.join(root,'qa/field/results.json'),'utf8'));
const native=JSON.parse(fs.readFileSync(path.join(root,'qa/field/native-smoke-results.json'),'utf8'));
if(browser.status!=='passed'||native.status!=='passed')throw Error('Package only verified browser and native artifacts.');

const ignored=new Set(['node_modules','dist','target','gen','.git','.github','docs']);
function collect(relative) {
  const absolute=path.join(root,relative);
  if(!fs.existsSync(absolute))return [];
  if(fs.statSync(absolute).isFile())return [{file:absolute,name:relative.replaceAll('\\','/')}];
  return fs.readdirSync(absolute,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry=>ignored.has(entry.name)?[]:collect(path.join(relative,entry.name)));
}
const crcTable=Uint32Array.from({length:256},(_,n)=>{let crc=n;for(let bit=0;bit<8;bit++)crc=(crc&1)?0xedb88320^(crc>>>1):crc>>>1;return crc>>>0;});
function crc32(data){let crc=0xffffffff;for(const byte of data)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function zip(file,entries) {
  const chunks=[],directory=[];let offset=0;
  for(const entry of entries) {
    const name=Buffer.from(entry.name),data=fs.readFileSync(entry.file),compressed=deflateRawSync(data,{level:9}),crc=crc32(data);
    const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(8,8);local.writeUInt16LE(0x21,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
    chunks.push(local,name,compressed);
    const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt16LE(8,10);central.writeUInt16LE(0x21,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);directory.push(central,name);offset+=local.length+name.length+compressed.length;
  }
  const directorySize=directory.reduce((size,buffer)=>size+buffer.length,0),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directorySize,12);end.writeUInt32LE(offset,16);
  fs.writeFileSync(file,Buffer.concat([...chunks,...directory,end]));console.log(path.basename(file)+': '+entries.length+' files');
}

fs.copyFileSync(path.join(root,'qa/field/VERIFICATION.md'),path.join(destination,'VERIFICATION.md'));
const source=['spanvision-field-workspace','suite-hub','branding','package.json','package-lock.json','README.md','.gitignore','qa/field/verify.mjs','qa/field/native-smoke.mjs','qa/field/VERIFICATION.md','ifc-view/demo/Spanvision-IFC-View-Demo.ifc','delivery/field/README.md'].flatMap(collect);
zip(path.join(destination,'Field-Workspace-0.3.6-source.zip'),source);
const windows=collect('delivery/field/windows').filter(entry=>!entry.name.endsWith('-setup.exe')).map(entry=>({...entry,name:entry.name.replace('delivery/field/windows/','Field Workspace/')}));
zip(path.join(destination,'Field-Workspace-0.3.6-Windows-x64.zip'),windows);
const screenshots=fs.readdirSync(path.join(root,'qa/field')).filter(name=>/^(field-|hub-|native-windows-|generated-).*\.png$/.test(name)).sort().map(name=>({file:path.join(root,'qa/field',name),name:'screenshots/'+name}));
screenshots.push({file:path.join(root,'qa/field/VERIFICATION.md'),name:'VERIFICATION.md'});
zip(path.join(destination,'Field-Workspace-responsive-preview.zip'),screenshots);
const artifacts=['Field-Workspace-0.3.6-source.zip','Field-Workspace-0.3.6-Windows-x64.zip','Field-Workspace-responsive-preview.zip','windows/Field Workspace.exe','windows/Field Workspace_0.3.6_x64-setup.exe'];
const hashes=artifacts.map(name=>({file:name,bytes:fs.statSync(path.join(destination,name)).size,sha256:createHash('sha256').update(fs.readFileSync(path.join(destination,name))).digest('hex')}));
fs.writeFileSync(path.join(destination,'SHA256SUMS.txt'),hashes.map(item=>item.sha256+'  '+item.file).join('\n')+'\n');
fs.writeFileSync(path.join(destination,'artifacts.json'),JSON.stringify({version:'0.3.6',signed:false,artifacts:hashes},null,2)+'\n');
