import { useTranslation } from 'react-i18next';
import { BRAND } from '../../config/brand';
import './ReleaseNotesPanel.css';
/** Bundled edition notes; opening the app never contacts a release feed. */
export function ReleaseNotesPanel() {
 const { t } = useTranslation();
 return <aside className="welcome-side-panel">
  <div className="welcome-brand"><h3>{BRAND.organization}</h3><p className="edition-note">{BRAND.product}</p></div>
  <div className="welcome-releases"><h3>{t('releaseNotes.title')}</h3>
   <article className="welcome-release"><header><span className="welcome-release-tag">v{__APP_VERSION__}</span></header>
    <h4 className="welcome-release-title">Spanvision Mono</h4>
    <p className="welcome-release-body">A focused workspace for construction estimates. Local files, familiar tools, and a monochrome interface.</p>
   </article>
  </div>
 </aside>;
}
