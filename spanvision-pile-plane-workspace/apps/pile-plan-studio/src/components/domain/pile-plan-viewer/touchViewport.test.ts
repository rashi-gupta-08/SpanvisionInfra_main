import test from "node:test";
import assert from "node:assert/strict";
import { pinchViewport } from "./touchViewport.ts";
test("pinch preserves the world point beneath the moving centroid",()=>{
  const original={scale:1,offsetX:10,offsetY:20};
  const next=pinchViewport(original,{center:{x:100,y:80},distance:100},{center:{x:120,y:90},distance:200});
  assert.equal(next.scale,2);
  assert.equal((100-original.offsetX)/original.scale,(120-next.offsetX)/next.scale);
  assert.equal((80-original.offsetY)/original.scale,(90-next.offsetY)/next.scale);
  assert.equal(pinchViewport(original,{center:{x:0,y:0},distance:1},{center:{x:0,y:0},distance:100}).scale,10);
});
