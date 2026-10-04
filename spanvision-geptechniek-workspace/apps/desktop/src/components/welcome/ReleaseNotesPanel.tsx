import { BRAND } from '../../branding';
import './ReleaseNotesPanel.css';
export function ReleaseNotesPanel() {
  return <aside className="welcome-side-panel">
    <div className="welcome-brand"><h3>{BRAND.organization}</h3><span className="welcome-link">{BRAND.suiteName}</span></div>
    <div className="welcome-releases"><h3>Workspace updates</h3><article className="welcome-release">
      <header><span className="welcome-release-tag">v{BRAND.version}</span></header>
      <h4>Spanvision Mono</h4><p>A focused grayscale interface for ground conditions, site drawings and reports. Your saved settings and engineering colors stay familiar.</p>
    </article></div>
  </aside>;
}
