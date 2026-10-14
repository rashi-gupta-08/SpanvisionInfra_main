import * as THREE from 'three';
import { clamp } from './BridgeMotion.js';

// A lightweight procedural touring car. Local +X is forward; each wheel spins
// about its own Z axle. All four tyre contact points stay above the road.
export function createCar(assets, { color = 0xdce3e8, detail = true } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const paint = assets.physical({color, metalness:.65, roughness:.25, clearcoat:.8, clearcoatRoughness:.2});
  const glass = assets.physical({color:0x142430, metalness:.1, roughness:.13, clearcoat:1});
  const rubber = assets.standard({color:0x12161b, roughness:.95});
  const chrome = assets.standard({color:0xc0cad4, metalness:.85, roughness:.22});
  const trim = assets.standard({color:0x21282f, roughness:.5, metalness:.4});
  const frontLamp = assets.standard({color:0xe2f0ff, emissive:0xbcdcff, emissiveIntensity:1.7});
  const rearLamp = assets.standard({color:0x6c1720, emissive:0x80101a, emissiveIntensity:.8});
  const ownMaterials = [paint, glass, rubber, chrome, trim, frontLamp, rearLamp];
  const block = (p, d, m) => assets.block(body, new THREE.Vector3(...p), d, m);
  const profile = new THREE.Shape();
  profile.moveTo(-1.15,.3); profile.lineTo(-1.12,.48); profile.quadraticCurveTo(-.8,.59,-.43,.6);
  profile.lineTo(.64,.59); profile.quadraticCurveTo(.98,.57,1.15,.45); profile.lineTo(1.16,.32); profile.closePath();
  const geometry = assets.remember(new THREE.ExtrudeGeometry(profile,{depth:.82, bevelEnabled:true, bevelSegments:2, steps:1, bevelSize:.04, bevelThickness:.04, curveSegments:8}));
  geometry.translate(0,0,-.41);
  const shell = new THREE.Mesh(geometry,paint); body.add(shell);
  // Roof, tapered glazing and body-coloured pillars.
  const cabin = new THREE.Shape(); cabin.moveTo(-.7,.59); cabin.lineTo(-.4,.96);
  cabin.quadraticCurveTo(-.16,1.015,.21,.97); cabin.lineTo(.61,.59); cabin.closePath();
  const cabinGeometry = assets.remember(new THREE.ExtrudeGeometry(cabin,{depth:.67, bevelEnabled:false, curveSegments:8}));
  cabinGeometry.translate(0,0,-.335); body.add(new THREE.Mesh(cabinGeometry,glass));
  block([-.06,.985,0],[.59,.045,.72],paint);
  block([-.15,.79,0],[.045,.36,.72],paint);
  block([-.67,.635,0],[.07,.08,.72],paint);
  block([.57,.635,0],[.06,.08,.72],paint);
  block([0,.285,0],[2.1,.1,.76],trim);
  block([1.145,.375,0],[.06,.095,.48],trim);
  block([-1.14,.33,0],[.08,.085,.7],chrome);
  for (const z of [-.3,.3]) {
    block([1.115,.49,z],[.065,.055,.17],frontLamp);
    block([-1.12,.49,z],[.045,.065,.17],rearLamp);
    block([.29,.68,Math.sign(z)*.46],[.16,.08,.11],paint);
    block([-.42,.62,Math.sign(z)*.433],[.11,.025,.02],chrome);
    if(detail) block([-.25,.315,Math.sign(z)*.43],[1.43,.025,.028],chrome);
  }
  const wheels = [];
  const tyreGeometry = assets.remember(new THREE.TorusGeometry(.167,.048,8,16));
  const rimGeometry = assets.remember(new THREE.CylinderGeometry(.128,.128,.035,12));
  for (const x of [-.73,.76]) for (const z of [-.43,.43]) {
    const wheel = new THREE.Group(); wheel.position.set(x,.215,z); root.add(wheel);
    wheel.add(new THREE.Mesh(tyreGeometry,rubber));
    const rim = new THREE.Mesh(rimGeometry,chrome); rim.rotation.x = Math.PI/2; wheel.add(rim);
    if(detail) for(let i=0;i<5;i++) {
      const spoke = assets.block(wheel,new THREE.Vector3(0,0,Math.sign(z)*.028),[.024,.235,.025],trim);
      spoke.rotation.z=i*Math.PI/5;
    }
    wheels.push(wheel);
  }
  const light = new THREE.SpotLight(0xcce3ff,1.6,13,.32,.8,1.4);
  light.position.set(1.05,.49,0); light.target.position.set(9,.03,0); root.add(light,light.target);
  root.traverse(object => { if(object.isMesh) object.castShadow = object.receiveShadow = true; });
  let lastOpacity = 1;
  function place(route, progress, distance, moving, elapsed, opacity = 1) {
    const p=route.getPointAt(clamp(progress)), tangent=route.getTangentAt(clamp(progress));
    root.position.copy(p);
    root.rotation.set(0,-Math.atan2(tangent.z,tangent.x),Math.atan2(tangent.y,Math.hypot(tangent.x,tangent.z)));
    for(const wheel of wheels) wheel.rotation.z=-distance/.215;
    body.position.y = moving ? Math.sin(distance*2.4)*.004 : 0;
    body.rotation.x = moving ? Math.sin(distance*1.2)*.002 : 0;
    root.visible = opacity > .015;
    if(Math.abs(lastOpacity-opacity)>.001) {
      lastOpacity=opacity;
      for(const material of ownMaterials) { material.transparent=opacity<.999; material.opacity=opacity; material.depthWrite=opacity>.8; }
    }
    light.intensity = opacity*1.6;
    return {position:p,tangent};
  }
  return {root,place,light,paint};
}
