import { createEffect, createSignal, onMount, onCleanup, Show } from 'solid-js';
import {createTrussLayout,TRUSS_SPANS} from './bridge/BridgeTrussLayout.js';
import {deckCoordinates as deck} from './bridge/BridgeCoordinates.js';

const clamp = value => Math.max(0, Math.min(1, value));
const structure = [], skyline = [], faces = [];
const segment = (a, b, stage = 0, detail = false, target = structure) => target.push({ a, b, stage, detail });
function box(x1, z1, x2, z2, bottom, top, stage, target = structure) {
  const points = [[x1,bottom,z1],[x2,bottom,z1],[x2,bottom,z2],[x1,bottom,z2],
    [x1,top,z1],[x2,top,z1],[x2,top,z2],[x1,top,z2]];
  for (const [a,b] of [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]])
    segment(points[a], points[b], stage, false, target);
  if (target === structure) for (const corners of [[4,5,6,7],[0,1,5,4],[1,2,6,5]])
    faces.push({ points: corners.map(i => points[i]), stage });
}

// The drawing fallback uses the same steel member coordinates as the 3D model.
// Perspective projection keeps this animated scene independent of WebGL/assets.
for (let x = -40; x < 39; x += 1) {
  for (const z of [-2.1, 2.1]) {
    segment(deck(x,z), deck(x+1,z), 0);
    segment(deck(x,z,-.7), deck(x+1,z,-.7), .1);
    segment(deck(x,z,.82), deck(x+1,z,.82), 1.9, true);
    segment(deck(x,z), deck(x,z,.82), 2.1, true);
  }
  if (x % 2 === 0) {
    segment(deck(x,-2.1,-.7), deck(x,2.1,-.7), .3, true);
    segment(deck(x,0,.025), deck(x+.7,0,.025), 2.4, true);
  }
  faces.push({ points: [deck(x,-2.1),deck(x+1,-2.1),deck(x+1,2.1),deck(x,2.1)], stage: .2 });
}
for(const member of createTrussLayout().members)segment(member.a,member.b,.5,member.role.includes('brace'));
for(const x of TRUSS_SPANS) {
  box(x-2.55,-3.75,x+2.55,3.75,-.6,.1,.1);
  box(x-1.73,-2.78,x+1.73,2.78,.4,deck(x)[1]-.95,.2);
  box(x-2.13,-3.1,x+2.13,3.1,deck(x)[1]-1.25,deck(x)[1]-.75,.3);
}

// Deterministic skyline: fine outlines and floor lines, quieter than the bridge.
for (let i=0;i<25;i++) {
  const x=-40+i*2.7, z=-12-(i%4)*2.2, height=2.4+((i*7)%13)*.48;
  const breadth=1.1+(i%3)*.34;
  box(x,z,x+breadth,z+1.4,0,height,0,skyline);
  for (let floor=.65;floor<height;floor+=.65) {
    segment([x,floor,z+1.4],[x+breadth,floor,z+1.4],0,true,skyline);
    segment([x+breadth,floor,z],[x+breadth,floor,z+1.4],0,true,skyline);
  }
  if(i%4===0) segment([x+breadth/2,height,z+.7],[x+breadth/2,height+.7,z+.7],0,true,skyline);
}

function projector(width, height, time = 0, reduced = true) {
  const mobile = width < 768;
  const angle = -.49 + (reduced ? 0 : Math.sin(time*.12)*.018);
  const scale = mobile ? height/31 : Math.max(width/63,height/30);
  const centerX = width*(mobile ? .43 : .55), centerY = height*(mobile ? .83 : .73);
  return ([x,y,z]) => {
    const horizontal=x*Math.cos(angle)-z*Math.sin(angle);
    const depth=x*Math.sin(angle)+z*Math.cos(angle);
    const perspective=72/(72+depth);
    return {x:centerX+horizontal*scale*perspective,y:centerY+(depth*.23-y)*scale*perspective,depth};
  };
}

function paint(ctx, width, height, time, mode, reduced) {
  ctx.clearRect(0,0,width,height);
  if(!width || !height) return;
  const light=mode==='light', ink=light?'#344255':'#e5eaf0', soft=light?'#657487':'#81919f';
  const project=projector(width,height,time,reduced), drawTime=reduced?20:time;
  const line=(a,b,color,alpha=1,weight=.7)=>{
    ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=weight;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  };
  // Water plane and thin, softly moving reflections below the structural model.
  for(let z=-18;z<18;z+=1.1) {
    const pulse=reduced?0:Math.sin(time*.6+z)*.025;
    line(project([-48,-.55,z]),project([48,-.55,z]),soft,.045+pulse,.5);
  }
  for(const edge of [...skyline,...structure]) {
    if(edge.detail || edge.stage>1) continue;
    const reflected=p=>project([p[0],-p[1]-1.1,p[2]]);
    const a=reflected(edge.a),b=reflected(edge.b);
    const ripple=reduced?0:Math.sin(time*.6+a.y*.04)*1.1;
    line({x:a.x+ripple,y:a.y},{x:b.x+ripple,y:b.y},soft,light?.075:.12,.65);
  }
  for(const edge of skyline) line(project(edge.a),project(edge.b),soft,edge.detail?.12:.24,edge.detail?.45:.7);
  // Depth-sorted translucent road and pylon surfaces add volume to the wireframe.
  const surfaces=faces.map(face=>({...face,points:face.points.map(project)}));
  surfaces.sort((a,b)=>b.points.reduce((sum,p)=>sum+p.depth,0)-a.points.reduce((sum,p)=>sum+p.depth,0));
  for(const face of surfaces) {
    ctx.globalAlpha=clamp((drawTime-face.stage)*.6)*(light?.07:.045);ctx.fillStyle=ink;
    ctx.beginPath();face.points.forEach((point,i)=>i?ctx.lineTo(point.x,point.y):ctx.moveTo(point.x,point.y));ctx.closePath();ctx.fill();
  }
  for(let i=0;i<structure.length;i++) {
    const edge=structure[i], progress=clamp((drawTime-edge.stage-(i%9)*.025)/1.1);
    if(!progress)continue;
    const a=project(edge.a),b=project(edge.b);
    line(a,{x:a.x+(b.x-a.x)*progress,y:a.y+(b.y-a.y)*progress},edge.detail?soft:ink,edge.detail?.6:.8,edge.detail?.65:1.05);
  }
  // A quiet light trace travels along the deck after the drawing completes.
  if(!reduced && time>4) {
    const x=-40+((time-4)*4)%79;
    for(const z of [-2.1,2.1]) line(project(deck(x,z,.03)),project(deck(Math.min(x+2.8,39),z,.03)),ink,.9,1.4);
  }
  ctx.globalAlpha=1;
}

const fallbackProject=projector(1200,700);
const fallbackPath=structure.map(edge=>{
  const a=fallbackProject(edge.a),b=fallbackProject(edge.b);
  return 'M'+a.x.toFixed(1)+' '+a.y.toFixed(1)+'L'+b.x.toFixed(1)+' '+b.y.toFixed(1);
}).join('');

export default function ArchitectureDrawing(props) {
  const [failed,setFailed]=createSignal(false),[gpuReady,setGpuReady]=createSignal(false);
  const [loading,setLoading]=createSignal(true),[error,setError]=createSignal('');
  let canvas,gpuCanvas,viewport,redraw=()=>{},scene,contextLost=()=>{};
  createEffect(()=>{props.mode;redraw();});
  onMount(()=>{
    let ctx;try{ctx=canvas.getContext('2d');}catch{}
    if(!ctx)setFailed(true);
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,lastPaint=0,previous=0,width=0,height=0,visible=true,disposed=false,dirty=true;
    const stop=()=>{cancelAnimationFrame(frame);frame=0;previous=0;lastPaint=0;};
    const fallBack=message=>{
      const current=scene;scene=undefined;current?.dispose();setGpuReady(false);setLoading(false);setError(message);
      viewport.dataset.architectureEngine=ctx?'canvas':'svg';viewport.dataset.architectureState='fallback';redraw();
    };
    const render=now=>{
      frame=0;if(disposed||!visible||document.hidden)return;
      if(!lastPaint||now-lastPaint>=32) {
        const delta=previous?Math.min((now-previous)/1000,.1):0;previous=now;dirty=false;lastPaint=now;
        try {
          if(scene)scene.render(delta,props.mode);
          else if(ctx)paint(ctx,width,height,20,props.mode,true);
        }catch{fallBack('The 3D renderer stopped. Refresh the page to reload the bridge.');}
      }
      if(!frame&&(scene?.wantsFrame()||dirty))frame=requestAnimationFrame(render);
    };
    redraw=()=>{dirty=true;if(!frame&&!disposed&&visible&&!document.hidden)frame=requestAnimationFrame(render);};
    const resize=()=>{
      width=viewport.clientWidth;height=viewport.clientHeight;
      const ratio=Math.min(window.devicePixelRatio||1,1.5);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
      ctx?.setTransform(ratio,0,0,ratio,0,0);scene?.resize(width,height);redraw();
    };
    const visibilityChanged=()=>{stop();redraw();};
    const motionChanged=()=>{if(motion.matches)scene?.reduce();stop();redraw();};
    const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(viewport);
    const visibilityObserver=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;stop();redraw();});visibilityObserver.observe(viewport);
    document.addEventListener('visibilitychange',visibilityChanged);motion.addEventListener('change',motionChanged);
    contextLost=event=>{event.preventDefault();if(!disposed&&event.currentTarget===gpuCanvas)fallBack('3D graphics were interrupted. Refresh the page to reload the bridge.');};
    const initialize=async()=>{
      try {
        const {createBridgeScene}=await import('./BridgeScene');if(disposed)return;
        scene=createBridgeScene(gpuCanvas,{reduced:motion.matches,invalidate:redraw});scene.resize(width,height);
        scene.render(0,props.mode);setGpuReady(true);setLoading(false);
        viewport.dataset.architectureEngine='webgl';viewport.dataset.architectureState='ready';redraw();
      }catch{if(!disposed)fallBack('Interactive 3D could not start. Enable hardware acceleration or try another browser.');}
    };
    resize();initialize();
    onCleanup(()=>{
      disposed=true;stop();scene?.dispose();scene=undefined;sizeObserver.disconnect();visibilityObserver.disconnect();
      document.removeEventListener('visibilitychange',visibilityChanged);motion.removeEventListener('change',motionChanged);redraw=()=>{};
    });
  });
  return <figure class="company-architecture bridge-backdrop" aria-label="Spanvision Infra animated bridge">
    <div class="architecture-viewport" ref={viewport} data-architecture-state="loading">
      <canvas ref={canvas} class="architecture-canvas" hidden={failed()||gpuReady()} role="img" aria-label="Fallback perspective drawing of a bridge; interactive 3D is unavailable."/>
      <canvas ref={gpuCanvas} class="architecture-canvas architecture-canvas-3d" hidden={!gpuReady()} on:webglcontextlost={event=>contextLost(event)} role="img" aria-label="Animated 3D riveted steel truss bridge with moving cars, blueprint details and an automatic cinematic camera."/>
      <Show when={failed()&&!gpuReady()}><svg class="architecture-fallback" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Fallback bridge drawing"><g fill="none" stroke="currentColor" stroke-width=".8" opacity=".65"><path d={fallbackPath}/></g></svg></Show>
    </div>
    <Show when={loading()}><div class="bridge-loading" role="status"><span class="bridge-loading-ring"/><div>Preparing your perspective<small>Building the 3D bridge and driving route</small></div></div></Show>
    <Show when={error()}><div class="bridge-error" role="alert"><p>{error()}</p></div></Show>
  </figure>;
}
