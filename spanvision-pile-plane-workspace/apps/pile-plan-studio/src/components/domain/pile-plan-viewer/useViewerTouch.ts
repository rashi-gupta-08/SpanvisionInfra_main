import {useEffect,useRef,type RefObject,type MouseEvent as ReactMouseEvent} from "react";
import {pinchViewport} from "./touchViewport.ts";
import type {Viewport} from "../../../viewer/viewport.ts";
import type {LocalCanvasRect} from "./viewerDomCoordinates.ts";
type Options={
  canvasRef:RefObject<HTMLDivElement|null>;
  canvasRectRef:RefObject<LocalCanvasRect|null>;
  viewportRef:RefObject<Viewport>;
  applyViewportDisplay:(viewport:Viewport)=>void;
  getProjectViewportPointer:(x:number,y:number,rect:LocalCanvasRect)=>{x:number;y:number};
  handleMouseDown:(event:ReactMouseEvent<HTMLDivElement>)=>void;
  handleMouseMove:(event:ReactMouseEvent<HTMLDivElement>)=>void;
  handleMouseUp:(event:ReactMouseEvent<HTMLDivElement>)=>void;
  cancelPointerInteraction:()=>void;
  commitViewport:(viewport:Viewport)=>void;
};
export function useViewerTouch(options:Options) {
  const latest=useRef(options);latest.current=options;
  useEffect(()=>{
    const canvas=latest.current.canvasRef.current;if(!canvas)return;
    let gesture:{kind:"single";x:number;y:number;lastX:number;lastY:number;target:HTMLElement;moved:boolean}|{kind:"pinch";viewport:Viewport;center:{x:number;y:number};distance:number}|null=null;
    const mouse=(event:TouchEvent,touch:{clientX:number;clientY:number})=>({clientX:touch.clientX,clientY:touch.clientY,target:canvas,currentTarget:canvas,button:0,shiftKey:false,ctrlKey:false,metaKey:false,preventDefault:()=>event.preventDefault(),stopPropagation:()=>event.stopPropagation()} as unknown as ReactMouseEvent<HTMLDivElement>);
    const frame=(touches:TouchList)=>{
      const rect=latest.current.canvasRectRef.current;
      const x=(touches[0].clientX+touches[1].clientX)/2,y=(touches[0].clientY+touches[1].clientY)/2;
      return {center:rect?latest.current.getProjectViewportPointer(x,y,rect):{x,y},distance:Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY)};
    };
    const start=(event:TouchEvent)=>{
      event.preventDefault();
      if(event.touches.length>=2){latest.current.cancelPointerInteraction();gesture={kind:"pinch",viewport:{...latest.current.viewportRef.current},...frame(event.touches)};return;}
      const touch=event.touches[0];if(!touch)return;
      gesture={kind:"single",x:touch.clientX,y:touch.clientY,lastX:touch.clientX,lastY:touch.clientY,target:event.target as HTMLElement,moved:false};
      latest.current.handleMouseDown(mouse(event,touch));
    };
    const move=(event:TouchEvent)=>{
      if(!gesture)return;event.preventDefault();
      if(gesture.kind==="pinch"){
        if(event.touches.length<2)return;
        const viewport=pinchViewport(gesture.viewport,gesture,frame(event.touches));
        latest.current.viewportRef.current=viewport;latest.current.applyViewportDisplay(viewport);return;
      }
      const touch=event.touches[0];if(!touch)return;
      gesture.moved ||= Math.hypot(touch.clientX-gesture.x,touch.clientY-gesture.y)>3;
      gesture.lastX=touch.clientX;gesture.lastY=touch.clientY;
      latest.current.handleMouseMove(mouse(event,touch));
    };
    const end=(event:TouchEvent)=>{
      if(!gesture)return;event.preventDefault();if(event.touches.length)return;
      if(gesture.kind==="pinch")latest.current.commitViewport(latest.current.viewportRef.current);
      else if(!gesture.moved&&gesture.target.closest("button")){
        latest.current.cancelPointerInteraction();(gesture.target.closest("button") as HTMLButtonElement).click();
      }else latest.current.handleMouseUp(mouse(event,{clientX:gesture.lastX,clientY:gesture.lastY}));
      gesture=null;
    };
    const cancel=()=>{latest.current.cancelPointerInteraction();if(gesture?.kind==="pinch")latest.current.commitViewport(latest.current.viewportRef.current);gesture=null;};
    canvas.addEventListener("touchstart",start,{passive:false});canvas.addEventListener("touchmove",move,{passive:false});canvas.addEventListener("touchend",end,{passive:false});canvas.addEventListener("touchcancel",cancel);
    return()=>{canvas.removeEventListener("touchstart",start);canvas.removeEventListener("touchmove",move);canvas.removeEventListener("touchend",end);canvas.removeEventListener("touchcancel",cancel);};
  },[]);
}
