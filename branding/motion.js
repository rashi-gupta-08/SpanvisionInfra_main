/* Coordinated interface motion. Editor geometry is never translated or scaled. */
(() => {
  const root=document.documentElement;
  const isHub=root.dataset.svTool==='hub';
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const capable=typeof Element.prototype.animate==='function'&&typeof IntersectionObserver==='function';
  const revealSelector='[data-sv-reveal], .module-card, .suggestion-card, .account-card, .account-details article, .account-heading, .account-nav, .auth-story, .auth-form-wrap, .suggestions-page>.eyebrow, .suggestions-page>h1, .suggestions-page>p, .preview-footer';
  const uiSelector='header, .titlebar, .title-bar, .brand-header, .ribbon, .ribbon-tabs, .toolbar, .statusbar, .status-bar, .sv-appearance-control, [role="toolbar"], [role="dialog"], [role="menu"], dialog[open]';
  const seen=new WeakSet(), active=new Map(), pending=new Set();
  let observer,reveals,themeTimer;
  function animate(node,frames,options){
    if(!capable||preference.matches||!node.isConnected)return;
    active.get(node)?.cancel();
    const animation=node.animate(frames,options);active.set(node,animation);
    const finished=()=>{if(active.get(node)===animation)active.delete(node);};
    animation.addEventListener('finish',finished,{once:true});animation.addEventListener('cancel',finished,{once:true});
  }
  function reveal(node){
    pending.delete(node);reveals?.unobserve(node);node.classList.remove('sv-reveal-waiting');
    node.dataset.svRevealed='true';
    const siblings=node.parentElement?.children;
    const index=siblings?Array.prototype.indexOf.call(siblings,node):0;
    animate(node,[{opacity:0,translate:'0 16px'},{opacity:1,translate:'0 0'}],{duration:580,delay:Math.min(index%4,3)*65,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
  }
  function discover(scope){
    if(!(scope instanceof Element))return;
    const selector=isHub?revealSelector:uiSelector;
    const candidates=[...(scope.matches(selector)?[scope]:[]),...scope.querySelectorAll(selector)];
    for(const node of candidates){
      if(seen.has(node)||!node.isConnected)continue;
      seen.add(node);node.dataset.svMotionElement='true';
      if(!capable||preference.matches){node.dataset.svRevealed='true';continue;}
      if(isHub){
        if(node.closest('dialog:not([open])'))continue;
        node.classList.add('sv-reveal-waiting');pending.add(node);reveals.observe(node);
      }else{
        // Opacity-only entrances keep measurements and pointer coordinates intact.
        animate(node,[{opacity:.65},{opacity:1}],{duration:240,easing:'ease-out'});
      }
    }
  }
  function forget(scope){
    if(!(scope instanceof Element))return;
    for(const node of [...pending])if(scope===node||scope.contains(node)){pending.delete(node);reveals?.unobserve(node);}
    for(const [node,animation]of active)if(scope===node||scope.contains(node)){animation.cancel();active.delete(node);}
  }
  function syncPreference(){
    root.dataset.svMotion=preference.matches?'reduced':'full';
    if(preference.matches){
      for(const [node,animation]of active){animation.cancel();active.delete(node);}
      for(const node of [...pending]){node.classList.remove('sv-reveal-waiting');node.dataset.svRevealed='true';reveals?.unobserve(node);}
      pending.clear();
    }
  }
  function themeChanged(){
    if(preference.matches)return;
    clearTimeout(themeTimer);root.dataset.svThemeChanging='true';
    themeTimer=setTimeout(()=>delete root.dataset.svThemeChanging,260);
  }
  function focused(event){
    const node=event.target.closest?.('.sv-reveal-waiting');
    if(node){reveal(node);active.get(node)?.finish();}
  }
  function start(){
    syncPreference();
    if(capable)reveals=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)reveal(entry.target);},{threshold:.06,rootMargin:'0px 0px -24px 0px'});
    discover(document.body);
    observer=new MutationObserver(records=>{
      for(const record of records){
        if(record.type==='attributes'){
          const node=record.target;
          if(node.matches('dialog[open]'))animate(node,[{opacity:.4},{opacity:1}],{duration:200,easing:'ease-out'});
          continue;
        }
        for(const node of record.removedNodes)forget(node);
        for(const node of record.addedNodes)discover(node);
      }
    });
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
  }
  preference.addEventListener('change',syncPreference);
  window.addEventListener('spanvision:mode-change',themeChanged);
  window.addEventListener('spanvision:mode-observed',themeChanged);
  document.addEventListener('focusin',focused);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('pagehide',event=>{
    // A cached page keeps its observers for restoration; a departing page releases them.
    if(event.persisted)return;
    observer?.disconnect();reveals?.disconnect();clearTimeout(themeTimer);
    for(const animation of active.values())animation.cancel();active.clear();pending.clear();
    preference.removeEventListener('change',syncPreference);
    window.removeEventListener('spanvision:mode-change',themeChanged);
    window.removeEventListener('spanvision:mode-observed',themeChanged);
    document.removeEventListener('focusin',focused);
  });
})();
