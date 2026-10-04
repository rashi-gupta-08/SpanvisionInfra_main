import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';
import { render } from 'solid-js/web';
import brand from './brand.json';
import Floorplan from './Floorplan';
import Globe from './Globe';
import './preview.css';
import './palette.css';
import './hub.css';

const organization=brand.hub.organization||brand.organization;
function Arrow() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>; }
function ToolIcon(props) {
  const paths={cad:'M4 4h16v16H4zM4 16 16 4M8 20 20 8',cad2d:'M4 20V4h16M8 16l8-8 3 3-8 8-4 1z',bim:'m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9',pdf:'M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6',ifc:'m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9',calc:'M5 3h14v18H5zM8 7h8M8 11h2M14 11h2M8 15h2M14 15h2M8 18h2M14 18h2',planner:'M4 5h16v16H4zM8 3v4M16 3v4M4 10h16M8 14h3M13 17h3',fem:'M3 20h18M5 20V5h14v15M5 5l14 15M19 5 5 20M3 5h4M17 5h4',frame:'M3 20h18M5 20V5h14v15M3 5h4M17 5h4M4 19h2M18 19h2',calculation:'M4 4h16v16H4zM8 8h3M9.5 6.5v3M14 8h3M8 13l3 3M11 13l-3 3M14 13h3M14 16h3',geo:'M3 5h18M3 10c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0M3 20h18',speech:'M4 10v4M8 6v12M12 3v18M16 6v12M20 10v4',stl:'m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5',field:'M9 4H5v17h14V4h-4M9 2h6v5H9zM8 13l3 3 5-6',pointcloud:'M4 4h2v2H4zM11 4h2v2h-2zM18 4h2v2h-2zM4 11h2v2H4zM11 11h2v2h-2zM18 11h2v2h-2zM4 18h2v2H4zM11 18h2v2h-2zM18 18h2v2h-2z',pile:'M3 6h18M6 6v13M12 6v13M18 6v13M4 19h4M10 19h4M16 19h4'};
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={paths[props.module.id]}/></svg>;
}
function Mark() { return <a class="brand-lockup" href="#landing" aria-label={`${organization} home`}><img src="/spanvision-mark.svg" alt={brand.hub.mark||'SI'}/><span>{organization}<small>Engineering tools</small></span></a>; }

function currentScreen() {
  const requested=location.hash.slice(1)||'landing';
  if(requested==='suggestions') {
    history.replaceState(history.state,'',location.pathname+location.search+'#modules');
    return 'modules';
  }
  return requested;
}
function App() {
  const [screen,setScreen]=createSignal(currentScreen());
  const [mode,setMode]=createSignal(document.documentElement.dataset.svMode || 'dark');
  const [status,setStatus]=createSignal({});
  const [name,setName]=createSignal('Alex Morgan');
  const [error,setError]=createSignal('');
  const [success,setSuccess]=createSignal('');
  const [scanState,setScanState]=createSignal('ready');
  const [progress,setProgress]=createSignal(0);
  const [filename,setFilename]=createSignal('Ground floor scan.pdf');
  let modal, upload, scanTimer, previousFocus, requestController;
  const validScreens=['landing','modules','login','signup','account'];
  const openUrl=module=>`http://127.0.0.1:${module.port}${module.path}?appearance=${mode()}`;
  function exploreTools() { document.getElementById('tools-title')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}); }
  function clearScan() { clearInterval(scanTimer); scanTimer=undefined; }
  function closeScan() { clearScan(); modal.close(); previousFocus?.focus(); }
  function openScan(event) { previousFocus=event.currentTarget;clearScan();setScanState('ready');setProgress(0);modal.showModal(); }
  function startScan() {
    clearScan();setProgress(0);setScanState('processing');
    scanTimer=setInterval(()=>{
      const next=Math.min(progress()+10,100);setProgress(next);
      if(next===100){clearScan();setScanState('complete');}
    },180);
  }
  function trapScanFocus(event) {
    if(event.key!=='Tab')return;
    const items=[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')].filter(item=>item.getClientRects().length);
    const first=items[0],last=items.at(-1);
    if(!first){event.preventDefault();modal.focus();}
    else if(event.shiftKey&&(document.activeElement===first||!modal.contains(document.activeElement))){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||!modal.contains(document.activeElement))){event.preventDefault();first.focus();}
  }
  async function refreshStatus() {
    requestController?.abort();requestController=new AbortController();
    try {
      const response=await fetch('/__suite/status',{signal:requestController.signal});
      if(!response.ok)throw new Error('Preview status unavailable');
      const result=await response.json();
      if(!Array.isArray(result.modules))throw new Error('Invalid preview status');
      const modules=Object.fromEntries(result.modules.map(module=>[module.id,module]));
      const bim=brand.modules.find(module=>module.id==='bim');
      if(bim&&!modules.bim?.available){
        try {const response=await fetch(`http://127.0.0.1:${bim.port}/__bim/status`,{signal:AbortSignal.timeout(1500)});const health=await response.json();if(response.ok&&health.id==='bim')modules.bim=health;}catch{modules.bim={...bim,available:false,message:'Start the Vision BIM Validator preview to open this tool.'};}
      }
      const pile=brand.modules.find(module=>module.id==='pile');
      if(pile&&!modules.pile?.available){
        try {const response=await fetch(`http://127.0.0.1:${pile.port}/__pile/status`,{signal:AbortSignal.timeout(1500)});const health=await response.json();if(health.id==='pile')modules.pile=health;}catch{modules.pile={...pile,available:false,message:'Start the Pile Plane Workspace preview to open this tool.'};}
      }
      const pointcloud=brand.modules.find(module=>module.id==='pointcloud');
      if(pointcloud&&!modules.pointcloud?.available){
        try {const response=await fetch('http://127.0.0.1:'+pointcloud.port+'/__pointcloud/status',{signal:AbortSignal.timeout(1500)});const health=await response.json();if(health.id==='pointcloud')modules.pointcloud=health;}catch{modules.pointcloud={...pointcloud,available:false,message:'Start the Pointcloud Workspace preview to open this tool.'};}
      }
      const field=brand.modules.find(module=>module.id==='field');
      if(field&&!modules.field?.available){
        try {const response=await fetch(`http://127.0.0.1:${field.port}/__field/status`,{signal:AbortSignal.timeout(1500)});const health=await response.json();if(health.id==='field')modules.field=health;}catch {modules.field={...field,available:false,message:'Start the Field Workspace preview to open this tool.'};}
      }
      const speech=brand.modules.find(module=>module.id==='speech');
      if(speech&&!modules.speech?.available){
        try { const response=await fetch(`http://127.0.0.1:${speech.port}/__speech/status`,{signal:AbortSignal.timeout(1500)});const health=await response.json();if(health.id==='speech')modules.speech=health; } catch { modules.speech={...speech,available:false,message:'Start the independent Speech preview to open this tool.'}; }
      }
      const stl=brand.modules.find(module=>module.id==='stl');
      if(stl){try{const response=await fetch('http://127.0.0.1:'+stl.port+'/__stl/status',{signal:AbortSignal.timeout(1500)});const health=await response.json();modules.stl={...stl,...health};}catch{modules.stl={...stl,available:false,message:'Start STL preview to open this tool.'};}}
      setStatus(modules);
    } catch(e) {
      if(e.name==='AbortError')return;
      setStatus(Object.fromEntries(brand.modules.map(module=>[module.id,{available:false,message:'Start the suite preview to open this module.'}])));
    }
  }
  function changeScreen() {
    setScreen(currentScreen());setError('');setSuccess('');
    window.scrollTo({top:0,behavior:'instant'});
    if(modal?.open)closeScan();
  }
  onMount(()=>{
    const syncMode=()=>setMode(document.documentElement.dataset.svMode || 'dark');
    window.addEventListener('spanvision:mode-change',syncMode);
    window.addEventListener('spanvision:mode-observed',syncMode);
    onCleanup(()=>{window.removeEventListener('spanvision:mode-change',syncMode);window.removeEventListener('spanvision:mode-observed',syncMode);});
    window.addEventListener('hashchange',changeScreen);
    refreshStatus();
    const onFocus=()=>refreshStatus();window.addEventListener('focus',onFocus);
    onCleanup(()=>{window.removeEventListener('hashchange',changeScreen);window.removeEventListener('focus',onFocus);requestController?.abort();clearScan();});
  });
  function submitAccount(event) {
    event.preventDefault();const form=event.currentTarget;const data=new FormData(form);
    setError('');
    if(screen()==='signup'&&!String(data.get('name')||'').trim()){setError('Enter your name.');return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.get('email')||''))){setError('Enter a valid email address.');return;}
    if(String(data.get('password')||'').length<8){setError('Use at least 8 characters for the preview password.');return;}
    setName(String(data.get('name')||name()).trim());form.reset();location.hash='account';
  }
  function ToolLink(props) {
    const state=()=>status()[props.module.id];
    return <Show when={state()?.available} fallback={<button class={`button button-outline ${props.class||''}`} disabled title={state()?.message||'Checking preview availability'}>Unavailable <Arrow/></button>}>
      <a class={`button ${props.class||'button-light'}`} href={openUrl(props.module)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${props.module.label} in a new tab`}>Open {props.label||({planner:'Planning',fem:'FEM',frame:'Frame design',calculation:'Calculations'})[props.module.id]||props.module.label}<Arrow/></a>
    </Show>;
  }
  function Modules() {
    return <div class="module-grid"><For each={brand.modules}>{(module,index)=><article class="module-card" data-module={module.id}>
      <div class="module-top"><div class="module-identity"><span class="tool-glyph"><ToolIcon module={module}/></span><span class="feature-number">/{String(index()+1).padStart(2,'0')}</span></div><span class={`availability ${status()[module.id]?.available?'available':''}`}><i/>{status()[module.id]?.available?'Ready to open':status()[module.id]?'Unavailable':'Checking…'}</span></div>
      <h3>{module.id==='pile'&&<img class="field-card-mark" src="/ppw-mark.svg" alt="PPW"/>}{module.id==='pointcloud'&&<img class="field-card-mark" src="/pw-mark.svg" alt="PW"/>}{module.id==='field'&&<img class="field-card-mark" src="/fw-mark.svg" alt="FW"/>}{module.label}</h3><p>{module.description}</p>
      <div class="module-bottom"><ToolLink module={module}/><small>{status()[module.id]?.available?'Opens in a new tab':status()[module.id]?.message||'Checking the local preview…'}</small></div>
    </article>}</For></div>;
  }
  return <>
    <a class="skip-link" href="#main-content">Skip to content</a>
    <header class="preview-header" data-sv-reveal><Mark/><nav aria-label="Main navigation"><For each={['landing','modules','account']}>{route=><a href={`#${route}`} classList={{current:screen()===route}} aria-current={screen()===route?'page':undefined}>{({landing:'Overview',modules:'Tools',account:'Account'})[route]}</a>}</For></nav><a href="#modules" class="button button-light header-action" onClick={event=>{if(screen()==='landing'||screen()==='modules'){event.preventDefault();exploreTools();}}}>Open workspace<Arrow/></a></header>
    <main id="main-content" tabindex="-1">
      <Show when={screen()==='landing'||screen()==='modules'}>
        <section class="company-tools-page">
          <div class="company-intro">
            <div class="company-intro-copy">
            <span class="eyebrow" data-sv-reveal><i class="intro-line"/>ENGINEERING & INFRASTRUCTURE</span>
            <h1 data-sv-reveal>{organization}</h1>
            <div class="company-intro-bottom"><p data-sv-reveal>From first sketch to final calculation.<br/>Draw, validate, plan and build in one connected workspace.</p><div class="intro-actions" data-sv-reveal><button class="button button-light" onClick={exploreTools}>Explore all tools<Arrow/></button><button class="button button-outline" onClick={openScan}>Explore scan & OCR</button></div></div>
            <div class="intro-summary" data-sv-reveal><span><b>{brand.modules.length}</b> engineering tools</span><i/><span>One workspace. Your workflow.</span></div>
            </div>
            <Globe mode={mode()}/>
          </div>
          <section class="company-catalog" aria-labelledby="tools-title">
            <div class="catalog-heading" data-sv-reveal><div><h2 id="tools-title">All tools <span>{brand.modules.length}</span></h2><p>Choose a tool to open its workspace in a new tab.</p></div><button class="button button-outline" onClick={refreshStatus}>Check availability<Arrow/></button></div>
            <Modules/>
            <p class="catalog-note">Files and saved preferences stay with each workspace.</p>
          </section>
        </section>
      </Show>
      <Show when={screen()==='login'||screen()==='signup'}><section class="auth-layout"><div class="auth-story"><span class="eyebrow">YOUR WORK, IN FOCUS</span><h1>Make room<br/>for better work.</h1><p>Drawings. Documents. Details.</p><div class="auth-art"><Floorplan/></div><span class="auth-note">{organization}</span></div><div class="auth-form-wrap"><span class="preview-badge">ACCOUNT SCREEN PREVIEW</span><h2>{screen()==='signup'?'Create your workspace.':'Welcome back.'}</h2><p>{screen()==='signup'?'A clear start for your next project.':'Pick up where your work left off.'}</p><form novalidate onSubmit={submitAccount}><Show when={screen()==='signup'}><label>Full name<input name="name" autocomplete="off" placeholder="Alex Morgan" required/></label></Show><label>Email address<input name="email" type="email" autocomplete="off" placeholder="you@company.com" required/></label><label>Password<input name="password" type="password" autocomplete="off" placeholder="At least 8 characters" required/></label><Show when={error()}><p class="form-error" role="alert">{error()}</p></Show><button class="button button-light" type="submit">{screen()==='signup'?'Preview account':'Preview sign in'}<Arrow/></button></form><p class="auth-switch">{screen()==='signup'?'Already have an account?':'New to '+organization+'?'} <a href={screen()==='signup'?'#login':'#signup'}>{screen()==='signup'?'Sign in':'Create an account'}</a></p><div class="preview-disclosure">This is a local interface preview. No account is created and no credentials are transmitted or saved.</div><a href="#modules" class="quiet-link">Continue without an account<Arrow/></a></div></section></Show>
      <Show when={screen()==='account'}><section class="account-page"><span class="preview-badge">SAMPLE ACCOUNT · PREVIEW</span><div class="account-heading"><div><span class="eyebrow">YOUR WORKSPACE</span><h1>A clear view of you.</h1><p>Explore the details that make this workspace yours.</p></div><a href="#modules" class="button button-light">Open workspace<Arrow/></a></div><div class="account-grid"><aside class="account-nav"><button class="selected" aria-current="page">Profile</button><a href="#login">Sign-in preview<Arrow/></a></aside><div class="account-card"><div class="profile-header"><span class="avatar">{name().split(' ').map(s=>s[0]).join('').slice(0,2)}</span><div><h2>{name()}</h2><p>Sample profile · {organization}</p></div></div><form onSubmit={event=>{event.preventDefault();const value=String(new FormData(event.currentTarget).get('name')||'').trim();setError('');setSuccess('');if(!value){setError('Enter your name.');return;}setName(value);setSuccess('Profile updated in this preview.');}}><label>Display name<input name="name" value={name()}/></label><label>Organization<input value={organization} readonly/></label><label>Interface theme<select aria-label="Interface theme" value={mode()} onChange={event=>window.SpanvisionAppearance.setMode(event.currentTarget.value)}><option value="light">Light</option><option value="dark">Dark</option></select></label><Show when={error()}><p role="alert" class="form-error">{error()}</p></Show><Show when={success()}><p role="status" class="form-success">{success()}</p></Show><button class="button button-light">Save preview changes<Arrow/></button></form></div><div class="account-details"><article><span class="eyebrow">LOCAL BY DESIGN</span><h3>Your files. Your control.</h3><p>Each editor works without a shared account. Profile changes here last only for this preview session.</p></article><article><span class="eyebrow">APPEARANCE</span><div class="palette"><i/><i/><i/><i/></div><p>{mode()==='light'?'Light':'Dark'} mode<br/>A clear space for detailed work.</p></article></div></div></section></Show>
      <Show when={!validScreens.includes(screen())}><section class="suggestions-page"><h1>Page not found.</h1><a href="#landing" class="button button-light">Back to overview<Arrow/></a></section></Show>
    </main>
    <footer class="preview-footer"><Mark/><span>© 2026 {organization}</span><div><a href="#login">Sign in preview</a><a href="#signup">Sign up preview</a><a href="/notices.md" target="_blank" rel="noopener noreferrer">Open-source notices</a><a href="/bim-notices.md" target="_blank" rel="noopener noreferrer">BIM source notices</a><a href="/studio-notices.md" target="_blank" rel="noopener noreferrer">Studio source notices</a><a href="/globe-notices.txt" target="_blank" rel="noopener noreferrer">Globe credits</a></div></footer>
    <dialog ref={modal} class="scan-dialog" aria-labelledby="scan-title" onKeyDown={trapScanFocus} onCancel={event=>{event.preventDefault();closeScan();}}>
      <div class="scan-heading"><h2 id="scan-title">Scan & make searchable</h2><button class="scan-close" aria-label="Close scan preview" onClick={closeScan}>×</button></div><p class="scan-intro">Turn a scanned PDF into a document you can search.</p>
      <input hidden ref={upload} type="file" accept="application/pdf,image/*" onChange={event=>{if(event.target.files?.[0])setFilename(event.target.files[0].name);}}/>
      <button class="scan-upload" disabled={scanState()==='processing'} onClick={()=>upload.click()}><span class="file-glyph">PDF</span><span><b>{filename()}</b><small>Choose a scanned PDF or image</small></span><span>＋</span></button>
      <div class="scan-options"><label>Pages<select disabled={scanState()==='processing'}><option>All pages</option><option>Current page</option></select></label><label>Document language<select disabled={scanState()==='processing'}><option>English</option></select></label></div>
      <Show when={scanState()==='processing'}><div class="scan-progress" role="status"><span>Recognizing text… <b>{progress()}%</b></span><progress value={progress()} max="100"/></div></Show><Show when={scanState()==='complete'}><p role="status" class="form-success">Preview complete. A searchable text layer would be added to your PDF.</p></Show>
      <div class="preview-disclosure">This browser screen simulates OCR. Real recognition runs locally in the PDF desktop app; your document is not uploaded.</div><div class="scan-actions"><span class="preview-badge">SCAN DEMONSTRATION</span><div><button class="button button-outline" onClick={closeScan}>Cancel</button><button class="button button-light" disabled={scanState()==='processing'} onClick={()=>scanState()==='complete'?closeScan():startScan()}>{scanState()==='complete'?'Done':'Preview OCR'}<Arrow/></button></div></div>
    </dialog>
  </>;
}
render(()=><App/>,document.getElementById('root'));
