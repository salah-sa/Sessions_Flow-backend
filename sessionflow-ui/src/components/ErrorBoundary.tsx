import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Card, Button } from "./ui";

import i18n from "../lib/i18n";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] h-full w-full flex items-center justify-center p-6 animate-fade-in text-white">
          <Card className="max-w-md w-full p-8 bg-var(--ui-sidebar-bg) border-red-500/20 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
            <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-sora font-extrabold text-white tracking-widest uppercase">
                {i18n.t("error_boundary.title")}
              </h2>
              <p className="text-sm text-slate-400">
                {i18n.t("error_boundary.desc")}
              </p>
              {this.state.error && (
                <div className="mt-4 p-4 bg-black/50 rounded-xl border border-white/5 text-left overflow-x-auto">
                  <code className="text-xs text-red-400 font-mono break-all">
                    {this.state.error.message}
                  </code>
                </div>
              )}
            </div>
            <Button
              onClick={this.handleRetry}
              className="w-full bg-var(--ui-surface) hover:bg-slate-700 text-white border border-white/10 mt-4"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              {i18n.t("error_boundary.retry")}
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

