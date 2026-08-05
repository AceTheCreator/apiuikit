import { Component, ErrorInfo, ReactNode } from "react";

export type ErrorBoundaryFallbackRenderer = (error: Error, reset: () => void) => ReactNode;

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI. Either a static node or a render function that also gets a `reset` callback. */
  fallback?: ReactNode | ErrorBoundaryFallbackRenderer;
  /** Called once when a render error is caught, in addition to the default console.error. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time errors from a malformed/edge-case spec so they can't escape
 * into the host application's React tree (React error boundaries only catch
 * synchronous render errors — async failures, e.g. in AsyncAPIRenderer's parse
 * step, are handled separately via diagnostics).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[apiuikit] Rendering error:", error, errorInfo.componentStack);
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const { fallback } = this.props;
    if (typeof fallback === "function") return fallback(error, this.reset);
    if (fallback !== undefined) return fallback;

    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-6 text-foreground"
      >
        <p className="font-semibold text-foreground">
          Something went wrong rendering this API specification.
        </p>
        <p className="text-sm text-foreground-secondary break-words">{error.message}</p>
        <button
          type="button"
          onClick={this.reset}
          className="rounded-md bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
        >
          Try again
        </button>
      </div>
    );
  }
}
