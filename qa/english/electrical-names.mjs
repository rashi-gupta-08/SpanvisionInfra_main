import fs from 'node:fs';
const text=fs.readFileSync('spanvision-pdf-workspace/open-pdf-studio/js/solid/data/elektraSymbols.js','utf8');
console.log(JSON.stringify([...text.matchAll(/"name":"([^"]+)"/g)].map(m=>m[1]),null,2));
