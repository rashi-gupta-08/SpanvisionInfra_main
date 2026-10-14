import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { START_ANGLE, smoothstep } from './BridgeMotion.js';

export function createCameraController(camera, canvas, motion, invalidate) {
  const controls=new OrbitControls(camera,canvas);
  controls.enabled=false;controls.enableRotate=false;
  controls.enableDamping=true;controls.dampingFactor=.09;
  controls.enablePan=false;controls.minDistance=5;controls.maxDistance=260;
  controls.enableZoom=false;
  controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI*.47;
  controls.rotateSpeed=.6;
  controls.target.set(0,6.5,0);
  let width=1,height=1,immersive=false,transition=null,lastMode=motion.mode;
  const desired=new THREE.Vector3(),target=new THREE.Vector3(),currentTarget=new THREE.Vector3(0,6.5,0);
  const orbitPosition=angle=>{
    const aspect=width/height;
    const projectedWidth=84*Math.abs(Math.cos(angle))+28*Math.abs(Math.sin(angle));
    const radius=Math.max(55,projectedWidth/(2*Math.tan(THREE.MathUtils.degToRad(22))*aspect)*1.13);
    return new THREE.Vector3(Math.sin(angle)*radius,6.5+radius*.3,Math.cos(angle)*radius);
  };
  camera.position.copy(orbitPosition(START_ANGLE));camera.lookAt(controls.target);controls.update();
  const changed=()=>invalidate();
  controls.addEventListener('change',changed);
  function beginTransition() {
    transition={position:camera.position.clone(),target:controls.target.clone(),elapsed:0,duration:1.15};
  }
  function select(mode) {
    if(!['cinematic','free'].includes(mode))return;
    motion.select(mode);if(mode==='free')transition=null;else beginTransition();lastMode=mode;invalidate();
  }
  function reset() {
    motion.select('free');lastMode='free';
    transition={position:camera.position.clone(),target:controls.target.clone(),elapsed:0,duration:1.15,reset:true};invalidate();
  }
  function resize(w,h,expanded=immersive) {
    const initial=width===1;
    width=Math.max(w,1);height=Math.max(h,1);immersive=expanded;camera.aspect=width/height;
    if(immersive)camera.clearViewOffset();
    else camera.setViewOffset(width,height,-width*(width<768?.04:.17),height*(width<768?-.02:.13),width,height);
    camera.updateProjectionMatrix();
    if(initial||motion.mode==='free')camera.position.copy(orbitPosition(motion.orbitAngle));
  }
  function update(delta) {
    const mode=motion.mode;
    if(mode!==lastMode) {
      // Settle at the exact end of the single orbit, then hold the wide view.
      if(lastMode==='cinematic'&&mode==='free'&&motion.introCompleted) {
        camera.position.copy(orbitPosition(motion.orbitAngle));controls.target.set(0,6.5,0);
      }
      lastMode=mode;if(mode==='free')transition=null;else beginTransition();
    }
    if(mode==='cinematic') {desired.copy(orbitPosition(motion.orbitAngle));target.set(0,6.5,0);}
    else if(transition?.reset) {desired.copy(orbitPosition(START_ANGLE));target.set(0,6.5,0);}
    if(transition) {
      transition.elapsed+=delta;const fraction=smoothstep(transition.elapsed/transition.duration);
      camera.position.lerpVectors(transition.position,desired,fraction);controls.target.lerpVectors(transition.target,target,fraction);
      if(fraction>=1)transition=null;
    } else if(mode==='cinematic') {camera.position.copy(desired);controls.target.copy(target);}
    currentTarget.copy(controls.target);controls.enableDamping=mode==='free'&&!transition;controls.update(delta);
    camera.position.y=Math.max(camera.position.y,.8);
  }
  return {resize,update,select,reset,
    replay(){motion.replay();lastMode='cinematic';beginTransition();invalidate();},
    transitioning:()=>!!transition,
    snapshot(){return {position:camera.position.toArray(),target:currentTarget.toArray(),distance:controls.getDistance()};},
    dispose(){controls.removeEventListener('change',changed);controls.dispose();}
  };
}
