import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleCheck } from "lucide-react";

import { labelStyle } from "./styles";

/* ============================================================
   FIELD / SECTION CARD / SAVED BADGE

   Unchanged from before this pass — ProjectSettingsTab.tsx (Projects
   page) also imports Field and SectionCard, so their markup/styling
   stays exactly as it was rather than picking up the premium-refresh
   pass below. Settings pages now use SettingsSection/SettingsGroup/
   SettingsRow instead (further down this file) for everything except
   Danger Zone, which intentionally keeps SectionCard's boxed, tone=
   "danger" look — the one section that's still meant to read as a
   visually distinct, isolated block.
============================================================ */

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col" style={{ gap: 5 }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 10.5, color: "var(--text-3)" }}>{hint}</span>}
    </div>
  );
}

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
  tone?: "default" | "danger";
}

export function SectionCard({ icon: Icon, title, description, children, tone = "default" }: SectionCardProps) {
  const danger = tone === "danger";

  return (
    <div
      className="fade-in"
      style={{
        borderRadius: 16,
        padding: 22,
        background: danger ? "#FBF2F1" : "var(--card)",
        border: danger ? "1px solid #E9CCC6" : "1px solid var(--border)",
      }}
    >
      <div className="flex items-center" style={{ gap: 10, marginBottom: 18 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: danger ? "#F2DEDA" : "var(--surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={16} strokeWidth={1.8} color={danger ? "#B3564B" : "var(--blue-dark)"} />
        </div>

        <div>
          <h2 className="font-display" style={{ fontSize: 15.5, fontWeight: 600, color: "var(--text)", margin: 0 }}>
            {title}
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: danger ? "#A66158" : "var(--text-3)" }}>{description}</p>
        </div>
      </div>

      {children}
    </div>
  );
}

export function SavedBadge({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }

  return (
    <span className="fade-in flex items-center" style={{ gap: 5, fontSize: 11.5, fontWeight: 600, color: "var(--text)" }}>
      <CircleCheck size={14} color="var(--blue-dark)" />
      Saved
    </span>
  );
}

/* ============================================================
   SETTINGS SECTION / GROUP / ROW

   The premium-SaaS layout vocabulary the rest of Settings is built
   from — a bare typographic section header (no card), an optional
   subtly-bordered group beneath it, and label-left/control-right rows
   inside that group separated by hairline dividers (.settings-group >
   .settings-row + .settings-row in globals.css). Settings-only: not
   imported anywhere outside src/components/settings and
   src/pages/Settings.tsx.
============================================================ */

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** A page-level heading (no box) — "Profile", "Workspace", etc. — followed by its content. */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="fade-in-static flex flex-col" style={{ gap: 18 }}>
      <div>
        <h2 className="font-display" style={{ fontSize: 19, fontWeight: 600, color: "var(--text)", margin: 0 }}>
          {title}
        </h2>
        {description && (
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-3)", maxWidth: 520, lineHeight: 1.5 }}>
            {description}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}

interface SettingsGroupHeaderProps {
  label: string;
}

/** A small uppercase eyebrow label above a group — "Workspace identity", "Regional preferences", "Email", "Push". Optional; a group can stand alone under its SettingsSection heading. */
export function SettingsGroupHeader({ label }: SettingsGroupHeaderProps) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: 10.5,
        fontWeight: 700,
        color: "var(--text-3)",
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      {label}
    </p>
  );
}

/** The subtle bordered container that holds a set of SettingsRows, hairline-divided. */
export function SettingsGroup({ children }: { children: ReactNode }) {
  return (
    <div
      className="settings-group"
      style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--card)", overflow: "hidden" }}
    >
      {children}
    </div>
  );
}

interface SettingsRowProps {
  label: string;
  description?: string;
  children: ReactNode;
  /** Renders the control full-width below the label instead of beside it — for textareas, multi-input groups, and other controls too wide to sit inline. */
  stack?: boolean;
}

/** One label-left/control-right row inside a SettingsGroup. */
export function SettingsRow({ label, description, children, stack }: SettingsRowProps) {
  return (
    <div className="settings-row flex items-center justify-between flex-wrap" style={{ gap: 14, padding: "15px 18px" }}>
      <div style={{ minWidth: 200, flex: stack ? "1 1 100%" : "1 1 220px" }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{label}</p>
        {description && <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--text-3)" }}>{description}</p>}
      </div>

      <div
        className="flex items-center"
        style={{
          flex: stack ? "1 1 100%" : "0 1 300px",
          minWidth: stack ? "100%" : 220,
          maxWidth: stack ? "100%" : 320,
          justifyContent: stack ? "flex-start" : "flex-end",
        }}
      >
        {children}
      </div>
    </div>
  );
}
