import { useState, type CSSProperties, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";

import { resetPasswordRequest } from "../lib/authApi";
import { ApiError } from "../lib/api";

/* The illustrated panel uses the actual reference/orbit-login.jpe artwork
   (not a CSS/SVG recreation) — resolved to a built URL via `new URL(...,
   import.meta.url)` so Vite serves/bundles it without needing an import
   declaration for its non-standard ".jpe" extension. Mirrors Login.tsx,
   Register.tsx, and ForgotPassword.tsx so all auth screens share one
   illustrated welcome panel. */
const orbitLoginImage = new URL("../../reference/orbit-login.jpe", import.meta.url).href;

/* Fixed brand colors for the welcome-panel overlay text and primary
   button — these mirror reference/orbit-login.jpe's pale ivory-blue
   watercolor palette (a Chinese-painting-style pagoda rendered in
   layered indigo and powder blues against cream) and intentionally
   stay literal (not theme tokens) so the auth pages keep their
   identity in both light and dark app appearance settings. Kept in
   sync with Login.tsx/Register.tsx/ForgotPassword.tsx's copies of the
   same constants. */
const INK = "#2E4066"; // deep indigo — overlay text, primary button
const INK_DEEP = "#1E2C4A"; // darker indigo — button gradient
const LINK_BLUE = "#3D5C99";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Phase 19 Frontend Integration audit fix (Priority 2): the token
  // ForgotPassword.tsx's dev-safe flow hands back in place of an emailed
  // link (see auth.controller.ts's forgotPassword doc comment).
  const token = searchParams.get("token");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("This reset link is missing its token. Start over from Forgot password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and confirmation don't match.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await resetPasswordRequest(token, password);
      setSubmitted(true);
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
            only) and the form panel, matching Login.tsx/Register.tsx/
            ForgotPassword.tsx's layout: a centered rounded card with a
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
            {submitted ? (
              <>
                <div className="flex items-center justify-center">
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <CheckCircle2 size={24} color={INK} />
                  </div>
                </div>

                <h1 style={{ fontSize: 34, fontWeight: 800, color: "var(--text)", margin: "20px 0 0", textAlign: "center" }}>
                  Password reset
                </h1>

                <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--text-2)", textAlign: "center" }}>
                  Your password has been updated. Sign in to your Orbit workspace with your new password.
                </p>

                <button
                  type="button"
                  className="lift"
                  style={{ ...primaryButtonStyle, marginTop: 30 }}
                  onClick={() => navigate("/login")}
                >
                  Continue to sign in
                </button>
              </>
            ) : (
              <>
                <h1 style={{ fontSize: 34, fontWeight: 800, color: "var(--text)", margin: 0, textAlign: "center" }}>
                  Reset your password
                </h1>

                <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--text-2)", textAlign: "center" }}>
                  Choose a new password for your Orbit workspace.
                </p>

                {!token && (
                  <p style={{ margin: "14px 0 0", fontSize: 12, color: "#B3564B", textAlign: "center" }}>
                    This page needs a reset link from Forgot password to work — go back and request one.
                  </p>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 30, marginTop: 30 }}>
                  <div style={{ position: "relative" }}>
                    <input
                      autoFocus
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="New password (at least 8 characters)"
                      aria-label="New password"
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
                  </div>

                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirm password"
                      aria-label="Confirm password"
                      className="auth-field"
                      style={passwordFieldInputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      style={passwordToggleButtonStyle}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {error && <span style={{ fontSize: 11.5, color: "#B3564B" }}>{error}</span>}

                  <button type="submit" disabled={submitting || !token} className="lift" style={primaryButtonStyle}>
                    {submitting ? "Resetting…" : "Reset password"}
                  </button>
                </form>
              </>
            )}

            <p style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: "var(--text-2)" }}>
              Remembered your password?{" "}
              <Link to="/login" style={{ color: LINK_BLUE, fontWeight: 600, textDecoration: "none" }}>
                Sign in
              </Link>
            </p>
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
   watercolor pagoda, not themed ones. Kept in sync with
   Login.tsx/Register.tsx/ForgotPassword.tsx.
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
   button. */
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
