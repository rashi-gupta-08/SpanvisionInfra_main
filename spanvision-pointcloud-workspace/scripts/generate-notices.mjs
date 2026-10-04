import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'public/legal/dependencies');fs.mkdirSync(out,{recursive:true});
const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
const rows=[];
function record(pkg,dir,ecosystem) {
 const name=`${ecosystem}-${pkg.name}-${pkg.version}`.replace(/[^\w.-]/g,'_');
 const licenses=dir?fs.readdirSync(dir).filter(file=>/^(licen[cs]e|copying|notice|copyright)([._-]|$)/i.test(file)&&fs.statSync(path.join(dir,file)).isFile()):[];
 for(const file of licenses)fs.copyFileSync(path.join(dir,file),path.join(out,name+'-'+file));
 const links=licenses.map(file=>`[${file}](/legal/dependencies/${name+'-'+file})`).join(', ');
 rows.push(`- ${pkg.name} ${pkg.version} (${ecosystem}): ${typeof pkg.license==='string'?pkg.license:JSON.stringify(pkg.license||'See upstream license')} ${links || (ecosystem==='Rust'?`[Upstream source](https://crates.io/crates/${pkg.name}/${pkg.version})`:'')}`);
}
for(const key of Object.keys(lock.packages).filter(key=>key)) {
 const dir=path.join(root,key);if(!fs.existsSync(path.join(dir,'package.json')))continue;
 record(JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8')),dir,'npm');
}
if(process.argv.includes('--native')) {
 // Read the pinned lockfile and existing verification cache without fetching unused platforms.
 const cargoHome=process.env.CARGO_HOME||path.join(os.homedir(),'.cargo');
 const sourceRoot=path.join(cargoHome,'registry/src'),indexRoot=path.join(cargoHome,'registry/index');
 const sources=fs.readdirSync(sourceRoot).map(dir=>path.join(sourceRoot,dir));
 const indexes=fs.readdirSync(indexRoot).map(dir=>path.join(indexRoot,dir,'.cache'));
 for(const block of fs.readFileSync(path.join(root,'src-tauri/Cargo.lock'),'utf8').split('[[package]]')) {
   if(!/source = "registry/.test(block))continue;
   const name=block.match(/name = "([^"]+)"/)[1],version=block.match(/version = "([^"]+)"/)[1];
   const dir=sources.map(base=>path.join(base,`${name}-${version}`)).find(dir=>fs.existsSync(path.join(dir,'Cargo.toml')));
   let license=dir?fs.readFileSync(path.join(dir,'Cargo.toml'),'utf8').match(/^license = "([^"]+)"/m)?.[1]:undefined;
   if(!license) {
     const key=name.length===1?`1/${name}`:name.length===2?`2/${name}`:name.length===3?`3/${name[0]}/${name}`:`${name.slice(0,2)}/${name.slice(2,4)}/${name}`;
     for(const index of indexes) {
       const file=path.join(index,key);if(!fs.existsSync(file))continue;
       const entry=fs.readFileSync(file,'utf8').split('\0').find(text=>text.startsWith('{')&&JSON.parse(text).vers===version);
       if(entry){license=JSON.parse(entry).license;break;}
     }
   }
   record({name,version,license},dir,'Rust');
 }
}
const text='# Dependency licenses\n\nThe packages below retain their upstream copyright and license terms. Full notice/license texts are included where provided by each package.\n\n'+rows.sort().join('\n')+'\n';
fs.writeFileSync(path.join(root,'legal/DEPENDENCY-NOTICES.md'),text);
fs.writeFileSync(path.join(root,'public/legal/DEPENDENCY-NOTICES.md'),text);
console.log(`Recorded ${rows.length} dependency license entries.`);
