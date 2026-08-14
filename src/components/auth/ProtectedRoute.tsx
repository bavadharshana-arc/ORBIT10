import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

/**
 * Route guard for the authenticated app shell (Dashboard, Projects, Tasks,
 * Kanban, Calendar, Timeline, Team, Analytics, Settings — everything mounted
 * under DashboardLayout in router.tsx).
 *
 * Reads auth state from the existing AuthContext; renders the nested route
 * via <Outlet /> when a user is present, otherwise redirects to /login.
 */
export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
