const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const {chromium}=require('playwright');
const WORK=__dirname,REPO=path.resolve(WORK,'../../../..');
const OUT=path.resolve(WORK,'../..');
const THREE='D:/SpanvisionToolchain/readiness/pointcloud-runtime/node_modules/three/build';
const info=JSON.parse(fs.readFileSync(path.join(WORK,'audio-info.json'),'utf8'));
const FPS=30,FRAMES=info.duration*FPS;
const geometry=path.join(REPO,'qa/stl/live-exports');
const sourcePaths={
 '/reel.html':path.join(WORK,'reel.html'),'/audio-info.json':path.join(WORK,'audio-info.json'),
 '/logo.png':path.join(REPO,'branding/spanvision-infra-curved-s-logo.png')
};
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 let ffmpeg;
 try{
  const context=await browser.newContext({viewport:{width:1080,height:1920},deviceScaleFactor:1});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://reel.local/**',async route=>{
   const u=new URL(route.request().url());let file=sourcePaths[u.pathname];
   if(u.pathname.startsWith('/three/'))file=path.join(THREE,path.basename(u.pathname));
   if(u.pathname.startsWith('/geometry/'))file=path.join(geometry,path.basename(u.pathname));
   if(!file||!fs.existsSync(file)){await route.fulfill({status:404,body:'Missing asset'});return}
   const ext=path.extname(file);const type={'.html':'text/html','.js':'application/javascript','.json':'application/json','.png':'image/png','.stl':'application/octet-stream'}[ext]||'application/octet-stream';
   await route.fulfill({status:200,contentType:type,body:fs.readFileSync(file)});
  });
  await page.goto('http://reel.local/reel.html');await page.waitForFunction(()=>window.reelReady,{},{timeout:60000});
  await page.evaluate(()=>document.fonts.ready);
  if(errors.length)throw new Error(errors.join('\n'));
  const timeline=await page.evaluate(()=>window.timeline);
  fs.writeFileSync(path.join(WORK,'timeline.json'),JSON.stringify(timeline,null,2));
  const moments=[.7,timeline.choose+.35,timeline.select+.65,timeline.export+.65,timeline.vision+.45,timeline.brand+.7,info.duration-1.4];
  for(let i=0;i<moments.length;i++){
   await page.evaluate(t=>window.renderFrame(t),moments[i]);await page.screenshot({path:path.join(WORK,`preview-${i}.png`)});
  }
  await page.evaluate(()=>window.renderFrame(.9));
  await page.screenshot({path:path.join(OUT,'spanvision-map-to-model-2026-10-14-cover.png')});
  console.log('Previews ready; geometry uses the real Utrecht STL export.',timeline);
  if(process.argv.includes('--preview'))return;
  const log=fs.createWriteStream(path.join(WORK,'encode.log'));
  ffmpeg=spawn(info.ffmpeg,['-y','-hide_banner','-filter_threads','1','-filter_complex_threads','1',
    '-thread_queue_size','2','-f','image2pipe','-framerate',String(FPS),'-vcodec','png','-i','pipe:0',
    '-i',path.join(WORK,'reel-audio.wav'),'-map','0:v:0','-map','1:a:0',
    '-c:v','libx264','-threads','2','-preset','fast','-crf','18','-pix_fmt','yuv420p',
    '-c:a','aac','-b:a','192k','-ar','48000','-r','30','-t',String(info.duration),'-movflags','+faststart',
    '-metadata','title=Spanvision Infra - From Map to Model',
    '-metadata','comment=Actual STL sample geometry rendered for advertising. No invented application UI or footage.',info.output],
    {cwd:WORK,windowsHide:true,stdio:['pipe','ignore','pipe']});
  ffmpeg.stderr.pipe(log);const finished=once(ffmpeg,'close');
  ffmpeg.stdin.on('error',e=>console.error('Encoder input:',e.message));
  for(let n=0;n<FRAMES;n++){
   await page.evaluate(t=>window.renderFrame(t),n/FPS);
   const png=await page.screenshot({type:'png'});
   if(!ffmpeg.stdin.write(png))await once(ffmpeg.stdin,'drain');
   if(n%90===0)console.log(`Rendered ${n+1}/${FRAMES} frames`);
  }
  ffmpeg.stdin.end();const [code]=await finished;log.end();
  if(code!==0)throw new Error(`Encoder failed (${code}): ${fs.readFileSync(path.join(WORK,'encode.log'),'utf8').slice(-3000)}`);
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('MP4 ready:',info.output);
 }finally{if(ffmpeg&&ffmpeg.exitCode===null)ffmpeg.kill();await browser.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
