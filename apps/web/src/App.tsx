import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import { HomePage } from "./pages/HomePage";
import { RunsPage } from "./pages/RunsPage";
import { LoginPage } from "./pages/LoginPage";
import { SettingsPage } from "./pages/SettingsPage";
import { UsagePage } from "./pages/UsagePage";

function protectedPage(element: ReactNode) {
  return <ProtectedRoute>{element}</ProtectedRoute>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={protectedPage(<AppShell />)}>
        <Route index element={<HomePage />} />
        <Route path="runs" element={<RunsPage />} />
        <Route path="usage" element={<UsagePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
