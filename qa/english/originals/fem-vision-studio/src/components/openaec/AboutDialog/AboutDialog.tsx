import { Modal } from '@openaec/ui-primitives';
import { BrandMark } from '../../BrandMark';
import { BRAND } from '../../../brand';
import './AboutDialog.css';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: string) => string;
}

const APP_VERSION = '1.0.0';

export function AboutDialog({ isOpen, onClose, t }: AboutDialogProps) {
  return (
    <Modal open={isOpen} onClose={onClose} title={t('about.title')} width={400}>
      <div className="about-content">
        <BrandMark size={64} />
        <div className="about-name">{BRAND.product}</div>
        <div className="about-organization">{BRAND.organization}</div>
        <div className="about-version">v{APP_VERSION}</div>
        <div className="about-tagline">{BRAND.tagline}</div>
        <div className="about-meta">
          2D finite element modeling and structural analysis.
        </div>
        <div className="about-license">Spanvision Infra · Open-source edition<br />
          <a href="/THIRD_PARTY_NOTICES.md" target="_blank" rel="noopener noreferrer">Open-source notices</a>
        </div>
      </div>
    </Modal>
  );
}
