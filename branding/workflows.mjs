import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {root} from './common.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[],errors=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:3005/');
 await page.locator('input[type=file]').first().setInputFiles(path.join(root,'ifc-view/demo/Spanvision-IFC-View-Demo.ifc'));
 await page.getByText('Drag your IFC file here',{exact:true}).waitFor({state:'hidden',timeout:60000});
 await page.waitForFunction(()=>document.querySelector('canvas')?.width>100);
 await page.waitForTimeout(1500);
 const text=await page.locator('body').innerText();
 assert.match(text,/Spanvision-IFC-View-Demo/);
 assert.doesNotMatch(text,/error loading|failed to load/i);
 await page.screenshot({path:path.join(root,'qa/suite/screenshots/ifc-model-1440.png')});
 results.push({scenario:'IFC file loading and model viewport',passed:true});
 const canvas=await page.locator('canvas').elementHandle();
 for(const width of [820,390,1440]){await page.setViewportSize({width,height:900});assert.ok(await canvas.evaluate(node=>node.isConnected));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 results.push({scenario:'IFC loaded canvas preserved on resize',passed:true});
 assert.deepEqual(errors,[]);
 await page.close();
}catch(error){errors.push(error.message);process.exitCode=1;}
finally{await browser.close();fs.writeFileSync(path.join(root,'qa/suite/workflow-results.json'),JSON.stringify({results,errors},null,2)+'\n');}
console.log(JSON.stringify({results,errors}));
