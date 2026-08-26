import { useEffect, useState, type CSSProperties } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Settings, LogOut, X } from "lucide-react";
import type { NavItem } from "../../types/dashboard";
import { SparkleMark } from "../doodles/SparkleMark";
import { Avatar } from "../ui/Avatar";
import { useAuth } from "../../context/AuthContext";
import { useWorkspaceRole, isWorkspaceManager } from "../../hooks/useWorkspaceRole";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

interface SidebarProps {
  items: NavItem[];
  /** Whether the off-canvas drawer is open. Ignored at `lg`+, where the sidebar is always visible. */
  isOpen: boolean;
  /** Closes the drawer — called on backdrop click, the close button, and nav selection. */
  onClose: () => void;
}

/** Maps each nav item's label to its route. Kept local to Sidebar so no other file needs to change. */
const ROUTES: Record<string, string> = {
  Dashboard: "/",
  Projects: "/projects",
  Tasks: "/tasks",
  "Kanban Board": "/kanban",
  Calendar: "/calendar",
  Timeline: "/timeline",
  Team: "/team",
  Analytics: "/analytics",
  Files: "/files",
  Settings: "/settings",
};

const activeNavStyle: CSSProperties = {
  background: "var(--card)",
  boxShadow: "0 1px 2px rgba(32,36,43,0.04), 0 8px 20px -10px rgba(32,36,43,0.16)",
  color: "var(--text)",
  fontWeight: 600,
};

const inactiveNavStyle: CSSProperties = {
  background: "transparent",
  boxShadow: "none",
  color: "var(--text-2)",
  fontWeight: 500,
};

// Fallback shown only if this ever rendered signed-out (it can't —
// Sidebar only mounts inside DashboardLayout, itself behind
// ProtectedRoute, which guarantees `user` is set) — kept anyway to match
// ProfileMenu.tsx's identical defensive fallback for the same trigger-row
// shape, rather than assuming this component's guarantees never change.
const GUEST_NAME = "Maya Chen";
const GUEST_INITIALS = "MC";
const GUEST_ROLE = "Owner";

export function Sidebar({ items, isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const displayName = user?.name ?? GUEST_NAME;
  const displayInitials = user?.initials ?? GUEST_INITIALS;
  const displayRole = user?.role ?? GUEST_ROLE;
  // Stage 6 (Permissions Alignment): real WorkspaceRole, not the mock
  // AuthRole — see RequireRole.tsx's identical /settings route guard,
  // which this just mirrors for the nav item itself.
  const workspaceRole = useWorkspaceRole();
  const canViewSettings = isWorkspaceManager(workspaceRole);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  function requestLogout() {
    setIsLogoutConfirmOpen(true);
  }

  function cancelLogout() {
    setIsLogoutConfirmOpen(false);
  }

  function confirmLogout() {
    setIsLogoutConfirmOpen(false);
    logout();
    navigate("/login");
  }

  useEffect(() => {
    if (!isLogoutConfirmOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsLogoutConfirmOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLogoutConfirmOpen]);

  return (
    <>
      {/* Backdrop for the off-canvas drawer, below `lg` only. */}
      <div
        aria-hidden={!isOpen}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 lg:hidden ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`bg-surface-2 border-soft shadow-float fade-in fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-[300px] shrink-0 flex-col p-5 transition-transform duration-300 ease-in-out lg:sticky lg:inset-y-auto lg:left-auto lg:top-5 lg:z-0 lg:h-[calc(100%-40px)] lg:w-[248px] lg:max-w-none lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ borderRadius: 24 }}
      >
        <div className="flex items-center justify-between" style={{ padding: "4px 8px 20px 8px" }}>
          <div className="flex items-center" style={{ gap: 10 }}>
            <SparkleMark size={26} />
            <span className="font-display" style={{ fontSize: 20, fontWeight: 560 }}>
              orbit
            </span>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="nav-item flex lg:hidden"
            style={{
              // Only ever rendered below `lg` (desktop never shows this
              // button), so sizing it to the ~44px touch-target guideline
              // is safe — no desktop appearance change.
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "var(--surface)",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            <X size={16} strokeWidth={1.8} color="var(--text-2)" />
          </button>
        </div>

        <WorkspaceSwitcher />

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {items.map((item) => {
            const path = ROUTES[item.label] ?? "/";
            return (
              <NavLink
                key={item.label}
                to={path}
                end={path === "/"}
                onClick={onClose}
                className="nav-item"
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  textDecoration: "none",
                  fontSize: 14,
                  ...(isActive ? activeNavStyle : inactiveNavStyle),
                })}
              >
                <item.icon size={17} strokeWidth={1.7} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

      <div style={{ marginTop: "auto", paddingTop: 16 }}>
        <div className="border-soft-t" style={{ paddingTop: 14 }}>
          {canViewSettings && (
            <NavLink
              to="/settings"
              onClick={onClose}
              className="nav-item"
              style={({ isActive }) => ({
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "10px 12px",
                borderRadius: 14,
                border: "none",
                cursor: "pointer",
                textDecoration: "none",
                fontSize: 14,
                marginBottom: 2,
                ...(isActive ? activeNavStyle : inactiveNavStyle),
              })}
            >
              <Settings size={17} strokeWidth={1.7} />
              Settings
            </NavLink>
          )}
          <button
            type="button"
            onClick={requestLogout}
            aria-label="Logout"
            className="bg-card lift"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 10,
              borderRadius: 16,
              marginTop: 10,
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <Avatar initials={displayInitials} bg="var(--blue)" size={34} />
            <div style={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{displayName}</div>
              <div className="text-ink-3" style={{ fontSize: 11.5 }}>
                {displayRole}
              </div>
            </div>
            <LogOut size={15} strokeWidth={1.7} color="var(--text-3)" />
          </button>
        </div>
      </div>
      </aside>

      {isLogoutConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
          aria-describedby="logout-confirm-description"
          className="fixed inset-0 z-[60] flex items-center justify-center p-5"
        >
          <button
            type="button"
            aria-label="Close dialog"
            onClick={cancelLogout}
            className="absolute inset-0 h-full w-full cursor-default bg-black/40 backdrop-blur-[2px]"
          />

          <div
            className="bg-card border-soft shadow-float-lg fade-in"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 360,
              borderRadius: 20,
              padding: 24,
            }}
          >
            <h3
              id="logout-confirm-title"
              className="font-display text-ink"
              style={{ fontSize: 18, fontWeight: 600, margin: 0, marginBottom: 8 }}
            >
              Confirm logout?
            </h3>
            <p
              id="logout-confirm-description"
              className="text-ink-2"
              style={{ fontSize: 13, lineHeight: 1.6, margin: 0, marginBottom: 20 }}
            >
              Are you sure you want to log out?
            </p>

            <div className="flex items-center justify-end" style={{ gap: 8 }}>
              <button
                type="button"
                onClick={cancelLogout}
                className="bg-surface-2 text-ink-2"
                style={{
                  border: "none",
                  borderRadius: 11,
                  padding: "10px 16px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                style={{
                  background: "#B3564B",
                  color: "#FFF8F6",
                  border: "none",
                  borderRadius: 11,
                  padding: "10px 16px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}