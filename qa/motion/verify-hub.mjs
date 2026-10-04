import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[],errors=[];
const record=scenario=>{results.push(scenario);console.log(`PASS ${scenario}`);};
try{
 const context=await browser.newContext({viewport:{width:1440,height:950}});
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:4230/?appearance=dark#modules');
 await page.waitForFunction(()=>document.documentElement.dataset.svMotion==='full');
 await page.locator('h1[data-sv-revealed="true"]').waitFor();
 assert.ok(await page.evaluate(()=>document.getAnimations().some(animation=>animation.effect.getTiming().duration===580)),'No real entrance animation');
 await page.waitForTimeout(900);
 assert.equal(await page.locator('.company-globe figcaption,.company-globe button').count(),0);
 assert.equal(await page.locator('.tool-glyph').count(),16);
 record('Real page entrances, 16 tool icons and no globe controls');

 const last=page.locator('.module-card').last();
 assert.equal(await last.getAttribute('data-sv-revealed'),null,'Off-screen card revealed before scrolling');
 await last.scrollIntoViewIfNeeded();await page.waitForTimeout(900);
 assert.equal(await last.getAttribute('data-sv-revealed'),'true');
 assert.equal(await last.evaluate(node=>getComputedStyle(node).opacity),'1');
 await page.locator('.module-card').nth(6).getByRole('link').focus();
 await page.waitForTimeout(50);
 assert.equal(await page.locator('.module-card').nth(6).evaluate(node=>getComputedStyle(node).opacity),'1');
 record('Scroll reveal and immediately visible keyboard focus');

 for(const route of ['account','login','signup','modules']){
  await page.goto(`http://127.0.0.1:4230/?appearance=dark#${route}`);await page.waitForTimeout(950);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.equal(await page.locator('main').evaluate(node=>getComputedStyle(node).opacity),'1');
  assert.ok(await page.locator('[data-sv-motion-element]').count()>0);
 }
 await page.getByRole('button',{name:'Explore all tools',exact:true}).click();
 await page.waitForFunction(()=>document.getElementById('tools-title').getBoundingClientRect().top<45);
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(200);
 await page.getByRole('button',{name:'Explore scan & OCR',exact:true}).click();
 await page.getByRole('dialog').waitFor();await page.waitForTimeout(300);
 await page.getByRole('button',{name:'Close scan preview'}).click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 record('All routes, Explore tools scroll and scan dialog remain usable');

 await page.locator('.sv-appearance-control select').selectOption('light');
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.svThemeChanging),'true');
 await page.waitForTimeout(320);
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.svThemeChanging),undefined);
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.svMode),'light');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.svMotion),'reduced');
 assert.equal(await page.locator('.sv-reveal-waiting').count(),0);
 assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
 assert.equal(await page.locator('.module-card').last().evaluate(node=>getComputedStyle(node).opacity),'1');
 record('Theme transition completes and reduced motion reveals all content');

 for(const width of [320,390,820,1440])for(const mode of ['light','dark']){
  await page.setViewportSize({width,height:900});
  await page.locator('.sv-appearance-control select').selectOption(mode);await page.waitForTimeout(120);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width} ${mode} overflow`);
  const intro=await page.locator('.intro-actions').boundingBox();assert.ok(intro.x>=0&&intro.x+intro.width<=width);
  assert.ok(await page.getByRole('button',{name:'Explore all tools',exact:true}).isVisible());
 }
 record('Eight responsive layouts in light/dark mode');
 await context.close();

 const reduced=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});
 const reducedPage=await reduced.newPage();reducedPage.on('pageerror',error=>errors.push(error.message));
 await reducedPage.goto('http://127.0.0.1:4230/#modules');await reducedPage.waitForTimeout(450);
 assert.equal(await reducedPage.evaluate(()=>document.documentElement.dataset.svMotion),'reduced');
 assert.equal(await reducedPage.locator('.sv-reveal-waiting').count(),0);
 assert.equal(await reducedPage.evaluate(()=>document.getAnimations().length),0);
 assert.equal(await reducedPage.locator('h1').textContent(),'Spanvision Infra');
 record('Reduced-motion startup keeps content visible without animations');
 await reduced.close();assert.deepEqual(errors,[]);
}catch(error){errors.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync('qa/motion/hub-results.json',JSON.stringify({results,errors},null,2));await browser.close();}
console.log(`${results.length} checks; ${errors.length} errors.`);
