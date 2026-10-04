import { useEffect, useRef, useState, useCallback } from 'react';
import { PanelRightOpen, PanelRightClose } from 'lucide-react';
import { MenuBar } from './components/layout/MenuBar/MenuBar';
import { Ribbon } from './components/layout/Ribbon/Ribbon';
import { StatusBar } from './components/layout/StatusBar/StatusBar';
import { PointcloudViewer, addBAG3DMeshToScene } from './components/canvas/PointcloudViewer';
import { PointcloudPanel } from './components/panels/PointcloudPanel';
import { BAG3DPanel } from './components/panels/BAG3DPanel';
import { SettingsDialog } from './components/SettingsDialog/SettingsDialog';
import { useModal } from './components/useModal';
import { useAppStore } from './state/appStore';
import { FeedbackDialog } from './components/FeedbackDialog';
import type { BufferGeometry } from 'three';

function PropertiesDrawer({onClose}: {onClose: () => void}) {
  const ref = useRef<HTMLDialogElement>(null);
  useModal(ref, onClose);
  return <dialog ref={ref} className="properties-drawer workspace-dialog" aria-labelledby="properties-title"><div className="properties-heading"><h2 id="properties-title">Pointcloud properties</h2><button aria-label="Close properties" onClick={onClose}>×</button></div><div className="properties-content"><PointcloudPanel /></div></dialog>;
}

function App() {
  const message = useAppStore(s => s.message);
  const showMessage = useAppStore(s => s.showMessage);
  const uiTheme = useAppStore(s => s.uiTheme);
  useEffect(() => { document.documentElement.setAttribute('data-theme', uiTheme); }, [uiTheme]);
  const rightPanelOpen = useAppStore(s => s.rightPanelOpen);
  const toggleRightPanel = useAppStore(s => s.toggleRightPanel);
  const showBAG3DPanel = useAppStore(s => s.showBAG3DPanel);
  const setShowBAG3DPanel = useAppStore(s => s.setShowBAG3DPanel);
  const [showSettings, setShowSettings] = useState(false);
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 767px)').matches);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(256);
  const isResizingRight = useRef(false);
  const handleBuildingsLoaded = useCallback((geometry: BufferGeometry) => addBAG3DMeshToScene(geometry), []);
  useEffect(() => {
    const query = matchMedia('(max-width: 767px)');
    const change = () => { setMobile(query.matches); setDrawerOpen(false); };
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    const move = (event: PointerEvent) => {
      if(isResizingRight.current) setRightPanelWidth(Math.max(180, Math.min(500, window.innerWidth - event.clientX)));
    };
    const stop = () => { isResizingRight.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop);window.addEventListener('pointercancel',stop);
    return () => {window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',stop);window.removeEventListener('pointercancel',stop);};
  }, []);
  return <div className="workspace-shell flex flex-col h-full w-full bg-cad-bg text-cad-text no-select">
    <MenuBar onSettingsClick={() => setShowSettings(true)} />
    <Ribbon />
    <div className="workspace-main flex flex-1 overflow-hidden">
      <main className="workspace-canvas flex-1 relative overflow-hidden" aria-label="Pointcloud drawing canvas">
        <PointcloudViewer />
        {mobile && <button className="mobile-properties" aria-label="Open pointcloud properties" onClick={() => setDrawerOpen(true)}><PanelRightOpen size={18} /> Properties</button>}
      </main>
      {!mobile && (rightPanelOpen ? <aside className="desktop-properties bg-cad-surface border-l border-cad-border flex flex-col overflow-hidden relative" aria-label="Pointcloud properties" style={{width:rightPanelWidth,minWidth:180,maxWidth:500}}>
        <div className="panel-resize absolute top-0 left-0 h-full cursor-col-resize z-10" onPointerDown={event => {event.preventDefault();isResizingRight.current=true;document.body.style.cursor='col-resize';document.body.style.userSelect='none';}} />
        <div className="flex items-center justify-between px-3 h-7 min-h-[28px] border-b border-cad-border"><span className="text-xs font-semibold">Pointcloud</span><button className="panel-toggle" aria-label="Collapse right panel" onClick={toggleRightPanel}><PanelRightClose size={14}/></button></div>
        <div className="flex-1 overflow-y-auto"><PointcloudPanel /></div>
      </aside> : <div className="bg-cad-surface border-l border-cad-border" style={{width:28}}><button className="panel-toggle" aria-label="Expand right panel" onClick={toggleRightPanel}><PanelRightOpen size={16}/></button></div>)}
    </div>
    <StatusBar />
    {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
    {showBAG3DPanel && <BAG3DPanel onClose={() => setShowBAG3DPanel(false)} onBuildingsLoaded={handleBuildingsLoaded} />}
    {mobile && drawerOpen && <PropertiesDrawer onClose={() => setDrawerOpen(false)} />}
    {message && <FeedbackDialog message={message} onClose={() => showMessage(null)} />}
  </div>;
}
export default App;
