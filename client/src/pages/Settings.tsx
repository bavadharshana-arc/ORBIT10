import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Bell, Building2, Palette, ShieldCheck, TriangleAlert, User } from "lucide-react";

import {
  applyAppearance,
  loadSettings,
  saveSettings,
  ACCENT_HEX,
  type AppearanceSettings,
  type NotificationSettings,
  type OrbitSettings,
  type SecuritySettings,
} from "../data/settingsData";

import { ProfileSection } from "../components/settings/ProfileSection";
import { WorkspaceSection } from "../components/settings/WorkspaceSection";
import { NotificationsSection } from "../components/settings/NotificationsSection";
import { AppearanceSection } from "../components/settings/AppearanceSection";
import { SecuritySection } from "../components/settings/SecuritySection";
import { DangerZoneSection } from "../components/settings/DangerZoneSection";
import { useWorkspaceRole, isWorkspaceOwner } from "../hooks/useWorkspaceRole";

/* ============================================================
   TABS
============================================================ */

type SectionKey = "profile" | "workspace" | "notifications" | "appearance" | "security" | "danger";

const SECTIONS: { key: SectionKey; label: string; icon: LucideIcon }[] = [
  { key: "profile", label: "Profile", icon: User },
  { key: "workspace", label: "Workspace", icon: Building2 },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "appearance", label: "Appearance", icon: Palette },
  { key: "security", label: "Security", icon: ShieldCheck },
  { key: "danger", label: "Danger Zone", icon: TriangleAlert },
];

/* ============================================================
   SETTINGS PAGE
============================================================ */

export default function Settings() {
  const [settings, setSettings] = useState<OrbitSettings>(loadSettings);
  const [activeSection, setActiveSection] = useState<SectionKey>("profile");

  const accentHex = ACCENT_HEX[settings.appearance.accent];

  // Danger Zone wipes every member's data, not just the acting user's own
  // — Owner only (Stage 6: real WorkspaceRole, matching
  // DangerZoneSection.tsx's own gate exactly). Hidden from the tab list
  // entirely (rather than shown with an empty panel) since every action
  // inside it is gated the same way, matching ProjectSettingsTab's
  // Lifecycle/Danger Zone sections.
  const workspaceRole = useWorkspaceRole();
  const canManageDanger = isWorkspaceOwner(workspaceRole);
  const visibleSections = useMemo(
    () => (canManageDanger ? SECTIONS : SECTIONS.filter((section) => section.key !== "danger")),
    [canManageDanger]
  );

  function persist(next: OrbitSettings) {
    setSettings(next);
    saveSettings(next);
  }

  function handleNotificationsChange(notifications: NotificationSettings) {
    persist({ ...settings, notifications });
  }

  function handleAppearanceChange(appearance: AppearanceSettings) {
    persist({ ...settings, appearance });
    applyAppearance(appearance);
  }

  function handleSecurityChange(security: SecuritySettings) {
    persist({ ...settings, security });
  }

  return (
    <div className="fade-in" style={{ width: "100%" }}>
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div style={{ marginBottom: 30 }}>
        <h1 className="font-display" style={{ fontSize: 27, fontWeight: 560, marginBottom: 6, color: "var(--text)" }}>
          Settings
        </h1>

        <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
          Manage your profile, workspace, and account preferences.
        </p>
      </div>

      {/* ======================================================
          MAIN LAYOUT
      ====================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-[208px_minmax(0,1fr)]" style={{ gap: 28, alignItems: "start" }}>
        {/* TABS */}
        <div
          className="flex xl:flex-col"
          style={{ gap: 2, position: "sticky", top: 20, overflowX: "auto" }}
        >
          {visibleSections.map((section) => {
            const active = activeSection === section.key;
            const danger = section.key === "danger";

            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                aria-current={active ? "page" : undefined}
                className="nav-item focus-ring flex items-center"
                style={{
                  gap: 9,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 12.5,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  background: active ? "var(--surface-2)" : "transparent",
                  color: danger && !active ? "#B3564B" : active ? "var(--text)" : "var(--text-3)",
                  fontWeight: active ? 600 : 500,
                }}
              >
                <section.icon size={14} strokeWidth={1.8} />
                {section.label}
              </button>
            );
          })}
        </div>

        {/* CONTENT */}
        <div className="flex flex-col" style={{ gap: 40, minWidth: 0 }}>
          {activeSection === "profile" && <ProfileSection />}

          {activeSection === "workspace" && <WorkspaceSection />}

          {activeSection === "notifications" && (
            <NotificationsSection
              notifications={settings.notifications}
              accent={accentHex}
              onChange={handleNotificationsChange}
            />
          )}

          {activeSection === "appearance" && (
            <AppearanceSection appearance={settings.appearance} onChange={handleAppearanceChange} />
          )}

          {activeSection === "security" && (
            <SecuritySection security={settings.security} onChange={handleSecurityChange} />
          )}

          {activeSection === "danger" && <DangerZoneSection />}
        </div>
      </div>
    </div>
  );
}
