import * as THREE from 'three';
import { createAssets } from './bridge/BridgeAssets.js';
import { createBridgeGeometry } from './bridge/BridgeGeometry.js';
import { createCar } from './bridge/BridgeCar.js';
import { createDrivingRoute } from './bridge/BridgeRoad.js';
import { createEnvironment } from './bridge/BridgeEnvironment.js';
import { createCameraController } from './bridge/BridgeCamera.js';
import { BridgeMotion } from './bridge/BridgeMotion.js';

// Geometry, road, vehicles, lighting, camera and clock share one GPU renderer.
export function createBridgeScene(canvas,{reduced=false,invalidate=()=>{}}={}) {
  const assets=createAssets();
  let renderer,environment,cameraController,disposed=false,width=0,height=0,theme='';
  try {
    renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(44,1,.15,900);
    const bridge=createBridgeGeometry(assets);scene.add(bridge.group);
    environment=createEnvironment(scene,renderer,assets,bridge.group);
    const route=createDrivingRoute(),length=route.getLength();
    const car=createCar(assets),opposing=createCar(assets,{color:0x7b8c9b,detail:false});
    scene.add(car.root,opposing.root);
    const oppositeRoute=createDrivingRoute(-.95,true),oppositeLength=oppositeRoute.getLength();
    const motion=new BridgeMotion(reduced);
    cameraController=createCameraController(camera,canvas,motion,invalidate);
    function render(delta,next) {
      if(disposed||!width||!height)return;
      if(theme!==next) {
        theme=next;const light=theme==='light';
        bridge.appearance(light);environment.appearance(light);scene.environmentIntensity=light?.65:.5;
      }
      motion.advance(delta);
      const state=motion.snapshot(length);
      const pose=car.place(route,state.progress,state.distance,state.moving,motion.elapsed,state.opacity);
      const otherDistance=(12+motion.elapsed*2.7)%oppositeLength;
      opposing.place(oppositeRoute,otherDistance/oppositeLength,otherDistance,!motion.paused,motion.elapsed);
      environment.update(motion.elapsed);cameraController.update(delta);renderer.render(scene,camera);
      canvas.dataset.bridgeMode=motion.mode;canvas.dataset.bridgePaused=String(motion.paused);
      canvas.dataset.bridgeTime=motion.elapsed.toFixed(3);canvas.dataset.bridgeProgress=state.progress.toFixed(4);
      canvas.dataset.bridgeCamera=camera.position.toArray().map(value=>value.toFixed(3)).join(',');
      canvas.dataset.bridgeCar=pose.position.toArray().map(value=>value.toFixed(3)).join(',');
      canvas.dataset.bridgeAzimuth=motion.orbitAngle.toFixed(5);
      canvas.dataset.bridgeBuildingsLeft=String(environment.cityCounts.left);
      canvas.dataset.bridgeBuildingsRight=String(environment.cityCounts.right);
      canvas.dataset.bridgeStructure='steel-through-truss';
      canvas.dataset.bridgeSpans=String(bridge.stats.spans);
      canvas.dataset.bridgeRivets=String(bridge.stats.rivets);
      return state;
    }
    function resize(w,h,immersive=false) {
      width=w;height=h;renderer.setSize(Math.max(w,1),Math.max(h,1),false);cameraController.resize(w,h,immersive);
    }
    function dispose() {
      if(disposed)return;disposed=true;cameraController.dispose();environment.dispose();assets.dispose();renderer.dispose();renderer.forceContextLoss();
    }
    return {render,resize,dispose,snapshot:()=>motion.snapshot(length),
      select:mode=>cameraController.select(mode),replay:()=>cameraController.replay(),reset:()=>cameraController.reset(),
      togglePause(){motion.paused=!motion.paused;invalidate();},
      reduce(){motion.paused=true;cameraController.select('free');},
      wantsFrame:()=>!motion.paused||cameraController.transitioning(),
      diagnostics:()=>({...motion.snapshot(length),...cameraController.snapshot(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles})
    };
  } catch(error) {
    cameraController?.dispose();environment?.dispose();assets.dispose();renderer?.dispose();throw error;
  }
}
