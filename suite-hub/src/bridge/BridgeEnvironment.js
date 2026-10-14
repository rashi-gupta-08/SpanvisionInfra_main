import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {createBlueprint} from './BridgeBlueprint.js';

// Keep a clear landing-road corridor on both banks; the city occupies land.
export function createCityLayout() {
  const buildings=[];
  for(const side of [-1,1])for(let column=0;column<5;column++)for(let row=0;row<16;row++) {
    const z=-70+row*9;
    if(z>-9&&z<25)continue;
    const index=row*5+column+(side>0?13:0);
    const h=4.8+column*2+(index*7%9)*.8+(index%11===0?3.4:0);
    buildings.push({side,x:side*(49+column*12),y:h/2-.3,z,
      w:3.1+(index%4)*.65,d:3.4+(index%3)*.7,h});
  }
  return buildings;
}

export function createEnvironment(scene, renderer, assets, bridge) {
  const environmentRoom=new RoomEnvironment();
  const pmrem=new THREE.PMREMGenerator(renderer);
  const environmentMap=pmrem.fromScene(environmentRoom,.035);
  scene.environment=environmentMap.texture;
  environmentRoom.dispose();pmrem.dispose();
  scene.environmentIntensity=.55;
  const skyMaterial=assets.keepMaterial(new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{top:{value:new THREE.Color()},horizon:{value:new THREE.Color()}},
    vertexShader:'varying vec3 skyPosition;void main(){skyPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec3 skyPosition;uniform vec3 top;uniform vec3 horizon;void main(){float h=clamp(normalize(skyPosition).y*.85,0.0,1.0);gl_FragColor=vec4(mix(horizon,top,pow(h,.55)),1.0);}'
  }));
  scene.add(new THREE.Mesh(assets.remember(new THREE.SphereGeometry(600,24,12)),skyMaterial));
  const waterMaterial=assets.keepMaterial(new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,
    uniforms:{time:{value:0},tint:{value:new THREE.Color()},light:{value:0}},
    vertexShader:'varying vec2 waterUv;void main(){waterUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec2 waterUv;uniform float time;uniform vec3 tint;uniform float light;
      void main(){float a=sin(waterUv.y*520.0+sin(waterUv.x*75.0+time*.4)*2.0+time*.7);
      float b=sin(waterUv.x*360.0-waterUv.y*80.0+time*.45);float glint=pow(max(a*b,0.0),10.0);
      gl_FragColor=vec4(tint+vec3(glint*(.018+light*.025)),.77);}`
  }));
  const water=new THREE.Mesh(assets.remember(new THREE.PlaneGeometry(180,220,1,1)),waterMaterial);
  water.rotation.x=-Math.PI/2;water.position.y=-.44;scene.add(water);
  const blueprint=createBlueprint(assets);scene.add(blueprint.group);
  const reflection=bridge.clone(true),reflectedMaterials=new Map();reflection.scale.y=-1;reflection.position.y=-.96;
  reflection.traverse(object=>{
    object.castShadow=object.receiveShadow=false;
    if(!object.material)return;
    if(!reflectedMaterials.has(object.material)){
      const copy=assets.keepMaterial(object.material.clone());copy.transparent=true;copy.opacity=object.isLine?.015:.075;copy.depthWrite=false;
      reflectedMaterials.set(object.material,copy);
    }
    object.material=reflectedMaterials.get(object.material);
  });scene.add(reflection);
  const bank=assets.standard({color:0x394648,roughness:1});
  const bankWall=assets.standard({color:0x636f75,roughness:.9});
  const building=assets.standard({color:0x526371,roughness:.65,metalness:.25});
  const windows=assets.standard({color:0x8899a7,emissive:0x8296a8,emissiveIntensity:.18,roughness:.26,metalness:.45});
  const shore=new THREE.Group();scene.add(shore);
  for(const side of [-1,1]){
    assets.block(shore,new THREE.Vector3(side*76,-.95,0),[62,1.3,160],bank);
    assets.block(shore,new THREE.Vector3(side*45,-.7,0),[1.6,1.8,160],bankWall);
    // The curved viaduct descends onto this shore road instead of ending over water.
    assets.block(shore,new THREE.Vector3(side*86,-.275,12),[18,.05,2.6],bankWall);
  }
  // Instanced silhouettes and window bands provide scenery without expensive
  // separate models, textures, or network requests.
  const buildings=createCityLayout(),bands=[],roofs=[];
  for(const p of buildings) {
    for(let y=1.1;y<p.h-.6;y+=1.25) {
      for(const side of [-1,1]) {
        bands.push({x:p.x,y,z:p.z+side*(p.d/2+.025),w:p.w*.84,h:.3,d:.035});
        bands.push({x:p.x+side*(p.w/2+.025),y,z:p.z,w:.035,h:.3,d:p.d*.84});
      }
    }
    roofs.push({x:p.x,y:p.h-.25,z:p.z,w:p.w*1.05,h:.1,d:p.d*1.05});
    roofs.push({x:p.x,y:p.h+.12,z:p.z,w:p.w*.34,h:.55,d:p.d*.35});
  }
  const box=assets.remember(new THREE.BoxGeometry(1,1,1)),matrix=new THREE.Matrix4();
  const mesh=new THREE.InstancedMesh(box,building,buildings.length);
  buildings.forEach((p,i)=>{matrix.makeScale(p.w,p.h,p.d);matrix.setPosition(p.x,p.y,p.z);mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,new THREE.Color().setHSL(.56,.06,.76+(i%5)*.035));});
  mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
  const windowsMesh=new THREE.InstancedMesh(box,windows,bands.length);
  bands.forEach((p,i)=>{matrix.makeScale(p.w,p.h,p.d);matrix.setPosition(p.x,p.y,p.z);windowsMesh.setMatrixAt(i,matrix);});scene.add(windowsMesh);
  const roofMesh=new THREE.InstancedMesh(box,bankWall,roofs.length);
  roofs.forEach((p,i)=>{matrix.makeScale(p.w,p.h,p.d);matrix.setPosition(p.x,p.y,p.z);roofMesh.setMatrixAt(i,matrix);});scene.add(roofMesh);
  const cityCounts={left:buildings.filter(p=>p.side<0).length,right:buildings.filter(p=>p.side>0).length};
  const ambient=new THREE.HemisphereLight(0xe5eef8,0x25313b,1.8);scene.add(ambient);
  const key=new THREE.DirectionalLight(0xfff5e8,3.6);key.position.set(-26,45,35);scene.add(key);
  key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-66,right:66,top:50,bottom:-50,near:1,far:160});
  key.shadow.bias=-.0002;key.shadow.normalBias=.06;
  const rim=new THREE.DirectionalLight(0xb8d2eb,2.2);rim.position.set(28,18,-32);scene.add(rim);
  const fill=new THREE.DirectionalLight(0xe8f0ff,.8);fill.position.set(10,15,55);scene.add(fill);
  function appearance(light) {
    skyMaterial.uniforms.top.value.set(light?0xd2d9de:0x030507);
    skyMaterial.uniforms.horizon.value.set(light?0xe7ebee:0x151a20);
    waterMaterial.uniforms.tint.value.set(light?0xb0bbc3:0x080d12);
    waterMaterial.uniforms.light.value=light?1:0;
    bank.color.set(light?0x889589:0x263337);bankWall.color.set(light?0x9ea7a9:0x566570);
    building.color.set(light?0xa2adb7:0x29343e);windows.emissiveIntensity=light?.04:.1;
    scene.fog=new THREE.FogExp2(light?0xd4dde3:0x10161c,.005);
    ambient.intensity=light?1.7:1.15;key.intensity=light?2.9:3.6;rim.intensity=light?1.6:2.35;
    renderer.toneMappingExposure=light?.94:1.06;
    blueprint.appearance(light);
    for(const [source,copy]of reflectedMaterials)if(source.color&&copy.color)copy.color.copy(source.color);
  }
  return {appearance,cityCounts,update(time){waterMaterial.uniforms.time.value=time;},
    dispose(){key.shadow.dispose();environmentMap.dispose();scene.environment=null;}
  };
}
