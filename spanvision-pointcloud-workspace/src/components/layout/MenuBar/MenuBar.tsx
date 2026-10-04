import { useState, useEffect, memo } from 'react';
import brand from '../../../brand.json';
import { Settings } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

// Detect platform
type Platform = 'windows' | 'linux' | 'macos';

function getPlatform(): Platform {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('mac')) return 'macos';
  return 'linux';
}

// Windows-style window controls
function WindowsControls({
  onMinimize,
  onMaximize,
  onClose,
  isMaximized
}: {
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  isMaximized: boolean;
}) {
  return (
    <div className="flex items-center h-full">
      <button
        onClick={onMinimize}
        className="w-[46px] h-full flex items-center justify-center hover:bg-cad-surface-elevated transition-colors cursor-default"
        title="Minimize"
      >
        <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
          <rect width="10" height="1" />
        </svg>
      </button>
      <button
        onClick={onMaximize}
        className="w-[46px] h-full flex items-center justify-center hover:bg-cad-surface-elevated transition-colors cursor-default"
        title={isMaximized ? 'Restore Down' : 'Maximize'}
      >
        {isMaximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="2" y="0.5" width="7" height="7" />
            <polyline points="0.5,2.5 0.5,9.5 7.5,9.5 7.5,7.5" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="9" height="9" />
          </svg>
        )}
      </button>
      <button
        onClick={onClose}
        className="w-[46px] h-full flex items-center justify-center hover:bg-cad-hover transition-colors group cursor-default"
        title="Close"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2" className="group-hover:stroke-white">
          <line x1="0" y1="0" x2="10" y2="10" />
          <line x1="10" y1="0" x2="0" y2="10" />
        </svg>
      </button>
    </div>
  );
}

// Linux/GNOME-style window controls
function LinuxControls({
  onMinimize,
  onMaximize,
  onClose,
  isMaximized
}: {
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  isMaximized: boolean;
}) {
  return (
    <div className="flex items-center h-full gap-2 px-3">
      <button
        onClick={onMinimize}
        className="w-3 h-3 rounded-full bg-cad-surface-elevated hover:bg-cad-surface-elevated transition-colors flex items-center justify-center group cursor-default"
        title="Minimize"
      >
        <svg width="6" height="1" viewBox="0 0 6 1" className="opacity-0 group-hover:opacity-100 transition-opacity">
          <rect width="6" height="1" fill="#000" fillOpacity="0.6" />
        </svg>
      </button>
      <button
        onClick={onMaximize}
        className="w-3 h-3 rounded-full bg-cad-surface-elevated hover:bg-cad-surface-elevated transition-colors flex items-center justify-center group cursor-default"
        title={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? (
          <svg width="6" height="6" viewBox="0 0 6 6" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <rect x="0.5" y="2" width="3" height="3" fill="none" stroke="#000" strokeOpacity="0.6" strokeWidth="1" />
            <polyline points="2,2 2,0.5 5.5,0.5 5.5,4 4,4" fill="none" stroke="#000" strokeOpacity="0.6" strokeWidth="1" />
          </svg>
        ) : (
          <svg width="6" height="6" viewBox="0 0 6 6" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <rect x="0.5" y="0.5" width="5" height="5" fill="none" stroke="#000" strokeOpacity="0.6" strokeWidth="1" />
          </svg>
        )}
      </button>
      <button
        onClick={onClose}
        className="w-3 h-3 rounded-full bg-cad-surface-elevated hover:bg-cad-surface-elevated transition-colors flex items-center justify-center group cursor-default"
        title="Close"
      >
        <svg width="6" height="6" viewBox="0 0 6 6" className="opacity-0 group-hover:opacity-100 transition-opacity">
          <line x1="1" y1="1" x2="5" y2="5" stroke="#000" strokeOpacity="0.6" strokeWidth="1" />
          <line x1="5" y1="1" x2="1" y2="5" stroke="#000" strokeOpacity="0.6" strokeWidth="1" />
        </svg>
      </button>
    </div>
  );
}

function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [platform] = useState<Platform>(getPlatform);

  const isTauri = !!(window as any).__TAURI_INTERNALS__;
  const appWindow = isTauri ? getCurrentWindow() : null;

  useEffect(() => {
    if (!appWindow) return;
    appWindow.isMaximized().then(setIsMaximized);

    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [appWindow]);

  if (!appWindow) return null;

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  const controlProps = {
    onMinimize: handleMinimize,
    onMaximize: handleMaximize,
    onClose: handleClose,
    isMaximized,
  };

  if (platform === 'linux') {
    return <LinuxControls {...controlProps} />;
  }

  return <WindowsControls {...controlProps} />;
}

export const MenuBar = memo(function MenuBar({ onSettingsClick }: { onSettingsClick: () => void }) {
  return (
    <div className="titlebar h-8 bg-cad-surface border-b border-cad-border flex items-center select-none">
      {/* Logo + Quick Access */}
      <div className="flex items-center gap-2 pr-3">
        <img className="brand-mark" src="/pw-mark.svg" alt="PW" />
        <div className="w-px h-4 bg-cad-border" />
        <button
          className="flex items-center justify-center w-6 h-6 hover:bg-cad-hover text-cad-text-dim hover:text-cad-text transition-colors cursor-default"
          title="Settings" aria-label="Settings"
          onClick={onSettingsClick}
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Draggable area with app title */}
      <div
        data-tauri-drag-region
        className="title-lockup flex-1 h-full flex items-center justify-center cursor-default"
        onDoubleClick={() => {
          const isTauri = !!(window as any).__TAURI_INTERNALS__;
          if (isTauri) getCurrentWindow().toggleMaximize();
        }}
      >
        <span><strong>{brand.product}</strong><small>{brand.organization}</small></span>
        <span className="title-version pointer-events-none">
          v0.3.0
        </span>
      </div>

      {/* Window controls */}
      <WindowControls />
    </div>
  );
});
