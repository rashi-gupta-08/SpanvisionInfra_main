import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {root,brand,digest,fingerprint} from './common.mjs';
const module=brand.modules.find(item=>item.id==='field');
const directory=path.join(root,module.directory,module.dist);
const stamp=JSON.parse(fs.readFileSync(path.join(directory,'suite-build.json'),'utf8'));
if(stamp.brandDigest!==digest(module)||stamp.sourceFingerprint!==fingerprint(module))throw Error('Rebuild Field Workspace before previewing it.');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.wasm':'application/wasm','.md':'text/plain','.txt':'text/plain'};
http.createServer((request,response)=>{
 if(request.url==='/__field/status') {
   if([`http://127.0.0.1:${brand.hub.port}`,`http://localhost:${brand.hub.port}`].includes(request.headers.origin))response.setHeader('Access-Control-Allow-Origin',request.headers.origin);
   response.setHeader('Content-Type','application/json');response.end(JSON.stringify({...module,available:true,message:'Ready to open'}));return;
 }
 let file;try{file=path.resolve(directory,'.'+decodeURIComponent(new URL(request.url,'http://localhost').pathname));}catch{response.writeHead(400).end();return;}
 if(file!==directory&&!file.startsWith(directory+path.sep)){response.writeHead(403).end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404).end('File not found');return;}
 response.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');response.setHeader('Cache-Control','no-store');
 fs.createReadStream(file).pipe(response);
}).listen(module.port,'127.0.0.1',()=>console.log(`Field Workspace: http://127.0.0.1:${module.port}/`));
