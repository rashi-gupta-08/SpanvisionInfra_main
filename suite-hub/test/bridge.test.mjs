import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BridgeMotion,INTRO_DURATION,DRIVE_DELAY,DRIVE_SPEED,START_ANGLE,TAU} from '../src/bridge/BridgeMotion.js';
import {createCityLayout} from '../src/bridge/BridgeEnvironment.js';
import {createDrivingRoute,deckPoint,ROAD_HALF_WIDTH,CAR_LANE} from '../src/bridge/BridgeRoad.js';
import {createAssets} from '../src/bridge/BridgeAssets.js';
import {createCar} from '../src/bridge/BridgeCar.js';
import {createTrussLayout} from '../src/bridge/BridgeTrussLayout.js';
import {createBridgeGeometry} from '../src/bridge/BridgeGeometry.js';

test('the complete introduction makes one 360-degree orbit, then holds without a chase or second orbit',()=>{
  const motion=new BridgeMotion();
  for(let i=0;i<INTRO_DURATION*60;i++)motion.advance(1/60);
  motion.advance(.00001);
  assert.equal(motion.mode,'free');assert.equal(motion.introCompleted,true);
  assert.ok(Math.abs(motion.orbitAngle-START_ANGLE-TAU)<1e-9);
  const angle=motion.orbitAngle;
  motion.advance(INTRO_DURATION*3);
  assert.equal(motion.mode,'free');assert.equal(motion.orbitAngle,angle);
  assert.equal(motion.orbitElapsed,INTRO_DURATION);
});
test('both city banks have dense buildings on land, clear of approaches and each other',()=>{
  const city=createCityLayout();assert.deepEqual(city,createCityLayout());
  for(const side of [-1,1])assert.ok(city.filter(p=>p.side===side).length>=60);
  for(const p of city) {
    assert.ok(Math.abs(p.x)-p.w/2>=45&&Math.abs(p.x)+p.w/2<=107);
    assert.ok(Math.abs(p.z)+p.d/2<=80);
    assert.ok(p.z+p.d/2<=-9||p.z-p.d/2>=25);
    assert.ok(Math.abs(p.y-p.h/2+.3)<1e-9);
  }
  for(let i=0;i<city.length;i++)for(let j=i+1;j<city.length;j++) {
    const a=city[i],b=city[j];
    assert.ok(Math.abs(a.x-b.x)>=(a.w+b.w)/2||Math.abs(a.z-b.z)>=(a.d+b.d)/2);
  }
});
test('selecting free mode internally cancels future automatic camera transitions',()=>{
  const motion=new BridgeMotion();motion.advance(3);motion.select('free');motion.advance(50);
  assert.equal(motion.mode,'free');
  motion.select('follow');assert.equal(motion.mode,'free');
});
test('driving and the orbit are independent of rendering frame rate',()=>{
  const a=new BridgeMotion(),b=new BridgeMotion();
  for(let i=0;i<6*30;i++)a.advance(1/30);
  for(let i=0;i<6*120;i++)b.advance(1/120);
  assert.ok(Math.abs(a.journey(80).distance-b.journey(80).distance)<1e-9);
  assert.ok(Math.abs(a.orbitAngle-b.orbitAngle)<1e-9);
});
test('pause freezes the drive and cinematic clock; mode switches preserve the journey',()=>{
  const motion=new BridgeMotion();motion.advance(8);const before=motion.snapshot(80);
  motion.paused=true;motion.advance(20);assert.deepEqual(motion.snapshot(80),{...before,paused:true});
  motion.select('free');assert.equal(motion.elapsed,before.elapsed);
  motion.paused=false;motion.advance(1);assert.ok(motion.journey(80).distance>before.distance);
});
test('replay restarts both clocks; reduced motion starts paused in exploration',()=>{
  const motion=new BridgeMotion(true);assert.equal(motion.paused,true);assert.equal(motion.mode,'free');
  motion.advance(10);assert.equal(motion.elapsed,0);
  motion.replay();assert.equal(motion.paused,false);assert.equal(motion.intro,true);assert.equal(motion.elapsed,0);
});
test('the initially visible car remains visible when driving starts',()=>{
  const motion=new BridgeMotion();assert.equal(motion.journey(80).opacity,1);
  motion.advance(DRIVE_DELAY+.02);assert.equal(motion.journey(80).opacity,1);assert.ok(motion.journey(80).distance>0);
});
test('the car stops at the endpoint and fades before returning; it never overshoots the road',()=>{
  const motion=new BridgeMotion();motion.advance(DRIVE_DELAY+80/DRIVE_SPEED+.3);
  assert.equal(motion.journey(80).progress,1);assert.equal(motion.journey(80).moving,false);
  motion.advance(1);assert.equal(motion.journey(80).opacity,0);
  for(let i=0;i<12000;i++){motion.advance(.017);const state=motion.journey(80);assert.ok(state.progress>=0&&state.progress<=1);}
});
test('arc-length sampling keeps the route within its lane and follows the road elevation',()=>{
  for(const reverse of [false,true]) {
    const route=createDrivingRoute(reverse?-CAR_LANE:CAR_LANE,reverse);
    let previous=route.getPointAt(0),min=Infinity,max=0;
    for(let i=0;i<=1000;i++) {
      const p=route.getPointAt(i/1000),road=deckPoint(p.x);
      assert.ok(p.x>=-40.00001&&p.x<=40.00001);
      assert.ok(Math.abs(p.z-road.z)+.49<ROAD_HALF_WIDTH);
      assert.ok(Math.abs(p.y-road.y-.06)<.00001);
      if(i){const spacing=p.distanceTo(previous);min=Math.min(min,spacing);max=Math.max(max,spacing);}
      previous=p;
    }
    assert.ok(max/min<1.003);
  }
});
test('both actual cars fit between barriers, clear every steel member and rest on the road',()=>{
  const assets=createAssets(),car=createCar(assets);
  const steel=createTrussLayout().members.map(p=>new THREE.Box3().setFromPoints([new THREE.Vector3(...p.a),new THREE.Vector3(...p.b)]).expandByScalar(Math.max(p.width,p.depth)/2));
  try {
    for(const lane of [CAR_LANE,-CAR_LANE]) {
      const route=createDrivingRoute(lane,lane<0);
      for(let i=0;i<=200;i++) {
        const p=route.getPointAt(i/200);car.place(route,i/200,route.getLength()*i/200,true,4);
        const box=new THREE.Box3().setFromObject(car.root,true),road=deckPoint(p.x);
        assert.ok(box.max.z<road.z+2.12&&box.min.z>road.z-2.12);
        assert.ok(box.min.y>=road.y-.025);
        for(const member of steel)assert.equal(box.intersectsBox(member),false,'Traffic must not intersect structural steel');
        assert.ok(Number.isFinite(car.root.rotation.y));
      }
    }
  }finally{assets.dispose();}
});
test('the steel bridge generates solid spans, instanced rivets and finite geometry',()=>{
  const assets=createAssets();
  try {
    const bridge=createBridgeGeometry({...assets,texture:()=>undefined});
    assert.equal(bridge.stats.spans,3);assert.ok(bridge.stats.rivets>900);
    const bounds=new THREE.Box3().setFromObject(bridge.group);
    for(const value of [...bounds.min.toArray(),...bounds.max.toArray()])assert.ok(Number.isFinite(value));
    assert.ok(bounds.max.y>12&&bounds.min.x<-70&&bounds.max.x>70);
    let instanced=0;bridge.group.traverse(p=>{if(p.isInstancedMesh)instanced++;});assert.ok(instanced>=5);
    bridge.appearance(true);bridge.appearance(false);
  }finally{assets.dispose();}
});
