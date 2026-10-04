import { Show } from "solid-js";
import brand from "../brand.json";
import { runtime } from "../lib/runtime";
export default function TitleBar() {
  async function windowAction(action:"minimize"|"close") {
    if(!runtime.native)return;
    const {getCurrentWindow}=await import("@tauri-apps/api/window");
    await getCurrentWindow()[action]();
  }
  return <header class="titlebar" data-tauri-drag-region>
    <a class="titlebar-lockup" href="#landing"><img src="/sw-mark.svg" alt="SW" width="22" height="22"/><span>{brand.product}<small>{brand.organization}</small></span></a>
    <div class="titlebar-title" data-tauri-drag-region><span class="titlebar-version">v{brand.version}</span></div>
    <div class="titlebar-buttons"><a href="#suggestions" class="titlebar-link">Suggestions</a><a href="#login" class="titlebar-link">Account preview</a>
      <Show when={runtime.native}><button class="titlebar-btn" aria-label="Minimize" onClick={()=>windowAction("minimize")}>−</button><button class="titlebar-btn" aria-label="Close" onClick={()=>windowAction("close")}>×</button></Show>
    </div>
  </header>;
}
