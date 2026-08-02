import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import { App } from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { SessionGate } from "./auth/SessionGate";
import { AppErrorBoundary } from "./components/feedback/AppErrorBoundary";

import "./styles/global.css";
import { PreferencesProvider } from "./providers/PreferencesProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <BrowserRouter>
          <AuthProvider>
            <SessionGate>
              <AppErrorBoundary>
                <App />
              </AppErrorBoundary>
            </SessionGate>
          </AuthProvider>
        </BrowserRouter>
      </PreferencesProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
