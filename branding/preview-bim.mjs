import { brand } from './common.mjs';
import { startBim, stopBim } from './bim.mjs';

const module=brand.modules.find(item=>item.id==='bim');
try {
  const child=await startBim(module);
  console.log(`Vision BIM Validator: http://127.0.0.1:${module.port}${module.path}`);
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopBim(child);process.exit(0);});
} catch(error) {console.error(error.message);process.exitCode=1;}
