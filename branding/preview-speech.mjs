// Independent Speech preview can join an already-running suite without restart.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import {root,brand,digest,fingerprint} from './common.mjs';
const module=brand.modules.find(item=>item.id==='speech');const directory=path.join(root,module.directory,module.dist);
function status(){try{const stamp=JSON.parse(fs.readFileSync(path.join(directory,'suite-build.json'),'utf8'));if(stamp.brandDigest!==digest(module)||stamp.sourceFingerprint!==fingerprint(module))throw new Error('Rebuild Speech to preview the latest edition.');return {...module,available:true,message:'Ready to open'};}catch(error){return {...module,available:false,message:error.message};}}
if(!status().available)throw new Error(status().message);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.wav':'audio/wav','.woff2':'font/woff2'};
const server=http.createServer((request,response)=>{
 response.setHeader('Cache-Control','no-store');
 const allowed=[`http://127.0.0.1:${brand.hub.port}`,`http://localhost:${brand.hub.port}`];
 if(allowed.includes(request.headers.origin))response.setHeader('Access-Control-Allow-Origin',request.headers.origin);
 if(request.url==='/__speech/status'){response.setHeader('Content-Type','application/json');response.end(JSON.stringify(status()));return;}
 if(!status().available){response.writeHead(503);response.end('Rebuild Speech to preview the latest edition.');return;}
 let pathname;try{pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);}catch{response.writeHead(400);response.end();return;}
 let file=path.resolve(directory,'.'+pathname);if(file!==directory&&!file.startsWith(directory+path.sep)){response.writeHead(403);response.end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404);response.end();return;}
 response.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(response);
});
server.listen(module.port,'127.0.0.1',()=>console.log(`speech workspace: http://127.0.0.1:${module.port}/`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
