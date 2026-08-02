import {
  LogOut,
  Settings,
  Sparkles,
  SquareTerminal,
  X,
  History,
  type LucideIcon,
  Activity,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { constants } from "../../config/constants";

type SidebarProps = { mobileOpen: boolean; onClose: () => void };
type NavigationItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

const navigationItems: NavigationItem[] = [
  { to: "/", label: "Console", icon: SquareTerminal, end: true },
  { to: "/runs", label: "Runs", icon: History },
  { to: "/usage", label: "Usage", icon: Activity },
];

function navigationClassName({ isActive }: { isActive: boolean }): string {
  return [
    "sidebarNavigationLink",
    isActive ? "sidebarNavigationLinkActive" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { session, signOut } = useAuth();

  return (
    <aside
      className={["appSidebar", mobileOpen ? "appSidebarOpen" : ""]
        .filter(Boolean)
        .join(" ")}
      id="app-navigation"
      aria-label="Application navigation"
    >
      <div className="sidebarBrand">
        <div className="sidebarBrandMark">
          <Sparkles size={19} aria-hidden />
        </div>
        <div>
          <strong>{constants.appName}</strong>
          <span>{constants.appShortDescription}</span>
        </div>
        <button
          className="sidebarCloseButton"
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
        >
          <X size={19} aria-hidden />
        </button>
      </div>

      <nav className="sidebarNavigation" aria-label="Primary navigation">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              className={navigationClassName}
              end={item.end}
              key={item.to}
              to={item.to}
              onClick={onClose}
            >
              <Icon size={18} aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebarFooter">
        <div className="sidebarAccount">
          <span>Signed in as</span>
          <strong>{session?.user.email ?? "Authenticated user"}</strong>
        </div>
        <NavLink
          className={navigationClassName}
          to="/settings"
          onClick={onClose}
        >
          <Settings size={18} aria-hidden />
          <span>Settings</span>
        </NavLink>
        <button
          className="sidebarSignOutButton"
          type="button"
          onClick={() => void signOut()}
        >
          <LogOut size={18} aria-hidden />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
