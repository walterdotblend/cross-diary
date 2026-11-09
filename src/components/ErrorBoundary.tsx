import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  language?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  public componentDidUpdate(prevProps: Props) {
    if (prevProps.fallbackTitle !== this.props.fallbackTitle && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      const isEnglish =
        this.props.language === 'en' ||
        (typeof window !== 'undefined' && localStorage.getItem('cross_diary_language') === 'en');

      return (
        <div
          className="p-4 rounded-2xl border text-center space-y-3 m-2 animate-fade-in"
          style={{
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderColor: 'var(--border-strong, #FF2E00)',
            color: 'var(--text-main, #111111)',
          }}
        >
          <div className="text-xs font-display-brutal uppercase tracking-wider text-red-500">
            ⚠️ {this.props.fallbackTitle || (isEnglish ? 'View Error' : 'Error en la vista')}
          </div>
          <p className="text-[10px] opacity-75 font-mono max-h-24 overflow-y-auto">
            {this.state.error?.message || (isEnglish ? 'Unexpected error' : 'Error inesperado')}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-3 py-1.5 rounded-xl text-xs font-black uppercase shadow-sm transition-transform active:scale-95"
            style={{
              backgroundColor: 'var(--bg-pill, #FF2E00)',
              color: 'var(--accent-fg, #ffffff)',
            }}
          >
            {isEnglish ? 'Retry view' : 'Reintentar vista'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
