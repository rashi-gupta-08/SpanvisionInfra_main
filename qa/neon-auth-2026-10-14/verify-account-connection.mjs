// Browser regression checks for interrupted account checks, using no real credentials.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {plans,regions} from '../../commerce/catalog.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const output=process.env.NEON_QA_OUTPUT||'D:/SpanvisionToolchain/neon-auth-2026-10-13/browser';
await fs.mkdir(output,{recursive:true});
const probe=http.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));
const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const origin=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['commerce/preview.mjs'],{cwd:root,windowsHide:true,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
let childOutput='';child.stdout.on('data',data=>childOutput+=data);child.stderr.on('data',data=>childOutput+=data);
const browser=await chromium.launch({channel:'chrome',headless:true});
const config={authAvailable:true,authProvider:'neon',databaseAvailable:false,pricingApproved:false,plans,regions,checkoutAvailable:{IN:false,US:false,GB:false}};
const checks=[],errors=[];
const notConfigured='Online sign-up and sign-in are not available yet. The authentication service has not been configured. Use a local profile or open the tools without an account.';
try{
  for(let attempt=0;attempt<30;attempt++){
    try{if((await fetch(origin)).ok)break;}catch{ /* This test owns the preview process. */ }
    if(attempt===29)throw new Error('Preview did not start: '+childOutput);
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  for(const [mode,width] of [['dark',1440],['light',390]]){
    const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    let behavior='transient',configCalls=0,sessionFails=false,postCalls=0;
    await page.route('**/api/**',async route=>{
      const pathname=new URL(route.request().url()).pathname;
      const fulfill=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
      if(pathname==='/api/account/config'){
        configCalls++;
        if(behavior==='offline')return route.abort('internetdisconnected');
        if(behavior==='transient'&&configCalls===1)return fulfill({error:'Temporary outage'},503);
        if(behavior==='unconfigured')return fulfill({...config,authAvailable:false});
        if(behavior==='malformed')return fulfill({});
        if(behavior==='delayed')await new Promise(resolve=>setTimeout(resolve,200));
        return fulfill(config);
      }
      if(pathname==='/api/account/session')return sessionFails?fulfill({error:'Session connection interrupted'},503):fulfill({user:null});
      if(pathname==='/api/account/sign-in'){postCalls++;return fulfill({error:'Sign-in temporarily unavailable. Try again.'},503);}
      return fulfill({});
    });
    let visit=0;
    const open=()=>page.goto(`${origin}/?appearance=${mode}&connection-case=${++visit}#login`,{waitUntil:'networkidle'});
    const enabled=async()=>{
      await page.waitForFunction(()=>{const button=document.querySelector('form.identity-form > button');return button&&!button.disabled;});
      assert.equal(await page.getByText(notConfigured,{exact:true}).count(),0);
    };
    try{
      await open();await enabled();assert.equal(configCalls,2);
      checks.push(`Temporary configuration failure recovers automatically: ${mode} ${width}`);

      behavior='offline';configCalls=0;await open();
      await page.getByRole('button',{name:'Retry connection',exact:false}).waitFor();
      assert.equal(configCalls,2);assert.equal(await page.getByText(notConfigured,{exact:true}).count(),0);
      await page.locator('input[name=email]').fill('member@example.test');
      behavior='delayed';configCalls=0;
      await page.getByRole('button',{name:'Retry connection',exact:false}).click();
      await page.evaluate(()=>{window.dispatchEvent(new Event('online'));window.dispatchEvent(new Event('focus'));});
      await enabled();assert.equal(configCalls,1);
      assert.equal(await page.locator('input[name=email]').inputValue(),'member@example.test');
      checks.push(`Offline state gives an honest retry and preserves form without overlapping requests: ${mode} ${width}`);

      for(const event of ['online','focus']){
        behavior='offline';await open();await page.getByRole('button',{name:'Retry connection',exact:false}).waitFor();
        behavior='ready';configCalls=0;await page.evaluate(event=>window.dispatchEvent(new Event(event)),event);
        await enabled();assert.equal(configCalls,1);
        checks.push(`Connection restores on ${event}: ${mode} ${width}`);
      }

      behavior='offline';await open();await page.getByRole('button',{name:'Retry connection',exact:false}).waitFor();
      behavior='ready';configCalls=0;await page.locator('.identity-switch a').click();
      await page.getByRole('heading',{name:'Make space for your ideas.',exact:true}).waitFor();
      await enabled();assert.equal(configCalls,1);
      checks.push(`Returning to account screens rechecks a failed connection: ${mode} ${width}`);

      behavior='unconfigured';await open();await page.getByText(notConfigured,{exact:true}).waitFor();
      behavior='ready';await page.getByRole('button',{name:'Retry connection',exact:false}).click();await enabled();
      checks.push(`Actual unconfigured service can be rechecked: ${mode} ${width}`);

      behavior='malformed';await open();await page.getByRole('button',{name:'Retry connection',exact:false}).waitFor();
      assert.equal(await page.getByText(notConfigured,{exact:true}).count(),0);
      behavior='ready';await page.getByRole('button',{name:'Retry connection',exact:false}).click();await enabled();
      checks.push(`Invalid configuration cannot masquerade as missing authentication: ${mode} ${width}`);

      sessionFails=true;await open();await page.getByRole('alert').filter({hasText:'Session connection interrupted'}).waitFor();
      await enabled();sessionFails=false;
      await page.getByRole('button',{name:'Retry connection',exact:false}).click();await enabled();
      assert.equal(await page.getByRole('alert').count(),0);
      checks.push(`Session interruption keeps configured sign-in available and recovers: ${mode} ${width}`);

      await page.locator('input[name=email]').fill('member@example.test');await page.locator('input[name=password]').fill('fixture-only-password');
      await page.locator('form.identity-form > button').click();
      await page.getByRole('alert').filter({hasText:'Sign-in temporarily unavailable. Try again.'}).waitFor();
      assert.equal(postCalls,1);await page.locator('input[name=password]').fill('');
      checks.push(`Mutating sign-in requests are never automatically repeated: ${mode} ${width}`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
      await page.screenshot({path:path.join(output,`connection-${mode}-${width}.png`),fullPage:true});
    }finally{await context.close();}
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(output,'connection-results.json'),JSON.stringify({verifiedAt:new Date().toISOString(),mockedProvider:true,passed:true,checks,errors},null,2));
  console.log(JSON.stringify({passed:true,checks:checks.length,errors:errors.length,output}));
}finally{
  await browser.close();child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));
}
