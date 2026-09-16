import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
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
    console.error(`[ErrorBoundary] Error in ${this.props.componentName || 'Unknown Component'}:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="premium-card p-6 border-red-500/30 bg-red-500/5 text-center space-y-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black uppercase tracking-tighter text-red-500">
              Module Failure: {this.props.componentName || "Unknown Component"}
            </h4>
            <p className="text-[10px] font-medium text-zinc-500 max-w-[200px] mx-auto leading-tight">
              A critical error occurred while rendering this tactical module. State has been preserved.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="flex items-center gap-2 mx-auto bg-zinc-900 border border-zinc-800 hover:border-red-500/50 px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all text-zinc-400 hover:text-red-500"
          >
            <RefreshCcw className="w-3 h-3" /> Re-Initialize
          </button>
          {process.env.NODE_ENV === 'development' && (
            <pre className="text-[8px] text-red-400/50 text-left overflow-auto max-h-24 p-2 bg-black rounded border border-red-500/10">
              {this.state.error?.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
