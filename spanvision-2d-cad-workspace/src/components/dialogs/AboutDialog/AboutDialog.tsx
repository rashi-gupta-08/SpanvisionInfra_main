import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { DraggableModal, ModalButton } from '../../shared/DraggableModal';
import { BRAND } from '../../../config/brand';
import { isDesktopShell } from '../../../utils/platform';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const [appVersion, setAppVersion] = useState<string>(BRAND.version);
  useEffect(() => {
    if (isDesktopShell()) void getVersion().then(setAppVersion).catch(() => {});
  }, []);

  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={onClose}
      title={`About ${BRAND.product}`}
      width={380}
      height={340}
      footer={<ModalButton onClick={onClose} variant="primary">OK</ModalButton>}
    >
      <div className="flex-1 p-4 flex flex-col items-center text-center justify-center">
        <img src="/logo.svg" alt={BRAND.mark} className="w-12 h-12 mb-3" />
        <p className="text-xs text-cad-text-dim mb-1">{BRAND.organization}</p>
        <h1 className="text-lg font-bold text-cad-text mb-1">{BRAND.product}</h1>
        <p className="text-xs text-cad-text-dim mb-3">Version {appVersion}</p>

        <p className="text-xs text-cad-text-dim mb-3">
          A workspace for precise 2D drawings
        </p>

        <a
          href="/legal.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cad-accent hover:underline mb-3"
        >
          Legal and licenses
        </a>

        <a href="/LICENSE.md" target="_blank" rel="noopener noreferrer" className="text-xs text-cad-text-dim hover:underline">Full source license</a>
      </div>
    </DraggableModal>
  );
}
