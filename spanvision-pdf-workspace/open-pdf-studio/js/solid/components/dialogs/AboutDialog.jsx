import { createSignal, onMount, Show } from 'solid-js';
import Dialog from '../Dialog.jsx';
import { closeDialog } from '../../stores/dialogStore.js';
import { getAppVersion, openExternal } from '../../../core/platform.js';
import { BRAND } from '../../../core/brand.js';
import { useTranslation } from '../../../i18n/useTranslation.js';

export default function AboutDialog() {
  const { t } = useTranslation('appMenu');
  const [version,setVersion]=createSignal(''),[notices,setNotices]=createSignal(''),[expanded,setExpanded]=createSignal(false);
  onMount(async()=>{setVersion(await getAppVersion() || '');});
  async function showNotices(){setExpanded(!expanded());if(!notices()){try{const res=await fetch('notices.md');setNotices(await res.text());}catch{setNotices('See LICENSE.md and docs/legal/ATTRIBUTION.md in the supplied source.');}}}
  return <Dialog title={t('aboutPanel.title')} dialogClass="about-dialog" onClose={()=>closeDialog('about')}>
    <div class="bs-about-panel"><div class="bs-about-app"><div class="bs-about-logo"><img src="icon.png" alt="GW"/></div><div class="bs-about-app-info"><h1 class="bs-about-app-name">{BRAND.product}</h1><p class="bs-about-version">Version {version()}</p><p class="bs-about-tagline">Documents. Drawings. Done.</p></div></div>
    <p class="bs-about-description">A focused workspace for PDF editing, annotation, drawings and measurement.</p>
    <div class="bs-about-features"><span class="bs-about-feature">Local files</span><span class="bs-about-feature">Open source</span><span class="bs-about-feature">No account required</span></div>
    <div class="bs-about-company"><h3 class="bs-about-company-name">{BRAND.organization}</h3><p class="bs-about-company-desc">Tools for documents, drawings and infrastructure.</p></div>
    <div class="bs-about-links"><Show when={BRAND.websiteUrl}><button class="pref-btn pref-btn-secondary" onClick={()=>openExternal(BRAND.websiteUrl)}>Website</button></Show><Show when={BRAND.supportUrl}><button class="pref-btn pref-btn-secondary" onClick={()=>openExternal(BRAND.supportUrl)}>Support</button></Show><button class="pref-btn pref-btn-secondary" aria-expanded={expanded()} onClick={showNotices}>Open-source notices</button></div>
    <Show when={expanded()}><pre class="edition-notices">{notices()}</pre></Show><div class="bs-about-footer"><p class="bs-about-copyright">© 2026 Spanvision Infra modifications.</p><p class="bs-about-license">LGPL-3.0-or-later · Upstream attribution preserved in open-source notices.</p></div></div>
  </Dialog>;
}
