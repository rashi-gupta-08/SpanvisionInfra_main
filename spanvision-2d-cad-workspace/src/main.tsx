import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/globals.css';

const AppComponent = React.lazy(() => import('./components/web/WebApp'));

const LoadingFallback = () => (
  <div style={{ width: '100vw', height: '100vh', background: '#000000' }} />
);

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: '#eeeeee', background: '#000000', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ color: '#ffffff' }}>Workspace could not open</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 14, color: '#eeeeee' }}>
            {this.state.error.message}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#888', marginTop: 16 }}>
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: 20, padding: '8px 16px', background: '#ffffff', color: '#000000', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <React.Suspense fallback={<LoadingFallback />}>
        <AppComponent />
      </React.Suspense>
    </ErrorBoundary>
  </React.StrictMode>
);

import "./styles/brand-palette.css";

// Spanvision appearance bridge
import { useAppStore } from './state/appStore';
const applyColorMode=()=>useAppStore.getState().setUITheme(document.documentElement.dataset.svMode === 'light' ? 'light' : 'spanvision-mono');
window.addEventListener('spanvision:mode-change',applyColorMode);
applyColorMode();
