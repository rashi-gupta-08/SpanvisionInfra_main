import * as THREE from 'three';
import {createTrussLayout,TRUSS_SPANS} from './BridgeTrussLayout.js';

// Quiet 3D drafting geometry underneath the model, viewed by the same camera.
export function createBlueprint(assets) {
  const group=new THREE.Group();group.name='bridge-technical-drawing';
  const minor=assets.keepMaterial(new THREE.LineBasicMaterial({color:0xa3b1bd,transparent:true,opacity:.055,depthWrite:false}));
  const major=assets.keepMaterial(new THREE.LineBasicMaterial({color:0xa3b1bd,transparent:true,opacity:.12,depthWrite:false}));
  const ink=assets.keepMaterial(new THREE.LineBasicMaterial({color:0xc3cbd2,transparent:true,opacity:.27,depthWrite:false}));
  const fine=[],grid=[],drawing=[];
  const add=(target,a,b)=>target.push(...a,...b);
  const ground=(x,z)=>[x,-.37,z];
  for(let x=-90;x<=90;x+=4)add(x%20===0?grid:fine,ground(x,-60),ground(x,64));
  for(let z=-60;z<=64;z+=4)add(z%20===0?grid:fine,ground(-90,z),ground(90,z));
  const elevation=p=>ground(p[0],35-p[1]);
  for(const p of createTrussLayout().members) {
    if(p.a[2]>0&&p.b[2]>0)add(drawing,elevation(p.a),elevation(p.b));
  }
  for(const x of TRUSS_SPANS) {
    const top=5.4+x*.008-.7;
    for(const [a,b]of [[[x-1.8,0],[x-1.8,top]],[[x+1.8,0],[x+1.8,top]],[[x-2.6,0],[x+2.6,0]],[[x-2.6,-.6],[x+2.6,-.6]],[[x-2.6,-.6],[x-2.6,0]],[[x+2.6,-.6],[x+2.6,0]]])
      add(drawing,elevation([a[0],a[1],0]),elevation([b[0],b[1],0]));
    add(drawing,ground(x,36),ground(x,40));
    add(drawing,ground(x-1,39),ground(x+1,41));
  }
  add(drawing,ground(-42,40),ground(42,40));
  for(let x=-42;x<=42;x+=7)add(drawing,ground(x,39.75),ground(x,40.25));
  for(const [x,z]of [[-42,18],[14,18],[42,40]]) {
    for(let i=0;i<40;i++) {
      const a=i/40*Math.PI*2,b=(i+1)/40*Math.PI*2;
      add(drawing,ground(x+Math.cos(a)*.9,z+Math.sin(a)*.9),ground(x+Math.cos(b)*.9,z+Math.sin(b)*.9));
    }
    add(drawing,ground(x-1.8,z),ground(x+1.8,z));add(drawing,ground(x,z-1.8),ground(x,z+1.8));
  }
  for(const [points,material]of [[fine,minor],[grid,major],[drawing,ink]]) {
    const geometry=assets.remember(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    group.add(new THREE.LineSegments(geometry,material));
  }
  return {group,appearance(light){
    for(const material of [minor,major,ink])material.color.set(light?0x4e6070:0xb5c0ca);
    minor.opacity=light?.045:.045;major.opacity=light?.095:.105;ink.opacity=light?.2:.28;
  }};
}
