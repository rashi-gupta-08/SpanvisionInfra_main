import { clampScale, panViewport, zoomViewportAtPoint, type Viewport } from "../../../viewer/viewport.ts";
type Point={x:number;y:number};
export function pinchViewport(viewport:Viewport, start:{center:Point;distance:number}, current:{center:Point;distance:number}):Viewport {
  const nextScale=clampScale(viewport.scale*current.distance/Math.max(start.distance,1));
  const zoomed=zoomViewportAtPoint(viewport,{cursorX:start.center.x,cursorY:start.center.y,nextScale});
  return panViewport(zoomed,{deltaX:current.center.x-start.center.x,deltaY:current.center.y-start.center.y});
}
