import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;
(globalThis as any).Buffer = Buffer;

import { applyTheme, getInitialTheme } from "./services/theme";
applyTheme(getInitialTheme());

// Bewaarde interface-zoom meteen toepassen, zodat de app niet eerst op
// 100% verschijnt en daarna verspringt.
import { applyUiZoom, loadUiZoom } from "./services/system/uiZoom";
void applyUiZoom(loadUiZoom());

import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n/config";
import "./styles/fonts.css";
import App from "./App";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: '#eaeaea', background: 'var(--theme-bg)', height: '100vh' }}>
          <h1 style={{ color: 'var(--theme-text)', marginBottom: 16 }}>An error occurred</h1>
          <pre style={{ fontSize: 12, color: '#a0a0a0', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}
          </pre>
          <button
            style={{
              marginTop: 20, padding: '8px 16px', background: 'var(--theme-accent)',
              color: 'var(--theme-accent-text)', border: 'none', borderRadius: 4, cursor: 'pointer',
            }}
            onClick={() => window.location.reload()}
          >
            Herlaad applicatie
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Production: disable context menu and browser dev shortcuts
if (import.meta.env.PROD) {
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  document.addEventListener("keydown", (e) => {
    if (e.key === "F12") { e.preventDefault(); return; }
    if (e.ctrlKey && e.shiftKey && e.key === "I") { e.preventDefault(); return; }
    if (e.ctrlKey && e.shiftKey && e.key === "J") { e.preventDefault(); return; }
    if (e.ctrlKey && e.shiftKey && e.key === "C") { e.preventDefault(); return; }
    if (e.ctrlKey && e.key === "u") { e.preventDefault(); return; }
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

import "./styles/brand-palette.css";
