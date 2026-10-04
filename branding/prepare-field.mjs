import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import {root} from './common.mjs';
const app=path.join(root,'spanvision-field-workspace'),legal=path.join(app,'legal');
const master=await sharp(fs.readFileSync(path.join(app,'public/fw-mark.svg'))).resize(1024).png().toBuffer();
const source=path.join(app,'src-tauri/icons/source.png');fs.writeFileSync(source,master);
execFileSync(process.execPath,[path.join(app,'node_modules/@tauri-apps/cli/tauri.js'),'icon',source,'--output',path.join(app,'src-tauri/icons')],{stdio:'pipe',windowsHide:true});
const small=await sharp(master).resize(256).png().toBuffer();fs.writeFileSync(path.join(app,'public/icon_256.png'),small);
for(const name of ['favicon.ico','icon.ico'])fs.writeFileSync(path.join(app,'public',name),await pngToIco(small));
function packages(dir){return fs.readdirSync(dir,{withFileTypes:true}).filter(entry=>entry.isDirectory()&&!entry.name.startsWith('.')).flatMap(entry=>entry.name.startsWith('@')?packages(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
const sections=[];
for(const dir of packages(path.join(app,'node_modules'))){const pkgPath=path.join(dir,'package.json');if(!fs.existsSync(pkgPath))continue;const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));const names=fs.readdirSync(dir).filter(name=>/^(licen[sc]e|copying|notice)([._-]|$)/i.test(name)&&fs.statSync(path.join(dir,name)).isFile());sections.push(`${pkg.name} ${pkg.version} — ${typeof pkg.license==='string'?pkg.license:JSON.stringify(pkg.license||'See package notice')}\n${names.map(name=>fs.readFileSync(path.join(dir,name),'utf8')).join('\n')}`);}
sections.push('PDF.js — Apache-2.0\nCopyright Mozilla Foundation and contributors.\nhttps://www.apache.org/licenses/LICENSE-2.0\n'+fs.readFileSync(path.join(app,'public/pdf.min.js'),'utf8').slice(0,3000).split('*/')[0]+'*/');
fs.writeFileSync(path.join(legal,'DEPENDENCY-LICENSES.txt'),sections.join('\n\n'+'='.repeat(72)+'\n\n')+'\n');
const lock=fs.readFileSync(path.join(app,'src-tauri/Cargo.lock'),'utf8');
const registries=[process.env.CARGO_HOME,path.join(process.env.USERPROFILE||'','.cargo'),'D:/SpanvisionToolchain/CargoCache'].filter(Boolean).map(dir=>path.join(dir,'registry/src')).filter(dir=>fs.existsSync(dir));
const crateRoots=registries.flatMap(dir=>fs.readdirSync(dir).map(name=>path.join(dir,name)));
const rustSections=[];
for(const block of lock.split('[[package]]').slice(1)){
 const name=/name = "([^"]+)"/.exec(block)?.[1], version=/version = "([^"]+)"/.exec(block)?.[1];if(!block.includes('source = "registry+'))continue;
 const dir=crateRoots.map(base=>path.join(base,`${name}-${version}`)).find(candidate=>fs.existsSync(candidate));if(!dir)continue;
 const manifest=fs.readFileSync(path.join(dir,'Cargo.toml'),'utf8');const license=/^license = "([^"]+)"/m.exec(manifest)?.[1]||'See crate notices';
 const files=fs.readdirSync(dir).filter(file=>/^(licen[sc]e|copying|notice)([._-]|$)/i.test(file)&&fs.statSync(path.join(dir,file)).isFile());
 rustSections.push(`${name} ${version} — ${license}\n${files.map(file=>fs.readFileSync(path.join(dir,file),'utf8')).join('\n')}`);
}
fs.writeFileSync(path.join(legal,'RUST-DEPENDENCY-LICENSES.txt'),rustSections.join('\n\n'+'='.repeat(72)+'\n\n')+'\n');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const notices=fs.readFileSync(path.join(legal,'UPSTREAM-NOTICES.md'),'utf8');
fs.writeFileSync(path.join(app,'public/notices.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Field Workspace — open-source notices</title><style>body{max-width:900px;margin:auto;padding:24px;background:#000;color:#eee;font:15px/1.6 system-ui}a{color:#fff}pre{white-space:pre-wrap;overflow-wrap:anywhere}summary{cursor:pointer;padding:14px;background:#202020;margin:16px 0}</style><h1>Field Workspace</h1><a href="/">Return to workspace</a><pre>${escape(notices)}</pre><details><summary>JavaScript and PDF.js dependency licenses</summary><pre>${escape(sections.join('\n\n'))}</pre></details><details><summary>Rust dependency licenses</summary><pre>${escape(rustSections.join('\n\n'))}</pre></details></html>`);
console.log(`Prepared FW platform icons, ${sections.length} JavaScript notices and ${rustSections.length} Rust notices.`);
