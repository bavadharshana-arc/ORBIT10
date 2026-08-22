import { useState } from "react";
import { Eye, EyeOff, Laptop } from "lucide-react";

import { formatSettingsDate, getCurrentSession, type SecuritySettings } from "../../data/settingsData";
import { changeMyPassword } from "../../lib/userApi";
import { ApiError } from "../../lib/api";
import { Pill } from "../ui/Pill";
import { SavedBadge, SettingsGroup, SettingsGroupHeader, SettingsRow, SettingsSection } from "./shared";
import { inputStyle, settingsPrimaryButtonStyle } from "./styles";
import { useSavedFlash } from "./useSavedFlash";

interface SecuritySectionProps {
  security: SecuritySettings;
  onChange: (security: SecuritySettings) => void;
}

export function SecuritySection({ security, onChange }: SecuritySectionProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [saved, flashSaved] = useSavedFlash();

  async function handleChangePassword() {
    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // Phase 19 Frontend Integration audit fix (Priority 2): a real
      // change, verified server-side against the current password hash
      // — see user.controller.ts's changeMyPassword.
      await changeMyPassword(currentPassword, newPassword);

      onChange({ ...security, passwordUpdatedAt: new Date().toISOString() });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      flashSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update your password. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const passwordInputType = showPasswords ? "text" : "password";
  // Recomputed on every render rather than stored — it's a live fact
  // about the browser this page is running in right now, not a saved
  // preference (see settingsData.ts's getCurrentSession doc comment).
  const currentSession = getCurrentSession();

  return (
    <SettingsSection title="Security" description="Your password, sign-in protection, and where you're signed in.">
      {/* PASSWORD */}
      <div className="flex flex-col" style={{ gap: 8 }}>
        <div className="flex items-center justify-between">
          <SettingsGroupHeader label="Password" />
          <button
            type="button"
            onClick={() => setShowPasswords((current) => !current)}
            aria-pressed={showPasswords}
            className="focus-ring flex items-center"
            style={{ gap: 5, border: "none", background: "transparent", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "var(--text-2)" }}
          >
            {showPasswords ? <EyeOff size={12} /> : <Eye size={12} />}
            {showPasswords ? "Hide" : "Show"} passwords
          </button>
        </div>

        <SettingsGroup>
          <SettingsRow
            label="Current password"
            description={
              security.passwordUpdatedAt
                ? `Last changed ${formatSettingsDate(security.passwordUpdatedAt)}`
                : "Never changed since account creation"
            }
          >
            <input
              type={passwordInputType}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="focus-ring settings-input"
              style={inputStyle}
            />
          </SettingsRow>

          <SettingsRow label="New password" description="At least 8 characters.">
            <input
              type={passwordInputType}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="focus-ring settings-input"
              style={inputStyle}
            />
          </SettingsRow>

          <SettingsRow label="Confirm new password">
            <input
              type={passwordInputType}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="focus-ring settings-input"
              style={inputStyle}
            />
          </SettingsRow>
        </SettingsGroup>

        {error && <span style={{ fontSize: 11, color: "#B3564B" }}>{error}</span>}

        <div className="flex items-center" style={{ gap: 10 }}>
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={submitting}
            className="settings-btn settings-btn-primary focus-ring"
            style={{
              ...settingsPrimaryButtonStyle,
              cursor: submitting ? "default" : "pointer",
              // See ProfileSection.tsx's identical comment: opacity must
              // stay unset at rest, or it permanently overrides the CSS
              // hover rule regardless of hover state.
              ...(submitting ? { opacity: 0.5 } : {}),
            }}
          >
            {submitting ? "Updating…" : "Update password"}
          </button>

          <SavedBadge visible={saved} />
        </div>
      </div>

      {/* TWO-FACTOR AUTHENTICATION */}
      <div className="flex flex-col" style={{ gap: 8 }}>
        <SettingsGroupHeader label="Two-factor authentication" />
        <SettingsGroup>
          <SettingsRow
            label="Authenticator app"
            description="Two-factor authentication isn't available yet — Orbit doesn't have an authenticator-app pairing flow built on the backend. This will unlock once that's added."
          >
            <Pill tone="surface">Disabled</Pill>
          </SettingsRow>
        </SettingsGroup>
      </div>

      {/* ACTIVE SESSIONS */}
      <div className="flex flex-col" style={{ gap: 8 }}>
        <SettingsGroupHeader label="Active sessions" />
        <SettingsGroup>
          <div className="flex items-center justify-between flex-wrap" style={{ gap: 10, padding: "15px 18px" }}>
            <div className="flex items-center" style={{ gap: 10, minWidth: 0 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "var(--surface-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Laptop size={14} color="var(--blue-dark)" />
              </div>

              <div style={{ minWidth: 0 }}>
                <div className="flex items-center" style={{ gap: 7 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 650, color: "var(--text)" }}>{currentSession.device}</span>
                  <Pill tone="surface">This device</Pill>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{currentSession.browser} · Active now</span>
              </div>
            </div>
          </div>
        </SettingsGroup>

        {/*
          Honest, not empty: Orbit's auth is stateless JWT with no
          server-side session/device table, so there is no real data
          source for "other devices signed in" to list — showing one
          (the actual current browser) rather than a fabricated
          multi-device history.
        */}
        <p style={{ margin: 0, fontSize: 11, color: "var(--text-3)" }}>
          Orbit doesn't track sign-ins across other devices yet, so only your current session is shown here.
        </p>
      </div>
    </SettingsSection>
  );
}
