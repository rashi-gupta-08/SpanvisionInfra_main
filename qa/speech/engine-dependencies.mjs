import fs from 'node:fs';
import path from 'node:path';
const directory=path.resolve('spanvision-speech-workspace/bin');
function imports(file){
 const bytes=fs.readFileSync(file),pe=bytes.readUInt32LE(0x3c),sections=bytes.readUInt16LE(pe+6),size=bytes.readUInt16LE(pe+20),optional=pe+24;
 const start=bytes.readUInt32LE(optional+(bytes.readUInt16LE(optional)===0x20b?120:104));
 const offset=rva=>{for(let i=0;i<sections;i++){const at=optional+size+i*40,virtual=bytes.readUInt32LE(at+12),length=Math.max(bytes.readUInt32LE(at+8),bytes.readUInt32LE(at+16));if(rva>=virtual&&rva<virtual+length)return bytes.readUInt32LE(at+20)+rva-virtual;}throw new Error('Invalid PE address');};
 const found=[];if(!start)return found;
 for(let at=offset(start);bytes.readUInt32LE(at+12);at+=20){const name=offset(bytes.readUInt32LE(at+12));found.push(bytes.subarray(name,bytes.indexOf(0,name)).toString());}
 return found;
}
const missing=[];
for(const name of fs.readdirSync(directory).filter(name=>/\.(dll|exe)$/i.test(name))){const dependencies=imports(path.join(directory,name));for(const dependency of dependencies)if(!/^api-ms-|^ext-ms-/i.test(dependency)&&!fs.existsSync(path.join(directory,dependency))&&!fs.existsSync(path.join(process.env.SystemRoot,'System32',dependency)))missing.push({file:name,dependency});}
console.log(JSON.stringify({missing},null,2));
