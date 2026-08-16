import { useState, type CSSProperties, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

import { forgotPasswordRequest } from "../lib/authApi";
import { ApiError } from "../lib/api";

/* The illustrated panel uses the actual reference/orbit-login.jpe artwork
   (not a CSS/SVG recreation) — resolved to a built URL via `new URL(...,
   import.meta.url)` so Vite serves/bundles it without needing an import
   declaration for its non-standard ".jpe" extension. Mirrors Login.tsx and
   Register.tsx so all three auth screens share one illustrated welcome
   panel. */
const orbitLoginImage = new URL("../../reference/orbit-login.jpe", import.meta.url).href;

/* Fixed brand colors for the welcome-panel overlay text and primary
   button — these mirror reference/orbit-login.jpe's pale ivory-blue
   watercolor palette (a Chinese-painting-style pagoda rendered in
   layered indigo and powder blues against cream) and intentionally
   stay literal (not theme tokens) so the auth pages keep their
   identity in both light and dark app appearance settings. Kept in
   sync with Login.tsx/Register.tsx's copies of the same constants. */
const INK = "#2E4066"; // deep indigo — overlay text, primary button
const INK_DEEP = "#1E2C4A"; // darker indigo — button gradient
const LINK_BLUE = "#3D5C99";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Phase 19 Frontend Integration audit fix (Priority 2): present only
  // outside production (see auth.controller.ts's forgotPassword doc
  // comment) — ORBIT has no email infrastructure, so the dev-safe reset
  // flow hands the token back here instead of emailing a link.
  const [devResetToken, setDevResetToken] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      setError("Enter your email to continue.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const result = await forgotPasswordRequest(email.trim());
      setDevResetToken(result.devResetToken ?? null);
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
            only) and the form panel, matching Login.tsx/Register.tsx's
            layout: a centered rounded card with a full-bleed image on the
            left and the form on the right. Below `md` the welcome panel is
            hidden and the form panel becomes the whole card. */}
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
                  Check your email
                </h1>

                {devResetToken ? (
                  <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--text-2)", textAlign: "center" }}>
                    A password reset was started for <strong style={{ color: "var(--text)" }}>{email}</strong>. ORBIT
                    doesn't have email delivery configured yet, so continue below in its place — this stands in for
                    the emailed link in a real deployment.
                  </p>
                ) : (
                  <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--text-2)", textAlign: "center" }}>
                    If <strong style={{ color: "var(--text)" }}>{email}</strong> is registered, we've sent a link to
                    reset your password to that address. It's valid for the next hour.
                  </p>
                )}

                {devResetToken && (
                  <button
                    type="button"
                    className="lift"
                    style={{ ...primaryButtonStyle, marginTop: 30 }}
                    onClick={() => navigate(`/reset-password?token=${encodeURIComponent(devResetToken)}`)}
                  >
                    Continue to reset password
                  </button>
                )}
              </>
            ) : (
              <>
                <h1 style={{ fontSize: 34, fontWeight: 800, color: "var(--text)", margin: 0, textAlign: "center" }}>
                  Forgot password?
                </h1>

                <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--text-2)", textAlign: "center" }}>
                  Enter your email and we'll send you a link to reset your password.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 30, marginTop: 30 }}>
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

                  {error && <span style={{ fontSize: 11.5, color: "#B3564B" }}>{error}</span>}

                  <button type="submit" disabled={submitting} className="lift" style={primaryButtonStyle}>
                    {submitting ? "Sending…" : "Send reset link"}
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
   Login.tsx/Register.tsx.
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
