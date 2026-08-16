import { Navigate, Outlet } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useTaskContext } from "../../context/taskContextValue";
import { useWorkspaceRole, isWorkspaceManager } from "../../hooks/useWorkspaceRole";

/**
 * Route guard layered on top of ProtectedRoute — ProtectedRoute already
 * answers "is anyone signed in at all"; this answers "is the signed-in
 * user privileged enough for this specific route."
 *
 * Stage 6 (Permissions Alignment): this used to gate on lib/permissions.ts's
 * decoupled 5-tier AuthRole (a mock, per-email demo vocabulary). Its one
 * real call site (router.tsx, /settings) only ever needed "Admin and
 * above," which maps losslessly onto the real WorkspaceRole's OWNER/ADMIN
 * tiers (useWorkspaceRole/isWorkspaceManager) — the same real role
 * Team.tsx's own permission gating already uses, so this route's guard
 * now means exactly what the backend itself checks, not a separate
 * approximation of it.
 *
 * Meant to nest *inside* ProtectedRoute in router.tsx (as a layout route
 * with its own <Outlet/>, same composition ProtectedRoute itself uses) —
 * but also checks `isAuthenticated` itself so it redirects to /login
 * correctly even if ever used standalone. An under-privileged user is
 * shown an inline Access Denied state rather than redirected, since
 * bouncing them to some other page they didn't ask for would be more
 * confusing than telling them plainly why this one is blocked.
 */
export default function RequireRole() {
  const { isAuthenticated } = useAuth();
  const workspaceRole = useWorkspaceRole();
  // useWorkspaceRole resolves from TaskContext's roster fetch, which is
  // async — while it's still in flight, `workspaceRole` is indistinguishable
  // from "genuinely not a manager" (both null). Wait for it rather than
  // flashing Access Denied before the real answer has even arrived.
  const { isLoading: workspaceRoleLoading } = useTaskContext();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (workspaceRoleLoading) {
    return null;
  }

  if (!isWorkspaceManager(workspaceRole)) {
    return <AccessDenied />;
  }

  return <Outlet />;
}

function AccessDenied() {
  return (
    <div
      className="fade-in flex flex-col items-center text-center"
      style={{ minHeight: "60vh", justifyContent: "center", padding: 24, gap: 14 }}
    >
      <div
        className="bg-surface-2"
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ShieldAlert size={22} strokeWidth={1.8} color="var(--text-2)" />
      </div>

      <div>
        <h1 className="font-display text-ink" style={{ fontSize: 22, fontWeight: 600, margin: 0, marginBottom: 6 }}>
          Access denied
        </h1>
        <p className="text-ink-2" style={{ fontSize: 13.5, maxWidth: 360, margin: "0 auto", lineHeight: 1.6 }}>
          You need Admin access or higher in this workspace to view this page. Contact a workspace admin if you think
          this is a mistake.
        </p>
      </div>
    </div>
  );
}
