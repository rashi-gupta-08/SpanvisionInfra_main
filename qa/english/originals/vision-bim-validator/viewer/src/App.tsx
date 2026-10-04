/**
 * App Component
 *
 * Entry point that renders either the new 3-panel BIM platform layout
 * (AppShell) or the legacy validation-only view, depending on URL path.
 *
 * - "/" or "/viewer" → AppShell (3-panel BIM platform)
 * - "/validate" → Legacy validation flow (original single-page app)
 */

import { useEffect, lazy, Suspense } from "react";

const AppShell = lazy(() => import('./components/layout/AppShell').then(module => ({ default: module.AppShell })));
const LegacyValidationView = lazy(() => import('./LegacyValidationView').then(module => ({ default: module.LegacyValidationView })));
import { LandingPage, AccountPage, HelpPage } from "./pages/BrandPages";
import { getSetting, applyTheme } from "./utils/settingsStore";

// Styles
import "./App.css";
import "./styles/mono.css";

/**
 * Main App component — routes between platform and legacy views.
 */
export function App() {
  // Apply persisted theme on mount
  useEffect(() => {
    applyTheme(getSetting("theme", "light"));
  }, []);

  // Simple path-based routing (no router dependency needed)
  const path = window.location.pathname;
  if (path === "/home") return <LandingPage />;
  if (path === "/help") return <HelpPage />;
  if (path === "/login") return <AccountPage mode="login" />;
  if (path === "/signup") return <AccountPage mode="signup" />;
  if (path === "/account") return <AccountPage mode="account" />;
  const isLegacyView = path.startsWith("/validate");

  if (isLegacyView) {
    return <Suspense fallback={<div className="route-loading" role="status">Preparing Vision BIM Validator…</div>}><LegacyValidationView /></Suspense>;
  }

  return <Suspense fallback={<div className="route-loading" role="status">Preparing your BIM workspace…</div>}><AppShell /></Suspense>;
}

export default App;
