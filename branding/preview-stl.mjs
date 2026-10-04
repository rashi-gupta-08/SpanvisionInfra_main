import {brand} from './common.mjs';
import {startStl,stopStl} from './stl.mjs';
const module=brand.modules.find(m=>m.id==='stl');
const child=await startStl(module);
console.log(`STL-3D map workspace: http://127.0.0.1:${module.port}/`);
if(!child)console.log('Reusing the current matching backend.');
else for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopStl(child);process.exit(0);});
