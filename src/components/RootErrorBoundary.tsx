import React, { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showStack: boolean;
}

export class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showStack: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, showStack: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[RootErrorBoundary] Caught app-level crash:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleClearDataAndReload = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('treasuryos:')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('treasuryos:')) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(k => sessionStorage.removeItem(k));
    } catch (e) {
      console.error('Failed to clear treasuryos storage', e);
    }
    window.location.reload();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6 text-slate-900 font-sans">
          <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-red-200 p-8">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center font-bold text-lg">!</div>
              <h1 className="text-xl font-bold">TreasuryOS crashed</h1>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              The application encountered an unexpected error during rendering or execution.
            </p>
            {this.state.error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4 text-xs font-mono text-red-800 overflow-x-auto">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => this.setState(prev => ({ showStack: !prev }))}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                {this.state.showStack ? 'Hide component stack' : 'Show component stack'}
              </button>
            </div>
            {this.state.showStack && this.state.errorInfo && (
              <pre className="bg-slate-900 text-slate-100 text-[11px] font-mono p-4 rounded-xl mb-6 overflow-x-auto max-h-48">
                {this.state.errorInfo.componentStack}
              </pre>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition"
              >
                Reload
              </button>
              <button
                onClick={this.handleClearDataAndReload}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition"
              >
                Clear local data and reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
