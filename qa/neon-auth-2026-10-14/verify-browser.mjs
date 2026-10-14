// UI verification uses controlled API fixtures. This does not create a live Neon account.
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
const checks=[],errors=[];
try{
  for(let attempt=0;attempt<30;attempt++){
    try{if((await fetch(origin)).ok)break;}catch{ /* Wait for this test's preview process. */ }
    if(attempt===29)throw new Error('Preview did not start: '+childOutput);
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  for(const [mode,width] of [['dark',1440],['light',390]]){
    const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    let authenticated=false,signupRequests=0,resetRequests=0;
    const boundaryPassword='Aa1!bcD2';
    const user={id:'admin_test_012345',name:'Admin',email:'spanvisioninfra.admin@gmail.com',emailVerified:true,role:'super_admin',permissions:['plans:all','users:read','plans:write']};
    await page.route('**/api/**',async route=>{
      const pathname=new URL(route.request().url()).pathname;
      let data;
      if(pathname==='/api/account/config')data={authAvailable:true,authProvider:'neon',databaseAvailable:false,pricingApproved:false,plans,regions,checkoutAvailable:{IN:false,US:false,GB:false}};
      else if(pathname==='/api/account/session')data={user:authenticated?user:null};
      else if(pathname==='/api/account/sign-up'){signupRequests++;assert.equal(route.request().postDataJSON().password,boundaryPassword);data={signedIn:false,verifyEmail:true};}
      else if(pathname==='/api/account/verify'){
        const body=route.request().postDataJSON();data=body.type==='recovery'?{signedIn:false,recovery:true}:{verified:true,signInRequired:true};
      }else if(pathname==='/api/account/recovery')data={sent:true};
      else if(pathname==='/api/account/resend-verification')data={sent:true};
      else if(pathname==='/api/account/password'){resetRequests++;assert.equal(route.request().postDataJSON().password,boundaryPassword);data={updated:true,signInRequired:true};}
      else if(pathname==='/api/account/sign-in'){authenticated=true;data={signedIn:true,user,redirectTo:'#admin'};}
      else if(pathname==='/api/account/sign-out'){authenticated=false;data={signedOut:true};}
      else if(pathname==='/api/billing/status')data={subscriptions:[],access:{plan:'team',plans:['explorer','studio','team'],source:'super_admin'}};
      else if(pathname==='/api/admin/users')data={users:[],page:1,perPage:50,total:0,hasNext:false};
      else data={};
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
    });
    try{
      await page.goto(`${origin}/?appearance=${mode}#signup`,{waitUntil:'networkidle'});
      await page.locator('input[name=name]').fill('Admin');await page.locator('input[name=email]').fill(user.email);
      assert.equal(await page.locator('input[name=password]').getAttribute('minlength'),'8');
      assert.equal(await page.locator('input[name=confirm]').getAttribute('minlength'),'8');
      assert.equal(await page.locator('input[name=password]').getAttribute('placeholder'),'At least 8 characters');
      await page.locator('input[name=password]').fill(boundaryPassword.slice(0,7));await page.locator('input[name=confirm]').fill(boundaryPassword.slice(0,7));
      await page.locator('form.identity-form > button').click();
      assert.equal(await page.locator('input[name=password]').evaluate(input=>input.validity.tooShort),true);assert.equal(signupRequests,0);
      await page.locator('input[name=password]').fill(boundaryPassword);await page.locator('input[name=confirm]').fill('Zz2@efG3');
      await page.locator('form.identity-form > button').click();await page.getByRole('alert').filter({hasText:'The passwords do not match.'}).waitFor();assert.equal(signupRequests,0);
      await page.locator('input[name=confirm]').fill(boundaryPassword);
      await page.locator('form.identity-form button[type=submit],form.identity-form > button').click();
      await page.getByRole('heading',{name:'Check your inbox.'}).waitFor();
      assert.equal(signupRequests,1);checks.push(`Registration rejects seven characters and mismatches, accepts eight: ${mode} ${width}`);
      await page.getByRole('button',{name:'Send a new code',exact:true}).click();
      await page.getByText('A new code has been requested. Check your inbox.',{exact:true}).waitFor();
      checks.push(`Verification resend: ${mode} ${width}`);
      await page.locator('input[name=code]').fill('123456');await page.locator('form.identity-form > button').click();
      await page.getByText('Your email is verified. Sign in below with your password.',{exact:true}).waitFor();
      await page.screenshot({path:path.join(output,`verification-${mode}-${width}.png`),fullPage:true});
      checks.push(`Verification without auto-login: ${mode} ${width}`);
      await page.goto(`${origin}/?appearance=${mode}#forgot`,{waitUntil:'networkidle'});
      await page.locator('input[name=email]').fill(user.email);await page.locator('form.identity-form > button').click();
      await page.getByRole('heading',{name:'Check your inbox.'}).waitFor();
      await page.locator('input[name=code]').fill('123456');await page.locator('form.identity-form > button').click();
      await page.getByRole('heading',{name:'Set a new password.'}).waitFor();
      assert.equal(await page.locator('input[name=password]').getAttribute('minlength'),'8');
      assert.equal(await page.locator('input[name=confirm]').getAttribute('minlength'),'8');
      assert.equal(await page.locator('input[name=password]').getAttribute('placeholder'),'At least 8 characters');
      await page.locator('input[name=password]').fill(boundaryPassword.slice(0,7));await page.locator('input[name=confirm]').fill(boundaryPassword.slice(0,7));
      await page.locator('form.identity-form > button').click();
      assert.equal(await page.locator('input[name=password]').evaluate(input=>input.validity.tooShort),true);assert.equal(resetRequests,0);
      await page.locator('input[name=password]').fill(boundaryPassword);await page.locator('input[name=confirm]').fill(boundaryPassword);
      await page.locator('form.identity-form > button').click();
      await page.getByText('Your password has been updated. Sign in below with your new password.',{exact:true}).waitFor();
      assert.equal(resetRequests,1);checks.push(`Reset rejects seven characters and accepts eight: ${mode} ${width}`);
      await page.screenshot({path:path.join(output,`recovery-${mode}-${width}.png`),fullPage:true});
      checks.push(`Recovery returns to password sign-in: ${mode} ${width}`);
      await page.locator('.identity-switch').getByRole('link',{name:'Sign in',exact:true}).click();
      await page.locator('input[name=email]').fill(user.email);await page.locator('input[name=password]').fill('fixture-new-password');
      await page.locator('form.identity-form > button').click();
      await page.getByRole('heading',{name:'Users & plan access.',exact:true}).waitFor();
      assert.equal(new URL(page.url()).hash,'#admin');
      checks.push(`Automatic verified super-admin redirect: ${mode} ${width}`);
      await page.getByText('Your administrator sign-in is active. User and plan management will become available after the account database is connected.',{exact:true}).waitFor();
      checks.push(`Database setup is explained without failed user-list requests: ${mode} ${width}`);
      // A normal account must stay in its own workspace even when it submits an admin email field or role.
      authenticated=false;user.id='member_test_012345';user.email='member@example.test';user.role='member';user.permissions=[];
      await page.goto(`${origin}/?appearance=${mode}#login`,{waitUntil:'networkidle'});
      await page.locator('input[name=email]').fill(user.email);await page.locator('input[name=password]').fill('fixture-private-password');
      // The next login fixture uses the server's ordinary-account destination.
      await page.route('**/api/account/sign-in',async route=>{authenticated=true;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({signedIn:true,user,redirectTo:'#account'})});});
      await page.locator('form.identity-form > button').click();
      await page.getByRole('heading',{name:'Hello, Admin',exact:false}).waitFor();
      assert.equal(new URL(page.url()).hash,'#account');
      assert.equal(await page.getByRole('link',{name:'Manage users & plans →',exact:true}).count(),0);
      checks.push(`Ordinary account stays out of admin: ${mode} ${width}`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
    }finally{await context.close();}
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify({verifiedAt:new Date().toISOString(),mockedProvider:true,checks,errors,passed:true},null,2));
  console.log(JSON.stringify({checks:checks.length,errors:errors.length,passed:true,output}));
}finally{
  await browser.close();
  // Stop only the preview process spawned by this test.
  child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));
}
