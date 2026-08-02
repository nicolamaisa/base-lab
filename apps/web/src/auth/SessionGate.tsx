import type { PropsWithChildren } from "react";

import { useAuth } from "./useAuth";

export function SessionGate({ children }: PropsWithChildren) {
  const { initializing } = useAuth();

  if (initializing) {
    return (
      <main className="centeredPage">
        <div className="loadingCard" role="status" aria-live="polite">
          <span className="spinner" aria-hidden />
          <span>Avvio di Personalized OS…</span>
        </div>
      </main>
    );
  }

  return children;
}
