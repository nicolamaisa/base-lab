import { useEffect } from "react";

import { useLocation } from "react-router-dom";

import { constants } from "../../config/constants";

function getRouteTitle(pathname: string): string {
  if (pathname === "/") {
    return "Console";
  }

  if (pathname === "/runs") {
    return "Runs";
  }

  if (pathname === "/usage") {
    return "Usage";
  }

  if (pathname === "/settings") {
    return "Settings";
  }

  return constants.appName;
}

export function RouteAnnouncer() {
  const location = useLocation();

  const title = getRouteTitle(location.pathname);

  useEffect(() => {
    document.title = `${title} · ${constants.appName}`;
  }, [title]);

  return (
    <div className="routeAnnouncer" aria-live="polite" aria-atomic="true">
      {title}
    </div>
  );
}
