import { Component, type ErrorInfo, type PropsWithChildren } from "react";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { constants } from "../../config/constants";
type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<
  PropsWithChildren,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      error,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Uncaught application error", error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="centeredPage appCrashPage">
        <section className="appCrashCard" role="alert">
          <span>
            <AlertTriangle size={27} aria-hidden />
          </span>

          <h1>{constants.appName} encountered an error</h1>

          <p>
            The current page could not be rendered. Your data have not been
            modified.
          </p>

          <pre>{this.state.error.message}</pre>

          <button
            className="primaryButton"
            type="button"
            onClick={() => {
              window.location.reload();
            }}
          >
            <RefreshCw size={17} aria-hidden />
            Reload application
          </button>
        </section>
      </main>
    );
  }
}
