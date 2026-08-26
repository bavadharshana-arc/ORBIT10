import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

/**
 * Route guard for the public, signed-out-only screens (Login, Register,
 * Forgot/Reset Password) — the exact inverse of ProtectedRoute.tsx.
 *
 * ProtectedRoute already answers "is anyone signed in at all" for the
 * app shell; this answers the other half of the same question that
 * nothing previously covered: an already-authenticated visitor landing
 * directly on /login (or /register, etc. — same gap, same fix) with a
 * still-valid session had no guard sending them on to the app, so they
 * sat on a login form for an account that was already signed in. Real
 * app URLs never expose credentials this way; if a session is genuinely
 * still valid, that page is redundant.
 *
 * Mirrors ProtectedRoute's isInitializing handling exactly, for the same
 * reason: `isAuthenticated` starts false even for an already-signed-in
 * visitor until the stored token has been validated against the backend
 * (AuthContext.tsx's session-restore effect). Deciding "show the public
 * page" before that resolves would flash Login for a second even to a
 * fully authenticated user on refresh — waiting avoids that, and avoids
 * a redirect loop (redirecting to "/" while still `isInitializing` would
 * just bounce straight back here from ProtectedRoute, which is itself
 * waiting on the exact same flag).
 */
export default function PublicRoute() {
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

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
