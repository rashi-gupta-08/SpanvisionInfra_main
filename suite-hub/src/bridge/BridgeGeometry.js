import * as THREE from 'three';
import {deckPoint as deck} from './BridgeRoad.js';
import {createTrussLayout,TRUSS_SPANS} from './BridgeTrussLayout.js';
const UP=new THREE.Vector3(0,1,0);

export function createBridgeGeometry(assets) {
  const bridge=new THREE.Group();bridge.name='riveted-through-truss-bridge';
  const steel=assets.standard({color:0xb1bbc3,metalness:.72,roughness:.4});
  const flange=assets.standard({color:0xd3dbe0,metalness:.78,roughness:.32});
  const plates=assets.standard({color:0x9da8b3,metalness:.66,roughness:.39});
  const bolts=assets.standard({color:0xe1e3e5,metalness:.85,roughness:.23});
  const concrete=assets.standard({color:0xa5a8a7,roughness:.92});
  const cap=assets.standard({color:0xc3c4c1,roughness:.8});
  const road=assets.standard({color:0x30353c,roughness:.95});
  const rail=assets.standard({color:0xb6c1ca,metalness:.72,roughness:.32});
  const marking=assets.keepMaterial(new THREE.MeshBasicMaterial({color:0xdfe4e9}));
  const seams=assets.keepMaterial(new THREE.LineBasicMaterial({color:0x69747d,transparent:true,opacity:.32}));
  const batches=new Map(),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
  const box=assets.remember(new THREE.BoxGeometry(1,1,1));
  function addBox(material,position,dimensions,quaternion=new THREE.Quaternion()) {
    if(!batches.has(material))batches.set(material,[]);
    batches.get(material).push({position,dimensions,quaternion});
  }
  function member(a,b,width,depth) {
    const direction=new THREE.Vector3().subVectors(b,a),length=direction.length();
    const center=a.clone().add(b).multiplyScalar(.5);
    const quaternion=new THREE.Quaternion().setFromUnitVectors(UP,direction.normalize());
    const offset=new THREE.Vector3(width/2-.035,0,0).applyQuaternion(quaternion);
    addBox(steel,center,[Math.max(width-.08,.025),length,.065],quaternion);
    addBox(flange,center.clone().add(offset),[.07,length,depth],quaternion);
    addBox(flange,center.clone().sub(offset),[.07,length,depth],quaternion);
  }
  const layout=createTrussLayout();
  const surfaceRivets=[];
  for(const p of layout.members) {
    const a=new THREE.Vector3(...p.a),b=new THREE.Vector3(...p.b);
    member(a,b,p.width,p.depth);
    if(!['end-post','vertical','diagonal','upper-chord'].includes(p.role))continue;
    const axis=b.clone().sub(a),length=axis.length();axis.normalize();
    const side=Math.sign((a.z+b.z)/2);
    const across=new THREE.Vector3(axis.y,-axis.x,0).normalize();
    const face=new THREE.Vector3(0,0,side*(p.depth/2+.022));
    const steps=Math.max(1,Math.floor(length/.65));
    for(let i=0;i<steps;i++) {
      const begin=a.clone().addScaledVector(axis,(i+.14)*length/steps).add(face);
      const end=a.clone().addScaledVector(axis,(i+.86)*length/steps).add(face);
      const left=begin.clone().addScaledVector(across,-p.width*.31);
      const right=end.clone().addScaledVector(across,p.width*.31);
      const direction=right.clone().sub(left);
      const quaternion=new THREE.Quaternion().setFromUnitVectors(UP,direction.clone().normalize());
      // Repeated lacing straps expose the built-up steelwork on the outer faces.
      addBox(plates,left.clone().add(right).multiplyScalar(.5),[.038,direction.length(),.026],quaternion);
      surfaceRivets.push(left.clone().add(new THREE.Vector3(0,0,side*.024)),right.clone().add(new THREE.Vector3(0,0,side*.024)));
    }
  }

  // Chamfered gussets and individual rivet heads, instanced across every joint.
  const shape=new THREE.Shape();
  shape.moveTo(-.56,-.48);shape.lineTo(.56,-.48);shape.lineTo(.56,.25);
  shape.lineTo(.31,.55);shape.lineTo(-.31,.55);shape.lineTo(-.56,.25);shape.closePath();
  const gusset=assets.remember(new THREE.ExtrudeGeometry(shape,{depth:.09,bevelEnabled:false}));
  const plateMesh=new THREE.InstancedMesh(gusset,plates,layout.joints.length);
  const rivets=[...surfaceRivets];
  layout.joints.forEach(({p,side},i)=>{
    rotation.setFromAxisAngle(UP,side<0?Math.PI:0);
    const position=new THREE.Vector3(...p).add(new THREE.Vector3(0,0,side*.19));
    matrix.compose(position,rotation,new THREE.Vector3(1,1,1));plateMesh.setMatrixAt(i,matrix);
    for(const dx of [-.39,-.13,.13,.39])for(const dy of [-.31,-.06,.19,.4]) {
      if(dy>.3&&Math.abs(dx)>.3)continue;
      rivets.push(new THREE.Vector3(p[0]+dx,p[1]+dy,p[2]+side*.3));
    }
  });
  plateMesh.castShadow=plateMesh.receiveShadow=true;bridge.add(plateMesh);
  const rivetMesh=new THREE.InstancedMesh(assets.remember(new THREE.SphereGeometry(1,8,5)),bolts,rivets.length);
  rivets.forEach((p,i)=>{matrix.makeScale(.048,.048,.036);matrix.setPosition(p);rivetMesh.setMatrixAt(i,matrix);});
  bridge.add(rivetMesh);

  const block=(p,d,m)=>assets.block(bridge,p,d,m);
  const outlined=(p,d,m)=>{
    const mesh=block(p,d,m),line=new THREE.LineSegments(assets.remember(new THREE.EdgesGeometry(box)),seams);
    line.position.copy(mesh.position);line.scale.copy(mesh.scale);bridge.add(line);return mesh;
  };
  // A continuous cambered roadway shares the exact curve used by the cars.
  const vertices=[],uvs=[],indices=[];
  for(let x=-42;x<=42;x++)for(const z of [-2.18,2.18]) {
    const p=deck(x,z,.035);vertices.push(...p.toArray());uvs.push((x+42)/3,(z+2.18)/4.36);
  }
  for(let i=0;i<84;i++){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  const surface=assets.remember(new THREE.BufferGeometry());surface.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  surface.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));surface.setIndex(indices);surface.computeVertexNormals();
  road.side=THREE.DoubleSide;bridge.add(new THREE.Mesh(surface,road));
  for(let x=-42;x<42;x+=1.4)for(const side of [-1,1]) {
    const z=side*2.15,end=Math.min(x+1.4,42);
    member(deck(x,z,.04),deck(x,z,.82),.09,.09);
    for(const height of [.28,.54,.82])member(deck(x,z,height),deck(end,z,height),.075,.08);
    addBox(cap,deck(x,side*2.42,-.02),[1.4,.16,.43]);
  }
  for(let x=-42;x<42;x+=3)block(deck(x,0,.06),[1.35,.018,.065],marking);
  for(const z of [-1.88,1.88])for(let x=-42;x<42;x+=3)block(deck(x,z,.058),[3,.015,.035],marking);
  // Lamps stand beyond the barriers and below the portal roof, clear of traffic.
  const lamp=assets.standard({color:0xe5e8e9,emissive:0xc8d7e5,emissiveIntensity:.35});
  for(let x=-38;x<=38;x+=9.3)for(const side of [-1,1]) {
    member(deck(x,side*2.42,.06),deck(x,side*2.42,2.35),.065,.065);
    addBox(rail,deck(x,side*2.34,2.32),[.18,.07,.38]);
    addBox(lamp,deck(x,side*2.32,2.27),[.12,.035,.23]);
  }

  // Layered solid piers, bearings and fine construction joints below each span.
  for(const x of TRUSS_SPANS) {
    const base=deck(x).y-.95;
    outlined(new THREE.Vector3(x,-.25,0),[5.1,.7,7.5],concrete);
    outlined(new THREE.Vector3(x,.25,0),[4.65,.28,7.05],cap);
    outlined(new THREE.Vector3(x,(base+.4)/2,0),[3.45,base-.4,5.55],concrete);
    outlined(new THREE.Vector3(x,base-.08,0),[4.25,.45,6.2],cap);
    for(const side of [-1,1])block(deck(x,side*2.7,-.64),[1.1,.22,.72],plates);
    for(let y=.95;y<base-.35;y+=.72) {
      for(const side of [-1,1])addBox(plates,new THREE.Vector3(x,y,side*2.782),[3.44,.013,.012]);
      for(const side of [-1,1])addBox(plates,new THREE.Vector3(x+side*1.732,y,0),[.012,.013,5.54]);
    }
  }
  // Elevated curved approaches continue onto clear corridors on the city banks.
  for(const side of [-1,1]) {
    const ramp=new THREE.CatmullRomCurve3([deck(side*40),new THREE.Vector3(side*48,5.5,2),
      new THREE.Vector3(side*56,4.6,9),new THREE.Vector3(side*64,2.8,12),new THREE.Vector3(side*75,0,12),new THREE.Vector3(side*79,-.25,12)]);
    const positions=[],triangles=[];let last;
    for(let i=0;i<=56;i++) {
      const p=ramp.getPoint(i/56),tangent=ramp.getTangent(i/56),normal=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
      const a=p.clone().addScaledVector(normal,-1.3),b=p.clone().addScaledVector(normal,1.3);
      positions.push(...a.toArray(),...b.toArray());
      if(i) {
        const j=(i-1)*2;triangles.push(j,j+2,j+1,j+1,j+2,j+3);
        for(let edge=0;edge<2;edge++)member(last[edge].clone().add(new THREE.Vector3(0,.6,0)),[a,b][edge].clone().add(new THREE.Vector3(0,.6,0)),.075,.08);
      }
      if(i%7===0) {
        for(const edge of [a,b])member(edge,edge.clone().add(new THREE.Vector3(0,.6,0)),.1,.1);
        if(p.y>.3)outlined(new THREE.Vector3(p.x,p.y/2-.15,p.z),[.65,p.y-.1,1.5],concrete);
      }
      last=[a,b];
    }
    const geometry=assets.remember(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setIndex(triangles);geometry.computeVertexNormals();bridge.add(new THREE.Mesh(geometry,road));
  }
  // Instanced box flanges give each member a real, open I-section instead of a line.
  for(const [material,instances]of batches) {
    const mesh=new THREE.InstancedMesh(box,material,instances.length);
    instances.forEach((p,i)=>{scale.set(...p.dimensions);matrix.compose(p.position,p.quaternion,scale);mesh.setMatrixAt(i,matrix);});
    mesh.computeBoundingSphere();mesh.castShadow=mesh.receiveShadow=true;bridge.add(mesh);
  }
  const asphalt=assets.texture(42,115,95);road.bumpMap=asphalt;road.bumpScale=.012;
  const grain=assets.texture(7,150,50);concrete.bumpMap=grain;concrete.bumpScale=.028;cap.bumpMap=grain;cap.bumpScale=.014;
  const brushed=assets.texture(91,160,20);steel.bumpMap=brushed;steel.bumpScale=.003;
  bridge.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});
  function appearance(light) {
    steel.color.set(light?0x8594a1:0xa7b2bc);flange.color.set(light?0xb4c0ca:0xd1d9df);
    plates.color.set(light?0x758593:0x82939f);bolts.color.set(light?0xc2ced7:0xd9e1e6);
    concrete.color.set(light?0xa7aaa8:0x8d979e);cap.color.set(light?0xc4c5c0:0xbac4cb);
    road.color.set(light?0x43494f:0x2e343c);rail.color.set(light?0x8b9aaa:0xb9c5d0);
    seams.opacity=light?.25:.32;
  }
  return {group:bridge,appearance,stats:{spans:3,members:layout.members.length,rivets:rivets.length}};
}
