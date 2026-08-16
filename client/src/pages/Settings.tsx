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

      <div style={{ marginBottom: 18 }}>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 560, marginBottom: 6, color: "#20242B" }}>
          Settings
        </h1>

        <p style={{ fontSize: 13.5, color: "#667085", margin: 0 }}>
          Manage your profile, workspace, and account preferences.
        </p>
      </div>

      {/* ======================================================
          MAIN LAYOUT
      ====================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)]" style={{ gap: 18, alignItems: "start" }}>
        {/* TABS */}
        <div
          className="bg-card border-soft flex xl:flex-col"
          style={{ borderRadius: 16, padding: 10, gap: 2, position: "sticky", top: 20, overflowX: "auto" }}
        >
          {visibleSections.map((section) => {
            const active = activeSection === section.key;
            const danger = section.key === "danger";

            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className="nav-item flex items-center"
                style={{
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  background: active ? "#FFFFFF" : "transparent",
                  boxShadow: active ? "0 1px 2px rgba(32,36,43,0.04), 0 8px 20px -10px rgba(32,36,43,0.16)" : "none",
                  color: danger && !active ? "#B3564B" : active ? "#20242B" : "#667085",
                  fontWeight: active ? 600 : 500,
                }}
              >
                <section.icon size={16} strokeWidth={1.8} />
                {section.label}
              </button>
            );
          })}
        </div>

        {/* CONTENT */}
        <div className="flex flex-col" style={{ gap: 18, minWidth: 0 }}>
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
            <SecuritySection security={settings.security} accent={accentHex} onChange={handleSecurityChange} />
          )}

          {activeSection === "danger" && <DangerZoneSection />}
        </div>
      </div>
    </div>
  );
}
