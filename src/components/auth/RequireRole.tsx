import { Navigate, Outlet } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { hasRole, resolveEffectiveRole } from "../../lib/permissions";
import type { AuthRole } from "../../types/auth";

interface RequireRoleProps {
  /** Minimum AuthRole (see lib/permissions.ts's ROLES/ROLE_RANK) a signed-in
   *  user needs to reach the nested route. Ranked, not exact-match — any
   *  role at or above this one passes, same as every other check in
   *  lib/permissions.ts. */
  requiredRole: AuthRole;
}

/**
 * Route guard layered on top of ProtectedRoute — ProtectedRoute already
 * answers "is anyone signed in at all"; this answers "is the signed-in
 * user privileged enough for this specific route." Reuses
 * lib/permissions.ts's existing rank model (hasRole + resolveEffectiveRole)
 * rather than introducing a second permission system, so a route's
 * minimum role means exactly what "role" means everywhere else in the app.
 *
 * Meant to nest *inside* ProtectedRoute in router.tsx (as a layout route
 * with its own <Outlet/>, same composition ProtectedRoute itself uses) —
 * but also checks `isAuthenticated` itself so it redirects to /login
 * correctly even if ever used standalone. Under-ranked users are shown an
 * inline Access Denied state rather than redirected, since bouncing them
 * to some other page they didn't ask for would be more confusing than
 * telling them plainly why this one is blocked.
 */
export default function RequireRole({ requiredRole }: RequireRoleProps) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(resolveEffectiveRole(role), requiredRole)) {
    return <AccessDenied requiredRole={requiredRole} />;
  }

  return <Outlet />;
}

function AccessDenied({ requiredRole }: { requiredRole: AuthRole }) {
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
          You need {requiredRole} access or higher to view this page. Contact a workspace admin if you think this is a
          mistake.
        </p>
      </div>
    </div>
  );
}
