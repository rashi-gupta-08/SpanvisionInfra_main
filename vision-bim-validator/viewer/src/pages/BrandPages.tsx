import { useEffect, useState } from 'react';
import { BRAND } from '../config/brand';
import { BrandMark } from '../components/BrandMark';
import { useAuthStore } from '../stores/authStore';
import { useStore } from '../store';
import { isOidcConfigured } from '../lib/oidcManager';
import { getCanvasColor } from '../utils/settingsStore';
import './BrandPages.css';

function Header() {
  return <header className="brand-header">
    <a href="/home" className="brand-lockup" aria-label="Spanvision Infra home"><BrandMark /><span>SPANVISION <small>INFRA</small></span></a>
    <nav aria-label="Main navigation"><a href="/help">How it works</a><a href="/account">Account</a><a className="sv-button sv-button--small" href="/viewer">Open workspace <span aria-hidden="true">↗</span></a></nav>
  </header>;
}

function Footer() {
  return <footer className="brand-footer"><span>© {new Date().getFullYear()} {BRAND.organization}</span><span>{BRAND.product}</span><a href="/help">Help & documentation ↗</a></footer>;
}

function BuildingDiagram() {
  return <svg viewBox="0 0 560 430" className="building-diagram" fill="none" role="img" aria-label="Architectural wireframe illustration">
    <defs><pattern id="plan-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" stroke="#333333" strokeWidth=".6" /></pattern></defs>
    <rect width="560" height="430" fill="url(#plan-grid)" />
    <g stroke="#999999" strokeWidth="1.2">
      <path d="M76 296L281 400L494 286L290 183Z" strokeDasharray="4 5" />
      {[0,1,2,3,4].map(n => <g key={n} transform={`translate(0 ${-n*42})`}><path d="M132 266L285 343L444 258L289 181Z"/><path d="M132 266V285L285 362L444 277V258M285 343V362"/></g>)}
      {[0,1,2,3,4,5].map(n => <g key={n}><path d={`M${132+n*30.6} ${98+n*15.4}V${266+n*15.4}`}/><path d={`M${285+n*31.8} ${175-n*17}V${343-n*17}`}/></g>)}
      <path d="M132 98L285 175L444 90L289 13Z" stroke="var(--theme-text)"/><path d="M132 98V266M285 175V343M444 90V258" stroke="var(--theme-text)"/>
      <path d="M99 111V288M89 111h20M89 288h20M118 330L273 410M113 337l10-14M269 417l10-14" strokeDasharray="3 3" />
    </g>
    <g fill="var(--theme-text)" fontFamily="inherit" fontSize="10"><text x="65" y="197" transform="rotate(-90 65 197)">MODEL GEOMETRY</text><text x="181" y="388" transform="rotate(27 181 388)">IFC / IDS</text></g>
    <rect x="353" y="332" width="172" height="62" rx="4" fill="var(--theme-surface)" stroke="var(--theme-border)"/><circle cx="373" cy="353" r="3" fill="var(--theme-text)"/><text x="385" y="357" fill="var(--theme-text)" fontSize="11">BUILT FOR MODEL CLARITY</text><text x="369" y="379" fill="var(--theme-text-secondary)" fontSize="10">Inspect. Validate. Coordinate.</text>
  </svg>;
}

export function LandingPage() {
  return <div className="brand-page"><Header /><main className="landing-main">
    <section className="landing-hero"><div className="hero-copy"><p className="eyebrow"><span /> A SPANVISION INFRA TOOL</p><h1>Confidence in<br />every model<span className="hero-period">.</span></h1><p className="hero-description">Vision BIM Validator brings your IFC models, information requirements, and validation results into one clear workspace.</p><div className="hero-actions"><a className="sv-button" href="/viewer">Open BIM workspace <span aria-hidden="true">↗</span></a><a className="sv-button sv-button--secondary" href="/validate">Run a validation <span aria-hidden="true">→</span></a></div><p className="hero-note">IFC & IFCx viewing <span> / </span> IDS validation <span> / </span> BCF coordination</p></div><div className="hero-visual"><div className="visual-caption"><span>VISION / BIM VALIDATOR</span><span>01 — MODEL INTELLIGENCE</span></div><BuildingDiagram /><p className="visual-footnote">Architectural illustration · Your model, its original colors.</p></div></section>
    <section className="capability-strip" aria-label="Workflow"><article><span className="step-number">01</span><div><h2>See the whole model</h2><p>Navigate geometry, inspect properties, and explore your model hierarchy.</p></div></article><article><span className="step-number">02</span><div><h2>Check what matters</h2><p>Validate against bundled standards or your own IDS requirements.</p></div></article><article><span className="step-number">03</span><div><h2>Close the loop</h2><p>Turn failed checks into BCF issues for your project team.</p></div></article></section>
    <section className="landing-callout"><div><p className="eyebrow">FROM INFORMATION TO ASSURANCE</p><h2>A familiar workflow.<br />A clearer perspective.</h2></div><p>One canvas. Connected checks. Less friction between finding an issue and understanding it.<a href="/help">Explore the workflow <span aria-hidden="true">↗</span></a></p></section>
  </main><Footer /></div>;
}

export function AccountPage({ mode }: { mode: 'login' | 'signup' | 'account' }) {
  const user = useAuthStore(s => s.user);
  const bcfUser = useStore(s => s.bcfAuth.user);
  const bcfError = useStore(s => s.bcfError);
  const bcfPhase = useStore(s => s.bcfPhase);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [appearance, setAppearance] = useState(document.documentElement.dataset.svMode || 'dark');
  useEffect(() => {
    const update = () => setAppearance(document.documentElement.dataset.svMode || 'dark');
    window.addEventListener('spanvision:mode-change', update);
    window.addEventListener('spanvision:mode-observed', update);
    return () => { window.removeEventListener('spanvision:mode-change', update); window.removeEventListener('spanvision:mode-observed', update); };
  }, []);
  useEffect(() => { void useAuthStore.getState().checkAuth(); void useStore.getState().bcfInitAuth(); }, []);
  const configured = Boolean(BRAND.loginUrl || isOidcConfigured());
  const signedIn = Boolean(user || bcfUser);
  const name = user?.display_name || user?.username || bcfUser?.name || 'Guest workspace';
  const title = mode === 'signup' ? 'Your next project starts here.' : mode === 'login' ? 'Welcome back.' : 'Your workspace. Your settings.';
  async function signIn() {
    if (BRAND.loginUrl) { window.location.assign(BRAND.loginUrl); return; }
    setPending(true);
    try { await useStore.getState().bcfLoginOidc(); } catch { setError('Unable to connect to your identity provider. Please try again.'); }
    finally { setPending(false); }
  }
  return <div className="brand-page"><Header /><main className="account-layout"><section className="account-intro"><p className="eyebrow">VISION BIM VALIDATOR / {mode.toUpperCase()}</p><h1>{title}</h1><p>Bring clarity to your BIM workflow with {BRAND.organization}.</p><div className="account-benefits"><span>01 &nbsp; Inspect your models</span><span>02 &nbsp; Validate information</span><span>03 &nbsp; Coordinate with confidence</span></div></section><section className="account-card" aria-label={mode === 'signup' ? 'Create account' : mode === 'login' ? 'Sign in' : 'Account settings'}><BrandMark /><h2>{mode === 'signup' ? 'Join your organization' : mode === 'login' ? 'Sign in to Spanvision' : name}</h2><p className="supporting">{mode === 'account' ? 'Your session and appearance preferences.' : 'Use your organization’s secure identity provider to access connected project services.'}</p>
    {mode === 'signup' ? <><div className="account-notice">{BRAND.signupUrl ? 'Continue to your organization’s registration page to create your account.' : 'Account registration is managed by your organization. Ask your workspace administrator for an invitation.'}</div>{BRAND.signupUrl && <a className="sv-button" href={BRAND.signupUrl}>Continue to registration ↗</a>}<a className="sv-button sv-button--secondary" href="/login">Already have an account? Sign in →</a></> : mode === 'login' ? <>{!configured && <div className="account-notice" role="status">Organization sign-in is not connected in this preview. You can open the local workspace without an account.</div>}<button className="sv-button" onClick={() => void signIn()} disabled={!configured || pending}>{pending ? 'Connecting…' : 'Continue with organization SSO ↗'}</button><a className="account-link" href="/signup">Need access? Join your organization →</a></> : <><dl className="account-details"><div><dt>Organization</dt><dd>{BRAND.organization}</dd></div><div><dt>Session</dt><dd>{signedIn ? 'Signed in' : 'Local / guest'}</dd></div><div><dt>Appearance</dt><dd>{appearance === 'light' ? 'Light' : 'Dark'}</dd></div><div><dt>Canvas</dt><dd>{getCanvasColor().toUpperCase()}</dd></div><div><dt>Project services</dt><dd>{bcfPhase === 'connected' ? 'Connected' : 'Not connected'}</dd></div></dl>{signedIn ? <>{BRAND.accountUrl && <a className="sv-button" href={BRAND.accountUrl}>Manage your identity ↗</a>}<button className="sv-button sv-button--secondary" onClick={() => { if (bcfUser) void useStore.getState().bcfLogout(); if (user) useAuthStore.getState().logout(); }}>Sign out →</button></> : <a className="sv-button" href="/login">Sign in to connect services ↗</a>}</>}
    {(error || bcfError) && <p className="account-error" role="alert">{error || bcfError}</p>}<div className="account-card-footer"><a href="/viewer">Continue to local workspace →</a></div></section></main><Footer /></div>;
}

export function HelpPage() {
  return <div className="brand-page"><Header /><main className="help-main"><p className="eyebrow">VISION BIM VALIDATOR / WORKFLOW GUIDE</p><h1>From model to<br />meaningful checks.</h1><div className="help-grid"><article><span className="step-number">01</span><h2>Open your model</h2><p>Choose Open IFC in the Home ribbon. IFC and IFCx models appear in the model browser. Use View to fit the model, reset the camera, or add section planes.</p></article><article><span className="step-number">02</span><h2>Choose your requirements</h2><p>In the validation panel, select NL BIM Basis ILS, RVB BIM Norm, or upload a custom IDS file. Start validation to check the selected model against those requirements.</p></article><article><span className="step-number">03</span><h2>Review and coordinate</h2><p>Expand a failed check to inspect affected elements and their properties. Create BCF issues and export them for coordination, or connect your organization’s BCF platform.</p></article></div><div className="help-shortcuts"><h2>Keep your flow</h2><p><kbd>Ctrl + O</kbd> Open model <kbd>Ctrl + S</kbd> Save project <kbd>Ctrl + ,</kbd> Preferences <kbd>Esc</kbd> Close dialog</p><p>On mobile and tablet, switch between Models, Canvas, and Checks below the ribbon. Theme and canvas preferences are available in Settings → Appearance.</p></div><a href="/viewer" className="sv-button">Open BIM workspace ↗</a></main><Footer /></div>;
}
