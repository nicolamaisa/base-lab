import type { ReactNode } from "react";

import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

import { Link } from "react-router-dom";

type PageLoadingStateProps = {
  title: string;
  description?: string;
};

export function PageLoadingState({
  title,
  description,
}: PageLoadingStateProps) {
  return (
    <main className="dashboardPage pageStatePage">
      <section className="pageStateCard" role="status" aria-live="polite">
        <span className="spinner pageStateSpinner" aria-hidden />

        <div>
          <h1>{title}</h1>

          {description ? <p>{description}</p> : null}
        </div>
      </section>
    </main>
  );
}

type PageErrorStateProps = {
  title: string;
  message: string;

  onRetry?: () => void;

  backTo?: string;
  backLabel?: string;

  actions?: ReactNode;
};

export function PageErrorState({
  title,
  message,
  onRetry,
  backTo,
  backLabel = "Go back",
  actions,
}: PageErrorStateProps) {
  return (
    <main className="dashboardPage pageStatePage">
      <section className="pageStateCard pageStateCardError" role="alert">
        <span className="pageStateIcon">
          <AlertTriangle size={24} aria-hidden />
        </span>

        <div>
          <h1>{title}</h1>

          <p>{message}</p>

          <div className="pageStateActions">
            {backTo ? (
              <Link className="secondaryButton" to={backTo}>
                <ArrowLeft size={16} aria-hidden />

                {backLabel}
              </Link>
            ) : null}

            {onRetry ? (
              <button className="primaryButton" type="button" onClick={onRetry}>
                <RefreshCw size={16} aria-hidden />
                Try again
              </button>
            ) : null}

            {actions}
          </div>
        </div>
      </section>
    </main>
  );
}
