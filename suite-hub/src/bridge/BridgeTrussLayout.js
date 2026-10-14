import {deckCoordinates} from './BridgeCoordinates.js';

export const TRUSS_SIDE = 2.7;
export const TRUSS_SPANS = [-42,-14,14,42];
export const TRUSS_HEIGHT = 7.4;

// Shared world coordinates for solid steel, drawing fallback and clearance checks.
export function createTrussLayout() {
  const members=[],joints=[];
  const point=deckCoordinates;
  const add=(a,b,width,depth,role)=>members.push({a,b,width,depth,role});
  const seen=new Set();
  const joint=(p,side)=>{const key=p.join(',');if(!seen.has(key)){seen.add(key);joints.push({p,side});}};
  for(let span=0;span<3;span++) {
    const start=TRUSS_SPANS[span],panel=28/6;
    for(const side of [-1,1]) {
      const z=side*TRUSS_SIDE;
      const bottom=Array.from({length:7},(_,i)=>point(start+i*panel,z,.12));
      const top=Array.from({length:7},(_,i)=>point(start+i*panel,z,i===0||i===6?.12:TRUSS_HEIGHT));
      for(let i=0;i<6;i++)add(bottom[i],bottom[i+1],.42,.32,'lower-chord');
      add(bottom[0],top[1],.52,.34,'end-post');
      add(top[5],bottom[6],.52,.34,'end-post');
      for(let i=1;i<5;i++) {
        add(top[i],top[i+1],.46,.34,'upper-chord');
        add(i%2?top[i]:bottom[i],i%2?bottom[i+1]:top[i+1],.34,.26,'diagonal');
      }
      for(let i=1;i<=5;i++)add(bottom[i],top[i],.25,.26,'vertical');
      for(const p of bottom)joint(p,side);
      for(let i=1;i<=5;i++)joint(top[i],side);
    }
    for(let i=1;i<=5;i++) {
      const x=start+i*panel;
      add(point(x,-TRUSS_SIDE,TRUSS_HEIGHT-.12),point(x,TRUSS_SIDE,TRUSS_HEIGHT-.12),.27,.28,'roof-crossbeam');
      if(i<5) {
        add(point(x,-TRUSS_SIDE,TRUSS_HEIGHT-.08),point(x+panel,TRUSS_SIDE,TRUSS_HEIGHT-.08),.1,.12,'roof-brace');
        add(point(x,TRUSS_SIDE,TRUSS_HEIGHT-.08),point(x+panel,-TRUSS_SIDE,TRUSS_HEIGHT-.08),.1,.12,'roof-brace');
      }
      // Portal knees stay outside the traffic envelope below the roof.
      for(const side of [-1,1])add(point(x,side*TRUSS_SIDE,TRUSS_HEIGHT-1.5),point(x,side*1.8,TRUSS_HEIGHT-.12),.16,.16,'portal-knee');
    }
  }
  for(let x=-42;x<42;x+=3) {
    const next=Math.min(x+3,42);
    add(point(x,-TRUSS_SIDE,-.7),point(x,TRUSS_SIDE,-.7),.28,.22,'floor-beam');
    for(const z of [-TRUSS_SIDE,TRUSS_SIDE])add(point(x,z,-.7),point(next,z,-.7),.5,.24,'deck-girder');
    add(point(x,-TRUSS_SIDE,-.85),point(next,TRUSS_SIDE,-.85),.1,.1,'floor-brace');
    add(point(x,TRUSS_SIDE,-.85),point(next,-TRUSS_SIDE,-.85),.1,.1,'floor-brace');
  }
  return {members,joints};
}
