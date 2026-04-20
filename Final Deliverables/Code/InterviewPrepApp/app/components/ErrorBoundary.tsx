"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 max-w-md">
            <h2 className="text-lg font-semibold text-destructive mb-2">Something went wrong</h2>
            <p className="text-muted-foreground text-sm mb-4">
              This section encountered an error. The rest of the app should still work.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => this.setState({ hasError: false })}
                className="rounded-md bg-muted px-4 py-2 text-sm text-foreground hover:bg-muted/80 transition-colors"
              >
                Try again
              </button>
              <a
                href="/dashboard"
                className="rounded-md bg-card px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
