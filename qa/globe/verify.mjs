import { chromium } from 'playwright';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[],errors=[];
const url='http://127.0.0.1:4230/#modules';
const record=scenario=>{results.push(scenario);console.log(`Passed: ${scenario}`);};
const contextErrors=context=>context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
const pixels=async buffer=>sharp(buffer).resize(100,100).removeAlpha().raw().toBuffer();
const difference=async(a,b)=>{
  const [left,right]=await Promise.all([pixels(a),pixels(b)]);
  return left.reduce((sum,value,index)=>sum+Math.abs(value-right[index]),0)/left.length;
};
try {
  const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:1440,height:1000}});contextErrors(context);
  const page=await context.newPage();await page.goto(url);
  await page.locator('[data-globe-state="ready"]').waitFor();
  assert.equal(await page.title(),'Spanvision Infra — Engineering tools');
  assert.equal(await page.locator('h1').first().textContent(),'Spanvision Infra');
  assert.equal(await page.locator('.sv-appearance-control select').inputValue(),'dark');
  assert.equal(await page.locator('.module-card').count(),16);
  assert.equal(await page.locator('.preview-header .brand-lockup>span').textContent(),'Spanvision InfraEngineering tools');
  assert.equal(await page.locator('.company-globe button, .company-globe figcaption').count(),0);
  assert.doesNotMatch(await page.locator('.company-intro').innerText(),/Drag to rotate|Arrow keys|play|pause/i);
  record('Correct organization, 16 tools and dark default');

  const canvas=page.locator('.globe-canvas');
  await page.waitForTimeout(300);
  const dark=await canvas.screenshot();await page.waitForTimeout(250);
  assert.equal(await difference(dark,await canvas.screenshot()),0,'Paused globe moved');
  const box=await canvas.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down();await page.mouse.move(box.x+box.width/2+120,box.y+box.height/2+15,{steps:8});await page.mouse.up();
  await page.waitForTimeout(100);
  const dragged=await canvas.screenshot();
  assert.ok(await difference(dark,dragged)>1,'Dragging did not change the rendered globe');
  await canvas.focus();await page.keyboard.press('ArrowLeft');await page.waitForTimeout(100);
  assert.ok(await difference(dragged,await canvas.screenshot())>.1,'Keyboard rotation did not change the rendered globe');
  record('Controls removed; drag and keyboard still affect the actual canvas');

  await page.emulateMedia({reducedMotion:'no-preference'});
  const spinning=await canvas.screenshot();await page.waitForTimeout(350);
  assert.ok(await difference(spinning,await canvas.screenshot())>.1,'Automatic rotation did not animate');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(80);
  const darkStill=await canvas.screenshot();
  await page.locator('.sv-appearance-control select').selectOption('light');await page.waitForTimeout(100);
  const light=await canvas.screenshot();
  assert.ok(await difference(darkStill,light)>80,'Theme change did not recolor the globe');
  await page.screenshot({path:'qa/globe/verified-desktop-light.png'});
  record('Automatic rotation respects motion preference and recolors on theme change');

  for(const width of [320,390,820,1440])for(const mode of ['dark','light']) {
    await page.setViewportSize({width,height:900});
    await page.locator('.sv-appearance-control select').selectOption(mode);await page.waitForTimeout(100);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width} ${mode} overflows`);
    const bounds=await canvas.boundingBox();assert.ok(bounds.width>200&&bounds.x>=0&&bounds.x+bounds.width<=width);
    const rendered=await pixels(await canvas.screenshot());
    const stats=await sharp(rendered,{raw:{width:100,height:100,channels:3}}).stats();
    assert.ok(stats.channels[0].stdev>8,`${width} ${mode} globe is blank`);
    await page.screenshot({path:`qa/globe/verified-${width}-${mode}.png`});
  }
  await page.reload();assert.equal(await page.locator('.sv-appearance-control select').inputValue(),'light');
  record('Eight responsive theme layouts, visible map dots and saved light preference');
  const credit=await page.request.get('http://127.0.0.1:4230/globe-notices.txt');
  assert.ok(credit.ok());assert.match(await credit.text(),/Copyright \(c\) 2021 Shu Ding/);
  await page.locator('nav a[href="#account"]').click();await canvas.waitFor({state:'detached'});
  await page.locator('nav a[href="#modules"]').click();await page.locator('[data-globe-state="ready"]').waitFor();
  assert.equal(await page.locator('.globe-canvas').count(),1);
  record('Route disposal/remount and retained COBE license');
  await context.close();

  const reduced=await browser.newContext({reducedMotion:'reduce',deviceScaleFactor:2,viewport:{width:390,height:844}});contextErrors(reduced);
  const reducedPage=await reduced.newPage();await reducedPage.goto(url);
  await reducedPage.locator('[data-globe-state="ready"]').waitFor();
  await reducedPage.waitForTimeout(500);
  const reducedCanvas=reducedPage.locator('.globe-canvas');
  const ratio=await reducedCanvas.evaluate(element=>element.width/element.getBoundingClientRect().width);
  assert.ok(ratio>1.95&&ratio<2.05,'High-DPI rendering uses excess resolution');
  const stationary=await reducedCanvas.screenshot();await reducedPage.waitForTimeout(200);
  assert.equal(await difference(stationary,await reducedCanvas.screenshot()),0);
  const stats=await sharp(stationary).stats();assert.ok(stats.channels[0].stdev>8,'Reduced-motion globe is blank');
  await reducedPage.locator('.sv-appearance-control select').selectOption('light');await reducedPage.waitForTimeout(100);
  assert.ok(await difference(stationary,await reducedCanvas.screenshot())>80);
  record('Reduced motion, visible texture, 2× display resolution and paused theme switching');
  await reduced.close();

  const fallback=await browser.newContext({viewport:{width:390,height:844}});contextErrors(fallback);
  await fallback.addInitScript(()=>{
    const getContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:getContext.call(this,type,...args);};
  });
  const fallbackPage=await fallback.newPage();await fallbackPage.goto(url);
  await fallbackPage.locator('[data-globe-state="fallback"]').waitFor();
  assert.ok(await fallbackPage.getByRole('img',{name:'Globe illustration'}).isVisible());
  assert.equal(await fallbackPage.locator('.globe-motion').count(),0);
  for(const mode of ['light','dark']){
    await fallbackPage.locator('.sv-appearance-control select').selectOption(mode);
    assert.ok(await fallbackPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.equal(await fallbackPage.locator('.module-card').count(),16);
  }
  record('Usable light/dark fallback when WebGL is unavailable');
  await fallback.close();assert.deepEqual(errors,[]);
}catch(error){errors.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync('qa/globe/results.json',JSON.stringify({results,errors},null,2));await browser.close();}
console.log(`${results.length} checks passed; ${errors.length} errors.`);
