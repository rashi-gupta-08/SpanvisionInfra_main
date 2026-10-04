import { chromium } from 'playwright';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:390,height:950}});
await page.goto('http://127.0.0.1:4255/?appearance=light');await page.waitForTimeout(1800);
console.log(await page.evaluate(()=>({text:document.body.innerText.slice(0,650),slots:[...document.querySelectorAll('.titlebar,.titlebar-actions,header,#sv-color-mode')].map(node=>({tag:node.tagName,cls:node.className,style:getComputedStyle(node).display,rect:node.getBoundingClientRect().toJSON()}))})));
await page.screenshot({path:'qa/modes/pile-mobile-probe.png'});await browser.close();
