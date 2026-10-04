import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {root,brand,fingerprint,digest} from '../../branding/common.mjs';
import {waitForPreview} from './ready.mjs';
for(const module of [{id:'hub',directory:'suite-hub',dist:'dist'},...brand.modules]){
 const stamp=JSON.parse(fs.readFileSync(path.join(root,module.directory,module.dist,'suite-build.json'),'utf8'));
 assert.equal(stamp.sourceFingerprint,fingerprint(module),`${module.id}: source stamp`);
 assert.equal(stamp.brandDigest,digest(module.id==='hub'?undefined:module),`${module.id}: brand stamp`);
}
const status=await waitForPreview();
assert.equal(status.modules.length,16);assert.ok(status.modules.every(m=>m.available),JSON.stringify(status.modules.filter(m=>!m.available)));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4230/#modules',{waitUntil:'domcontentloaded'});
 await page.getByRole('combobox',{name:'Color mode',exact:true}).waitFor();
 await page.getByRole('link',{name:'Tools',exact:true}).click();
 const links=await page.locator('a[aria-label^="Open "][target="_blank"]').evaluateAll(nodes=>nodes.map(n=>n.href));
 assert.equal(links.length,16);assert.ok(links.every(url=>new URL(url).searchParams.get('appearance')==='dark'));
 console.log('PASS: all 17 builds current; all 16 tools available; hub opens each tool in Dark mode.');
}finally{await browser.close();}
