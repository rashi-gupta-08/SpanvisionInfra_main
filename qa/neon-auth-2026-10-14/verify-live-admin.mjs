// Real production smoke check, authorized administrator only. Credentials never enter the report.
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {defaultCredentialsFile} from '../../commerce/provision-admin.mjs';

const origin='https://www.spanvisioninfra.com';
const output=process.env.NEON_QA_OUTPUT||'D:/SpanvisionToolchain/neon-auth-2026-10-13/browser';
await fs.mkdir(output,{recursive:true});
const credentials=JSON.parse(await fs.readFile(defaultCredentialsFile,'utf8'));
if(credentials.status!=='ready')throw new Error('The owner account has not completed verification.');
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[],checks=[];
let signedIn=false;
try{
  const config=await (await context.request.get(origin+'/api/account/config')).json();
  assert.equal(config.authProvider,'neon');assert.equal(config.authAvailable,true);
  assert.deepEqual(config.passwordPolicy,{minLength:8,maxLength:128});
  checks.push('Production Neon authentication configured');
  assert.equal((await context.request.get(origin+'/api/admin/users')).status(),401);
  checks.push('Anonymous administration denied');
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto('https://spanvisioninfra.com/#login',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>{const button=document.querySelector('form.identity-form > button');return button&&!button.disabled;});
  assert.equal(new URL(page.url()).origin,origin);
  assert.equal(await page.getByText('Online accounts unavailable',{exact:false}).count(),0);
  checks.push('Exact apex login link redirects to the configured site and enables sign-in');
  await page.screenshot({path:path.join(output,'live-login-dark.png'),fullPage:true});
  for(const screen of ['signup','reset']){
    await page.evaluate(screen=>{location.hash=screen;},screen);
    await page.locator('input[name=confirm]').waitFor();
    assert.equal(await page.locator('input[name=password]').getAttribute('minlength'),'8');
    assert.equal(await page.locator('input[name=confirm]').getAttribute('minlength'),'8');
    assert.equal(await page.locator('input[name=password]').getAttribute('placeholder'),'At least 8 characters');
    if(screen==='reset')await page.screenshot({path:path.join(output,'live-reset-dark.png'),fullPage:true});
    checks.push(`Live ${screen} form shows the active eight-character password policy`);
  }
  const tooShort=await context.request.post(origin+'/api/account/sign-up',{headers:{Origin:origin},data:{name:'Policy check',email:'password-policy-check@example.invalid',password:'short7!'}});
  assert.equal(tooShort.status(),400);assert.match((await tooShort.json()).error,/between 8 and 128/);
  checks.push('Live backend rejects a too-short password before account creation');
  await page.goto(origin+'/?appearance=dark#login',{waitUntil:'networkidle'});
  await page.locator('input[name=email]').fill(credentials.email);
  await page.locator('input[name=password]').fill(credentials.password);
  const loginPromise=page.waitForResponse(response=>response.url().endsWith('/api/account/sign-in')&&response.request().method()==='POST');
  await page.locator('form.identity-form > button').click();
  const login=await loginPromise;
  assert.equal(login.status(),200);const response=await login.json();
  assert.equal(response.redirectTo,'#admin');assert.equal(response.user.id,credentials.userId);assert.equal(response.user.role,'super_admin');
  assert(!JSON.stringify(response).includes(credentials.password));signedIn=true;
  checks.push('Real generated password signs in to the pinned administrator');
  await page.getByRole('heading',{name:'Users & plan access.',exact:true}).waitFor();
  assert.equal(new URL(page.url()).hash,'#admin');checks.push('Browser automatically redirects to admin');
  const session=await (await context.request.get(origin+'/api/account/session')).json();
  assert.equal(session.user.role,'super_admin');assert.equal(session.user.emailVerified,true);
  const billing=await (await context.request.get(origin+'/api/billing/status')).json();
  assert.equal(billing.access.source,'super_admin');assert.deepEqual(billing.access.plans,['explorer','studio','team']);
  checks.push('Verified session has all account plans');
  if(config.databaseAvailable===false){
    await page.getByText('Your administrator sign-in is active. User and plan management will become available after the account database is connected.',{exact:true}).waitFor();
    checks.push('Database setup requirement shown clearly');
  }
  await page.screenshot({path:path.join(output,'live-admin-dark.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  const signedOut=await context.request.post(origin+'/api/account/sign-out',{headers:{Origin:origin},data:{}});
  assert.equal(signedOut.status(),200);signedIn=false;
  assert.equal((await context.request.get(origin+'/api/admin/users')).status(),401);
  checks.push('Sign-out clears administrator access');
  await fs.writeFile(path.join(output,'live-admin-results.json'),JSON.stringify({verifiedAt:new Date().toISOString(),origin,
    passed:true,checks,errors,databaseAvailable:config.databaseAvailable},null,2));
  console.log(JSON.stringify({passed:true,checks:checks.length,errors:errors.length,databaseAvailable:config.databaseAvailable,output}));
}finally{
  if(signedIn)await context.request.post(origin+'/api/account/sign-out',{headers:{Origin:origin},data:{}}).catch(()=>{});
  await context.close();await browser.close();
}
