import { useState, type CSSProperties, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";

/* The illustrated panel uses the actual reference/orbit-login.jpe artwork
   (not a CSS/SVG recreation) — resolved to a built URL via `new URL(...,
   import.meta.url)` so Vite serves/bundles it without needing an import
   declaration for its non-standard ".jpe" extension. */
const orbitLoginImage = new URL("../../reference/orbit-login.jpe", import.meta.url).href;

/* Fixed brand colors for the welcome-panel overlay text and primary
   button — these mirror reference/orbit-login.jpe's pale ivory-blue
   watercolor palette (a Chinese-painting-style pagoda rendered in
   layered indigo and powder blues against cream) and intentionally
   stay literal (not theme tokens) so the login page keeps its
   identity in both light and dark app appearance settings. */
const INK = "#2E4066"; // deep indigo — overlay text, primary button
const INK_DEEP = "#1E2C4A"; // darker indigo — button gradient
const LINK_BLUE = "#3D5C99";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password to continue.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDemoLogin() {
    // "Maya Chen, Owner" — one of the 5 real, database-backed RBAC demo
    // accounts seeded by server/prisma/seed.ts (see AuthContext.tsx's
    // DEMO_ROLE_BY_EMAIL for the other 4). Logging in here (not just
    // navigating) is required so ProtectedRoute's isAuthenticated check
    // lets the navigation to "/" (Dashboard) through instead of bouncing
    // back to /login.
    setError(null);
    setSubmitting(true);

    try {
      await login("owner@orbit.dev", "demo1234");
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="orbit-root"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        position: "relative",
      }}
    >
      {/* `::placeholder`/`:focus` can't be expressed via inline styles, so
          they're scoped here rather than added to the shared stylesheet. */}
      <style>{`
        .auth-field::placeholder { color: var(--text-3); }
        .auth-field:focus { border-bottom-color: var(--text-2); }
      `}</style>

      <svg width="0" height="0">
        <filter id="paperNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.62  0 0 0 0 0.70  0 0 0 0 0.82  0 0 0 0.02 0" />
        </filter>
      </svg>
      <div className="paper-texture" style={{ filter: "url(#paperNoise)" }} />

      <div className="fade-in" style={{ width: "100%", maxWidth: 800, position: "relative" }}>
        {/* CARD — split into an illustrated welcome panel (desktop/tablet
            only) and the form panel, matching the "Modern Login Screen
            UI/UX" layout reference: a centered rounded card with a
            full-bleed image on the left and the form on the right. Below
            `md` the welcome panel is hidden and the form panel becomes
            the whole card. */}
        <div
          className="bg-card border-soft shadow-float-lg flex flex-col md:flex-row"
          style={{ borderRadius: 28, overflow: "hidden" }}
        >
          {/* WELCOME PANEL */}
          <div
            aria-hidden
            className="hidden md:block"
            style={{
              flex: "0 0 45%",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <img
              src={orbitLoginImage}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />

            {/* soft scrim so the overlay text stays legible regardless of
                what part of the artwork sits behind it */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.12) 32%, rgba(255,255,255,0) 55%)",
              }}
            />

            <div style={{ position: "relative", zIndex: 1, padding: "40px 0 0 40px" }}>
              <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: INK, letterSpacing: 3, textTransform: "uppercase" }}>
                orbit
              </span>
             
            </div>
          </div>

          {/* FORM PANEL */}
          <div className="flex flex-col justify-center" style={{ flex: 1, padding: "56px 60px" }}>
            <h1 style={{ fontSize: 34, fontWeight: 800, color: "var(--text)", margin: 0, textAlign: "center" }}>
              Login
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 30, marginTop: 34 }}>
              <input
                autoFocus
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                aria-label="Email"
                className="auth-field"
                style={fieldInputStyle}
              />

              <div style={{ position: "relative" }}>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  aria-label="Password"
                  className="auth-field"
                  style={fieldInputStyle}
                />
                <Link
                  to="/forgot-password"
                  style={{
                    position: "absolute",
                    top: -18,
                    right: 0,
                    fontSize: 11.5,
                    color: "var(--text)",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  Forgot password?
                </Link>
              </div>

              {error && <span style={{ fontSize: 11.5, color: "#B3564B" }}>{error}</span>}

              <button type="submit" disabled={submitting} className="lift" style={primaryButtonStyle}>
                {submitting ? "Signing in…" : "Login"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: "var(--text-2)" }}>
              Don't have an account?{" "}
              <Link to="/register" style={{ color: LINK_BLUE, fontWeight: 600, textDecoration: "none" }}>
                Sign up
              </Link>
            </p>

            <div className="flex items-center" style={{ gap: 10, margin: "22px 0" }}>
              <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>or</span>
              <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
            </div>

            <button type="button" onClick={handleDemoLogin} disabled={submitting} style={secondaryButtonStyle}>
              Continue to demo workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   STYLES
   Colors reference the Orbit design tokens defined on .orbit-root
   in styles/globals.css (--text, --text-2, --text-3, --border,
   --card) so light mode is unchanged and dark mode (set via
   Settings > Appearance) resolves to readable values automatically.
   The welcome-panel overlay text and primary button are the
   exceptions — fixed brand colors (see INK/INK_DEEP/LINK_BLUE
   above), matched to reference/orbit-login.jpe's ivory-and-indigo
   watercolor pagoda, not themed ones.
============================================================ */

const fieldInputStyle: CSSProperties = {
  border: "none",
  borderBottom: "1.5px solid var(--border)",
  borderRadius: 0,
  outline: "none",
  background: "transparent",
  fontSize: 15,
  color: "var(--text)",
  width: "100%",
  padding: "10px 2px",
  transition: "border-color 150ms ease",
};

const primaryButtonStyle: CSSProperties = {
  background: `linear-gradient(135deg, ${INK} 0%, ${INK_DEEP} 100%)`,
  color: "#FFFFFF",
  border: "none",
  borderRadius: 999,
  padding: "15px 18px",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 4,
  width: "100%",
};

const secondaryButtonStyle: CSSProperties = {
  width: "100%",
  background: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "12px 18px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
