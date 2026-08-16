import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

/**
 * Route guard for the authenticated app shell (Dashboard, Projects, Tasks,
 * Kanban, Calendar, Timeline, Team, Analytics, Settings — everything mounted
 * under DashboardLayout in router.tsx).
 *
 * Reads auth state from the existing AuthContext; renders the nested route
 * via <Outlet /> when a user is present, otherwise redirects to /login.
 *
 * Phase 23: session restore (a stored token being validated against
 * GET /api/users/me on app startup) is async, so `isAuthenticated` starts
 * false even for an already-signed-in visitor. Waiting for
 * `isInitializing` to clear first avoids bouncing them to /login on every
 * refresh before the restore has had a chance to complete.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          color: "var(--text-2)",
        }}
      >
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
