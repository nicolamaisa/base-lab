import { useEffect, useState } from "react";
import { constants } from "../../config/constants";

import { Menu, Sparkles } from "lucide-react";

import { Outlet } from "react-router-dom";

import { RouteAnnouncer } from "./RouteAnnouncer";

import { Sidebar } from "./Sidebar";

export function AppShell() {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavigationOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setMobileNavigationOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileNavigationOpen]);

  return (
    <div className="appShell">
      <a className="skipLink" href="#main-content">
        Skip to main content
      </a>

      <RouteAnnouncer />

      <Sidebar
        mobileOpen={mobileNavigationOpen}
        onClose={() => {
          setMobileNavigationOpen(false);
        }}
      />

      {mobileNavigationOpen ? (
        <button
          className="sidebarBackdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => {
            setMobileNavigationOpen(false);
          }}
        />
      ) : null}

      <div className="appShellMain">
        <header className="mobileAppBar">
          <div>
            <span className="mobileBrandMark">
              <Sparkles size={17} aria-hidden />
            </span>

            <strong>{constants.appName}</strong>
          </div>

          <button
            type="button"
            aria-label="Open navigation"
            aria-controls="app-navigation"
            aria-expanded={mobileNavigationOpen}
            onClick={() => {
              setMobileNavigationOpen(true);
            }}
          >
            <Menu size={21} aria-hidden />
          </button>
        </header>

        <div className="appShellContent" id="main-content" tabIndex={-1}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
