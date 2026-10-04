import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {root,brand} from '../../branding/common.mjs';
const out=path.join(root,'qa/pointcloud');fs.mkdirSync(out,{recursive:true});
const base='http://127.0.0.1:4250';
const results=[],errors=[];
const key='spanvision.pointcloud.appearance.v1';
const upstream=/Open Pointcloud Studio|OpenAEC|OpenNDStudio/i;
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const record=(scenario,details={})=>{results.push({scenario,...details});console.log(scenario,JSON.stringify(details));};
const noOverflow=async page=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page overflows');
const settings=async page=>{await page.getByRole('button',{name:'Settings',exact:true}).click();return page.getByRole('dialog',{name:'Settings',exact:true});};
const properties=async(page,width)=>{
 if(width<768){await page.getByRole('button',{name:'Open pointcloud properties'}).click();return page.getByRole('dialog',{name:'Pointcloud properties'});}
 return page.getByRole('complementary',{name:'Pointcloud properties'});
};
function gridPLY(count=40) {
 const points=[];for(let x=0;x<count;x++)for(let y=0;y<count;y++)points.push(`${x*.2} ${y*.2} ${Math.sin(x*.05)*.1} 140 160 185`);
 return Buffer.from(`ply\nformat ascii 1.0\nelement vertex ${points.length}\nproperty float x\nproperty float y\nproperty float z\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nend_header\n${points.join('\n')}\n`);
}
async function importFixture(page,name,buffer) {
 await page.locator('input[type=file]').setInputFiles({name,mimeType:'application/octet-stream',buffer});
 await page.getByRole('button',{name:'Load sample',exact:true}).waitFor({state:'hidden'});
 await page.waitForTimeout(250);
}
try {
 for(const width of [320,390,820,1440]) {
  const page=await browser.newPage({viewport:{width,height:width===820?1180:900}});
  page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push({width,message:error.message}));
  await page.goto(base);await page.locator('canvas').waitFor();await noOverflow(page);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'spanvision-mono');
  assert.equal(await page.locator('.workspace-canvas > div').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(27, 27, 27)');
  assert.doesNotMatch(await page.locator('body').innerText(),upstream);
  await page.screenshot({path:path.join(out,`editor-empty-${width}.png`)});
  const dialog=await settings(page);const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
  await dialog.getByRole('button',{name:'Close',exact:true}).focus();await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.activeElement.closest('dialog')));
  await page.screenshot({path:path.join(out,`editor-settings-${width}.png`)});
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Settings');
  await page.getByRole('button',{name:'Load sample',exact:true}).click();
  await page.getByRole('button',{name:'Load sample',exact:true}).waitFor({state:'hidden'});await page.waitForTimeout(750);
  await page.screenshot({path:path.join(out,`editor-sample-${width}.png`)});await noOverflow(page);
  const png=await page.locator('.workspace-canvas canvas').screenshot();
  const {data,info}=await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true});
  let colored=0;for(let i=0;i<data.length;i+=info.channels)if(Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])>25)colored++;
  assert.ok(colored>100,'Pointcloud RGB geometry must remain colored');
  const panel=await properties(page,width);
  const select=panel.getByRole('combobox');
  for(const mode of ['elevation','intensity','classification','rgb']) {await select.selectOption(mode);assert.equal(await select.inputValue(),mode);}
  await select.selectOption('classification');await panel.getByRole('checkbox',{name:/Ground/}).uncheck();
  await page.screenshot({path:path.join(out,`editor-properties-${width}.png`)});
  await select.selectOption('rgb');
  const size=panel.getByRole('slider').first();await size.fill('3.5');assert.equal(await size.inputValue(),'3.5');
  const budget=panel.getByRole('slider').nth(1);await budget.fill('500000');assert.equal(await budget.inputValue(),'500000');
  await panel.getByRole('checkbox',{name:'EDL',exact:true}).uncheck();
  await panel.getByRole('button',{name:'Hide',exact:true}).click();await panel.getByRole('button',{name:'Show',exact:true}).click();
  if(width<768){await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});}
  await page.getByRole('button',{name:'Export',exact:true}).click();
  const menu=page.locator('[data-ribbon-popover]');const menuBox=await menu.boundingBox();assert.ok(menuBox.x>=0&&menuBox.x+menuBox.width<=width+1,'Export menu is clipped');
  for(const format of ['PLY (Binary)','PLY (ASCII)','XYZ','PTS','CSV']) {
   const download=page.waitForEvent('download');await page.getByRole('button',{name:format,exact:true}).click();
   const file=await download;const dest=path.join(out,`export-${width}-${file.suggestedFilename()}`);await file.saveAs(dest);assert.ok(fs.statSync(dest).size>0);
   if(format!=='CSV') { const text=fs.readFileSync(dest).toString('utf8');assert.doesNotMatch(text,upstream); }
   if(format!=='CSV')await page.getByRole('button',{name:'Export',exact:true}).click();
  }
  await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByRole('button',{name:'Box Select',exact:true}).click();
  const canvas=await page.locator('.workspace-canvas canvas').boundingBox();
  await page.mouse.move(canvas.x+20,canvas.y+60);await page.mouse.down();await page.mouse.move(canvas.x+canvas.width-20,canvas.y+canvas.height-20,{steps:8});await page.mouse.up();
  await page.getByRole('button',{name:'Deselect',exact:true}).waitFor({state:'visible'});assert.ok(await page.getByRole('button',{name:'Deselect',exact:true}).isEnabled(),'Selection did not select geometry');
  await page.getByRole('button',{name:'Deselect',exact:true}).click();await page.keyboard.press('Escape');
  const appearanceDialog=await settings(page);
  await appearanceDialog.getByRole('button',{name:'Light',exact:true}).click();
  await appearanceDialog.getByLabel('Canvas color',{exact:true}).fill('#303030');
  await appearanceDialog.getByRole('button',{name:'Close',exact:true}).click();await page.reload();
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light');
  assert.equal(await page.locator('.workspace-canvas > div').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(48, 48, 48)');
  const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);assert.deepEqual(Object.keys(stored).sort(),['canvasBackground','uiTheme','version']);
  const reset=await settings(page);await reset.getByRole('button',{name:'Spanvision Mono',exact:true}).click();await reset.getByRole('button',{name:'Use theme canvas',exact:true}).click();
  await reset.getByRole('button',{name:'Open-source notices',exact:true}).click();await reset.getByText('Original contributors:',{exact:false}).waitFor();
  await page.screenshot({path:path.join(out,`editor-notices-${width}.png`)});
  await page.keyboard.press('Escape');
  record('responsive-import-render-controls-exports-selection-preferences-notices',{width,coloredPixels:colored});
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',error=>errors.push({message:error.message}));
 for(const format of ['las','laz']) {
  await page.goto(base);await importFixture(page,`rgb-classified.${format}`,fs.readFileSync(path.join(root,`spanvision-pointcloud-workspace/tests/fixtures/rgb-classified.${format}`)));
  assert.match(await page.locator('.workspace-status').innerText(),/64/);
  await page.getByRole('button',{name:'Export',exact:true}).click();const exported=page.waitForEvent('download');await page.getByRole('button',{name:'PLY (ASCII)',exact:true}).click();const file=await exported;const dest=path.join(out,`regression-${format}.ply`);await file.saveAs(dest);
  const text=fs.readFileSync(dest,'utf8');const [header,body]=text.split('end_header\n');const columns=header.split('\n').filter(line=>line.startsWith('property')).map(line=>line.split(' ').at(-1));const rows=body.trim().split('\n').map(line=>Object.fromEntries(line.trim().split(/\s+/).map((value,i)=>[columns[i],Number(value)])));
  assert.equal(rows.length,64);assert.ok(rows[0].red>150&&rows[0].green>90&&rows[0].blue>60);assert.equal(rows[0].classification,2);assert.equal(rows[1].classification,6);
 }
 record('las-laz-real-import-rgb-classification-roundtrip');
 await page.goto(base);await importFixture(page,'surface.ply',gridPLY(35));
 await page.getByRole('button',{name:'Tools',exact:true}).click();await page.getByRole('button',{name:'Reconstruct',exact:true}).click();
 const progress=page.getByRole('dialog',{name:'Surface Reconstruction'});await progress.waitFor();
 await page.screenshot({path:path.join(out,'reconstruction-progress.png')});
 await progress.waitFor({state:'hidden',timeout:60000});
 const obj=page.waitForEvent('download');await page.getByRole('button',{name:'Export OBJ',exact:true}).click();const file=await obj;await file.saveAs(path.join(out,file.suggestedFilename()));
 const mesh=fs.readFileSync(path.join(out,file.suggestedFilename()),'utf8');assert.match(mesh,/^f /m);assert.match(mesh,/Pointcloud Workspace/);assert.doesNotMatch(mesh,upstream);
 await page.reload();await importFixture(page,'cancel.ply',gridPLY(60));await page.getByRole('button',{name:'Tools',exact:true}).click();await page.getByRole('button',{name:'Reconstruct',exact:true}).click();await progress.waitFor();
 await progress.getByRole('button',{name:'Cancel',exact:true}).last().click();await progress.waitFor({state:'hidden',timeout:60000});
 record('surface-reconstruction-completion-obj-and-cancellation');
 await page.getByRole('button',{name:'3D BAG',exact:true}).click();const mapDialog=page.getByRole('dialog',{name:'3D BAG - Download Buildings'});await mapDialog.waitFor();await page.screenshot({path:path.join(out,'building-download.png')});await page.keyboard.press('Escape');await mapDialog.waitFor({state:'hidden'});
 for(const [name,buffer,pattern] of [['invalid.ply',Buffer.from('broken'),/Invalid PLY/],['unsupported.rcp',Buffer.from('unknown'),/proprietary/i]]) {
  await page.locator('input[type=file]').setInputFiles({name,mimeType:'application/octet-stream',buffer});const feedback=page.getByRole('alertdialog');await feedback.waitFor();assert.match(await feedback.innerText(),pattern);await page.screenshot({path:path.join(out,name+'.png')});await feedback.getByRole('button',{name:'OK',exact:true}).click();
 }
 await page.evaluate(key=>localStorage.setItem(key,'invalid json'),key);await page.reload();assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'spanvision-mono');
 await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({version:1,uiTheme:'unknown',canvasBackground:'javascript:alert(1)'})),key);await page.reload();assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'spanvision-mono');
 record('building-dialog-import-errors-and-corrupt-preferences');await page.close();
 const blocked=await browser.newPage();await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage unavailable');}});});await blocked.goto(base);
 const blockedSettings=await settings(blocked);await blockedSettings.getByRole('button',{name:'Blue',exact:true}).click();assert.equal(await blocked.evaluate(()=>document.documentElement.dataset.theme),'blue');await blocked.close();record('unavailable-storage');
 const status=await(await fetch(base+'/__pointcloud/status')).json();assert.equal(status.available,true);assert.equal(status.mark,'PW');assert.equal(status.productName,'Pointcloud Workspace');
 const hub=await browser.newPage();await hub.goto(`http://127.0.0.1:${brand.hub.port}/#modules`);await hub.locator('[data-module=pointcloud]').getByRole('link',{name:'Open Pointcloud Workspace in a new tab'}).waitFor();await hub.close();record('suite-launcher-and-preview-status');
 assert.deepEqual(errors,[],'Runtime errors');
} catch(error) {errors.push({message:error.message,stack:error.stack});process.exitCode=1;}
finally {fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({results,errors},null,2)+'\n');await browser.close();}
console.log(`${results.length} groups verified; ${errors.length} errors.`);
