import { useState, type CSSProperties, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";

/* The illustrated panel uses the actual reference/orbit-login.jpe artwork
   (not a CSS/SVG recreation) — resolved to a built URL via `new URL(...,
   import.meta.url)` so Vite serves/bundles it without needing an import
   declaration for its non-standard ".jpe" extension. Mirrors Login.tsx so
   both auth screens share one illustrated welcome panel. */
const orbitLoginImage = new URL("../../reference/orbit-login.jpe", import.meta.url).href;

/* Fixed brand colors for the welcome-panel overlay text and primary
   button — these mirror reference/orbit-login.jpe's pale ivory-blue
   watercolor palette (a Chinese-painting-style pagoda rendered in
   layered indigo and powder blues against cream) and intentionally
   stay literal (not theme tokens) so the auth pages keep their
   identity in both light and dark app appearance settings. Kept in
   sync with Login.tsx's copies of the same constants. */
const INK = "#2E4066"; // deep indigo — overlay text, primary button
const INK_DEEP = "#1E2C4A"; // darker indigo — button gradient
const LINK_BLUE = "#3D5C99";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !email.trim()) {
      setError("Enter your name and email to continue.");
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
      await register(name, email, password);
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
            only) and the form panel, matching Login.tsx's layout: a
            centered rounded card with a full-bleed image on the left and
            the form on the right. Below `md` the welcome panel is hidden
            and the form panel becomes the whole card. */}
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
              Sign up
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 24, marginTop: 34 }}>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Full name"
                aria-label="Full name"
                className="auth-field"
                style={fieldInputStyle}
              />

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                aria-label="Email"
                className="auth-field"
                style={fieldInputStyle}
              />

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password (at least 8 characters)"
                aria-label="Password"
                className="auth-field"
                style={fieldInputStyle}
              />

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
                aria-label="Confirm password"
                className="auth-field"
                style={fieldInputStyle}
              />

              {error && <span style={{ fontSize: 11.5, color: "#B3564B" }}>{error}</span>}

              <button type="submit" disabled={submitting} className="lift" style={primaryButtonStyle}>
                {submitting ? "Creating account…" : "Create account"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: "var(--text-2)" }}>
              Already have an account?{" "}
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
   watercolor pagoda, not themed ones. Kept in sync with Login.tsx.
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
