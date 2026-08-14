import { useState } from "react";
import { Eye, EyeOff, KeyRound, Laptop, LogOut, ShieldCheck, Smartphone } from "lucide-react";

import { formatSettingsDate, type SecuritySettings } from "../../data/settingsData";
import { Pill } from "../ui/Pill";
import { Field, SavedBadge, SectionCard, ToggleRow } from "./shared";
import { inputStyle, primaryButtonStyle, secondaryButtonStyle } from "./styles";
import { useSavedFlash } from "./useSavedFlash";

interface SecuritySectionProps {
  security: SecuritySettings;
  accent: string;
  onChange: (security: SecuritySettings) => void;
}

export function SecuritySection({ security, accent, onChange }: SecuritySectionProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [saved, flashSaved] = useSavedFlash();

  function handleChangePassword() {
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

    onChange({ ...security, passwordUpdatedAt: new Date().toISOString() });

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    flashSaved();
  }

  function handleSignOutSession(id: string) {
    onChange({ ...security, sessions: security.sessions.filter((session) => session.id !== id) });
  }

  function handleSignOutOthers() {
    onChange({ ...security, sessions: security.sessions.filter((session) => session.current) });
  }

  const otherSessionsCount = security.sessions.filter((session) => !session.current).length;
  const passwordInputType = showPasswords ? "text" : "password";

  return (
    <div className="flex flex-col" style={{ gap: 18 }}>
      <SectionCard icon={KeyRound} title="Password" description="Change your password to keep your account secure.">
        <div className="flex flex-col" style={{ gap: 14 }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 11, color: "#98A2B3" }}>
              {security.passwordUpdatedAt
                ? `Last changed ${formatSettingsDate(security.passwordUpdatedAt)}`
                : "Never changed since account creation"}
            </span>

            <button
              type="button"
              onClick={() => setShowPasswords((current) => !current)}
              className="flex items-center"
              style={{ gap: 5, border: "none", background: "transparent", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#667085" }}
            >
              {showPasswords ? <EyeOff size={13} /> : <Eye size={13} />}
              {showPasswords ? "Hide" : "Show"} passwords
            </button>
          </div>

          <Field label="Current password">
            <input
              type={passwordInputType}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              style={inputStyle}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
            <Field label="New password">
              <input
                type={passwordInputType}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="Confirm new password">
              <input
                type={passwordInputType}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          {error && <span style={{ fontSize: 11, color: "#B3564B" }}>{error}</span>}

          <div className="flex items-center" style={{ gap: 10 }}>
            <button type="button" onClick={handleChangePassword} className="lift" style={primaryButtonStyle}>
              Update password
            </button>

            <SavedBadge visible={saved} />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={ShieldCheck} title="Two-factor authentication" description="Add an extra layer of protection at sign in.">
        <div className="flex flex-col" style={{ gap: 12 }}>
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 11.5, color: "#667085" }}>
              {security.twoFactorEnabled
                ? "Your account is protected with an authenticator app."
                : "Require a verification code from your phone when signing in."}
            </span>

            <Pill tone={security.twoFactorEnabled ? "dark" : "surface"}>
              {security.twoFactorEnabled ? "Enabled" : "Disabled"}
            </Pill>
          </div>

          <ToggleRow
            title="Two-factor authentication"
            description="Use an authenticator app to generate sign-in codes."
            checked={security.twoFactorEnabled}
            accent={accent}
            onChange={(value) => onChange({ ...security, twoFactorEnabled: value })}
          />
        </div>
      </SectionCard>

      <SectionCard icon={Laptop} title="Active sessions" description="Devices currently signed in to your account.">
        <div className="flex flex-col" style={{ gap: 8 }}>
          {security.sessions.map((session) => {
            const isMobile = /iPhone|Android|Pixel|Galaxy/i.test(session.device);
            const DeviceIcon = isMobile ? Smartphone : Laptop;

            return (
              <div
                key={session.id}
                className="flex items-center justify-between flex-wrap"
                style={{ gap: 10, padding: "11px 14px", borderRadius: 12, background: "#F7F8FA", border: "1px solid #EEF2F6" }}
              >
                <div className="flex items-center" style={{ gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      background: "#EEF2F6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <DeviceIcon size={14} color="#8EA7BF" />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div className="flex items-center" style={{ gap: 7 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 650, color: "#20242B" }}>{session.device}</span>
                      {session.current && <Pill tone="surface">This device</Pill>}
                    </div>
                    <span style={{ fontSize: 11, color: "#98A2B3" }}>
                      {session.browser} · {session.location} · {session.lastActive}
                    </span>
                  </div>
                </div>

                {!session.current && (
                  <button
                    type="button"
                    onClick={() => handleSignOutSession(session.id)}
                    className="flex items-center"
                    style={{ ...secondaryButtonStyle, gap: 6, padding: "7px 12px" }}
                  >
                    <LogOut size={12} />
                    Sign out
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {otherSessionsCount > 0 && (
          <button type="button" onClick={handleSignOutOthers} style={{ ...secondaryButtonStyle, marginTop: 14 }}>
            Sign out all other sessions ({otherSessionsCount})
          </button>
        )}
      </SectionCard>
    </div>
  );
}
