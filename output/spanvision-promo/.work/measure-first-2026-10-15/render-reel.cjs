const fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process'),{once}=require('node:events'),{chromium}=require('playwright');
const WORK=__dirname,REPO=path.resolve(WORK,'../../../..'),OUT=path.resolve(WORK,'../..');
const info=JSON.parse(fs.readFileSync(path.join(WORK,'audio-info.json'),'utf8'));
const NAME=path.basename(info.output,'.mp4').replace(/-\d+s$/,'');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 let encoder;
 try{
  const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const files={'/reel.html':path.join(WORK,'reel.html'),'/audio-info.json':path.join(WORK,'audio-info.json'),'/logo.png':path.join(REPO,'branding/spanvision-infra-curved-s-logo.png')};
  await page.route('http://reel.local/**',async route=>{
   const file=files[new URL(route.request().url()).pathname];
   if(!file){await route.fulfill({status:404,body:'Missing asset'});return}
   await route.fulfill({status:200,contentType:{'.html':'text/html','.json':'application/json','.png':'image/png'}[path.extname(file)],body:fs.readFileSync(file)});
  });
  await page.goto('http://reel.local/reel.html');await page.waitForFunction(()=>window.reelReady,{},{timeout:30000});await page.evaluate(()=>document.fonts.ready);
  if(errors.length)throw new Error(errors.join('\n'));
  const moments=await page.evaluate(()=>window.previewMoments),timeline=await page.evaluate(()=>window.timeline);
  fs.writeFileSync(path.join(WORK,'timeline.json'),JSON.stringify({timeline,moments},null,2));
  for(let i=0;i<moments.length;i++){
   await page.evaluate(t=>window.renderFrame(t),moments[i]);await page.screenshot({path:path.join(WORK,`preview-${i}.jpg`),type:'jpeg',quality:92});
  }
  await page.evaluate(()=>window.renderFrame(.9));await page.screenshot({path:path.join(OUT,NAME+'-cover.jpg'),type:'jpeg',quality:96});
  console.log('Preview ready:',timeline);
  if(process.argv.includes('--preview'))return;
  const log=fs.createWriteStream(path.join(WORK,'encode.log'));
  encoder=spawn(info.ffmpeg,['-y','-hide_banner','-filter_threads','1','-filter_complex_threads','1','-thread_queue_size','2',
   '-f','image2pipe','-framerate','30','-vcodec','mjpeg','-i','pipe:0','-i',path.join(WORK,'reel-audio.wav'),
   '-map','0:v:0','-map','1:a:0','-c:v','libx264','-threads','2','-preset','fast','-crf','18','-pix_fmt','yuv420p',
   '-c:a','aac','-b:a','192k','-ar','48000','-r','30','-t',String(info.duration),'-movflags','+faststart',
   '-metadata','title=Spanvision Infra - Measure First',
   '-metadata','comment=Original illustrative drawing and motion graphics. Document measurement features checked against local source. Not a product screen recording.',info.output],
   {cwd:WORK,windowsHide:true,stdio:['pipe','ignore','pipe']});
  encoder.stderr.pipe(log);const completed=once(encoder,'close');encoder.stdin.on('error',e=>console.error(e.message));
  for(let n=0;n<info.duration*30;n++){
   await page.evaluate(t=>window.renderFrame(t),n/30);
   const frame=await page.screenshot({type:'jpeg',quality:96});
   if(!encoder.stdin.write(frame))await once(encoder.stdin,'drain');
   if(n%90===0)console.log(`Rendered ${n+1}/${info.duration*30}`);
  }
  encoder.stdin.end();const [code]=await completed;log.end();
  if(code!==0)throw new Error('Encoder failed: '+fs.readFileSync(path.join(WORK,'encode.log'),'utf8').slice(-2000));
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('Reel ready:',info.output);
 }finally{if(encoder&&encoder.exitCode===null)encoder.kill();await browser.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
