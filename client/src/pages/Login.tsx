import { useState, type CSSProperties, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";

/* Fixed brand colors for the primary button and "Sign up" link —
   originally chosen to match the now-removed welcome-panel artwork's
   ivory-and-indigo palette, kept literal (not theme tokens) so the
   login page's identity stays consistent in both light and dark app
   appearance settings. reference/orbit-login.jpe itself is still used
   by Register.tsx/ForgotPassword.tsx/ResetPassword.tsx — not deleted. */
const INK = "#2E4066"; // deep indigo — primary button
const INK_DEEP = "#1E2C4A"; // darker indigo — button gradient
const LINK_BLUE = "#3D5C99";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    // Phase 19 Frontend Integration audit fix (Priority 1): "Demo
    // Owner", the real, database-backed OWNER of the permanent "Demo
    // Workspace" seeded by server/prisma/seed.ts's DEMO_USERS — not one
    // of the 5 RBAC-only demo accounts (AuthContext.tsx's
    // DEMO_ROLE_BY_EMAIL), which exist purely to exercise each AuthRole
    // and don't belong to any workspace. Logging in here (not just
    // navigating) is required so ProtectedRoute's isAuthenticated check
    // lets the navigation to "/" (Dashboard) through instead of bouncing
    // back to /login; once signed in, WorkspaceContext fetches this
    // account's real workspaces and lands on the seeded Demo Workspace.
    setError(null);
    setSubmitting(true);

    try {
      await login("demo.owner@orbitdemo.local", "DemoPass123!");
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

      <div className="fade-in" style={{ width: "100%", maxWidth: 440, position: "relative" }}>
        {/* CARD — a single centered form panel. Previously split into an
            illustrated welcome panel (desktop/tablet) alongside this form
            panel; the welcome panel was removed at the image's exclusive
            usage site (this page only — see the note above INK). maxWidth
            above is unchanged from what this form panel's own box was
            before (800 total minus the welcome panel's 45% share), so the
            field/button widths and proportions are exactly as they were,
            just without a second panel beside them. */}
        <div
          className="bg-card border-soft shadow-float-lg flex flex-col"
          style={{ borderRadius: 28, overflow: "hidden" }}
        >
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
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  aria-label="Password"
                  className="auth-field"
                  style={passwordFieldInputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={passwordToggleButtonStyle}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
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
              Explore Demo Workspace
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
   The primary button and "Sign up" link are the exceptions — fixed
   brand colors (see INK/INK_DEEP/LINK_BLUE above), not themed ones.
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

/* Same as fieldInputStyle, with extra right padding so typed text never
   sits under the show/hide-password toggle button below. */
const passwordFieldInputStyle: CSSProperties = {
  ...fieldInputStyle,
  paddingRight: 30,
};

/* The eye/eye-off toggle button overlaid on the right edge of a password
   field — absolutely positioned within that field's `position: relative`
   wrapper, transparent so it reads as an icon rather than a second
   button, and small enough to never overlap the "Forgot password?" link
   sitting above the input in the same wrapper. */
const passwordToggleButtonStyle: CSSProperties = {
  position: "absolute",
  right: 2,
  top: "50%",
  transform: "translateY(-50%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "none",
  padding: 4,
  margin: 0,
  cursor: "pointer",
  color: "var(--text-3)",
  lineHeight: 0,
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
