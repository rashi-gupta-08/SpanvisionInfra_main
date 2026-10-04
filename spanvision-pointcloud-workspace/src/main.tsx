import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import './styles/brand-palette.css';
import './styles/workspace.css';
import { useAppStore } from './state/appStore';
document.documentElement.dataset.theme = useAppStore.getState().uiTheme;

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
        <div className="runtime-error">
          <h1>Unable to open the workspace</h1>
          {import.meta.env.DEV && <pre>{this.state.error.message}</pre>}
          <button
            onClick={() => this.setState({ error: null })}
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
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Spanvision appearance bridge
const applyColorMode=()=>useAppStore.getState().setUITheme(document.documentElement.dataset.svMode === 'light' ? 'light' : 'spanvision-mono');
window.addEventListener('spanvision:mode-change',applyColorMode);
applyColorMode();
