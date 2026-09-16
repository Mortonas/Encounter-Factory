import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 selection:bg-primary/30">
          <div className="max-w-md w-full premium-card p-8 text-center space-y-6 relative overflow-hidden red-glow">
            {/* Background Decorative Gradient */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
            
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                <AlertCircle className="w-8 h-8 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl font-black italic tracking-tighter uppercase text-white">
                  The Forge Overheated
                </h1>
                <p className="text-zinc-400 text-sm font-medium">
                  The mechanical complexity exceeded the current thermal thresholds. Please try downloading again.
                </p>
              </div>

              <div className="pt-4 w-full">
                <button
                  onClick={this.handleReset}
                  className="w-full group relative bg-primary hover:bg-red-600 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                >
                  <span className="flex items-center justify-center gap-2">
                    <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                    Reset Pipeline
                  </span>
                </button>
              </div>

              {this.state.error && (
                <div className="mt-4 p-3 bg-black/40 border border-zinc-800 rounded-lg text-[10px] font-mono text-zinc-600 text-left overflow-hidden whitespace-nowrap text-ellipsis">
                  {this.state.error.toString()}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
