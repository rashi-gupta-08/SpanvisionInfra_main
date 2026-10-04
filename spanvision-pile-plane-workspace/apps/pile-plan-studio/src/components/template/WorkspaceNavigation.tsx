import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function useResponsiveWorkspace() {
  const [narrow,setNarrow]=useState(() => innerWidth < 1024);
  const [phone,setPhone]=useState(() => innerWidth < 768);
  const [drawer,setDrawer]=useState<"explorer" | "properties" | null>(null);
  const [commands,setCommands]=useState(false);
  const previousFocus=useRef<HTMLElement | null>(null);
  useEffect(() => {
    const resize=() => {setNarrow(innerWidth<1024);setPhone(innerWidth<768);if(innerWidth>=1024)setDrawer(null);};
    window.addEventListener("resize",resize);return () => window.removeEventListener("resize",resize);
  },[]);
  useEffect(() => {
    if(!drawer)return;
    if(!previousFocus.current?.isConnected)previousFocus.current=document.activeElement as HTMLElement;
    const panel=document.querySelector<HTMLElement>(drawer==="explorer"?".project-explorer":".properties-panel");
    if(!panel)return;
    panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.tabIndex=-1;
    const frame=requestAnimationFrame(() => (panel.querySelector<HTMLElement>("button:not(:disabled),input,a")||panel).focus());
    const key=(event:KeyboardEvent) => {
      if(event.key==="Escape"){event.preventDefault();setDrawer(null);}
      if(event.key!=="Tab")return;
      const items=[...panel.querySelectorAll<HTMLElement>("button:not(:disabled),a[href],input,select,[tabindex='0']")].filter(el=>el.getClientRects().length);
      const first=items[0],last=items[items.length-1];
      if(!first){event.preventDefault();panel.focus();}
      else if(event.shiftKey&&(document.activeElement===first||document.activeElement===panel)){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    window.addEventListener("keydown",key);
    return () => {cancelAnimationFrame(frame);window.removeEventListener("keydown",key);panel.removeAttribute("role");panel.removeAttribute("aria-modal");panel.removeAttribute("tabindex");previousFocus.current?.focus();};
  },[drawer]);
  const openDrawer=(value:"explorer"|"properties"|null,trigger:HTMLElement)=>{previousFocus.current=trigger;setDrawer(value);};
  return {narrow,phone,drawer,setDrawer,openDrawer,commands,setCommands};
}

export function WorkspaceNavigation({controller:c}:{controller:ReturnType<typeof useResponsiveWorkspace>}) {
  const {t}=useTranslation();
  return <nav className="workspace-navigation" aria-label={t("appName")}>
    <button aria-expanded={c.drawer==="explorer"} onClick={event=>c.openDrawer(c.drawer==="explorer"?null:"explorer",event.currentTarget)}>{t("workspaceNavigation.explorer")}</button>
    <button className="phone-control" aria-expanded={c.drawer==="properties"} onClick={event=>c.openDrawer(c.drawer==="properties"?null:"properties",event.currentTarget)}>{t("workspaceNavigation.properties")}</button>
    <button className="phone-control" aria-expanded={c.commands} onClick={()=>c.setCommands(!c.commands)}>{t("workspaceNavigation.commands")}</button>
    {c.drawer&&<button className="drawer-close" onClick={()=>c.setDrawer(null)} aria-label={t("close")}>×</button>}
  </nav>;
}
