import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, TriangleExclamationPoint } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('TankApp ErrorBoundary:', error, info);
    }
  }

  private handleReload = (): void => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <TriangleExclamationPoint className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-base font-bold">Unerwarteter Fehler</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Bei der Darstellung von TankApp ist ein Problem aufgetreten. Bitte lade die App neu.
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              App neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
