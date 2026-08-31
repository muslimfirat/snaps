import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { reportError } from '../lib/telemetry';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render/lifecycle errors anywhere in the tree and shows a recoverable
 * fallback instead of a blank white screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught UI error:', error, info.componentStack);
    reportError(error, { source: 'ErrorBoundary', componentStack: (info.componentStack || '').slice(0, 600) });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isDev = import.meta.env.DEV;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-white">Bir şeyler ters gitti</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Beklenmedik bir hata oluştu. Verilerin cihazında güvende — sayfayı
              yenileyerek kaldığın yerden devam edebilirsin.
            </p>
          </div>

          {isDev && (
            <pre className="text-left text-2xs text-rose-300/90 bg-slate-950/80 border border-slate-800 rounded-xl p-3 overflow-auto max-h-40 whitespace-pre-wrap break-words">
              {error.name}: {error.message}
            </pre>
          )}

          <button
            onClick={this.handleReload}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Sayfayı Yenile
          </button>
        </div>
      </div>
    );
  }
}
