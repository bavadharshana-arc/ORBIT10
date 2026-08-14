import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleCheck } from "lucide-react";

import { Switch } from "../ui/Switch";
import { labelStyle } from "./styles";

/* ============================================================
   FIELD
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
      {hint && <span style={{ fontSize: 10.5, color: "#98A2B3" }}>{hint}</span>}
    </div>
  );
}

/* ============================================================
   SECTION CARD
============================================================ */

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
        background: danger ? "#FBF2F1" : "#FFFFFF",
        border: danger ? "1px solid #E9CCC6" : "1px solid #E4E8ED",
      }}
    >
      <div className="flex items-center" style={{ gap: 10, marginBottom: 18 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: danger ? "#F2DEDA" : "#EEF2F6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={16} strokeWidth={1.8} color={danger ? "#B3564B" : "#8EA7BF"} />
        </div>

        <div>
          <h2 className="font-display" style={{ fontSize: 15.5, fontWeight: 600, color: "#20242B", margin: 0 }}>
            {title}
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: danger ? "#A66158" : "#98A2B3" }}>{description}</p>
        </div>
      </div>

      {children}
    </div>
  );
}

/* ============================================================
   TOGGLE ROW
============================================================ */

interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  accent?: string;
  onChange: (checked: boolean) => void;
}

export function ToggleRow({ title, description, checked, disabled, accent, onChange }: ToggleRowProps) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        gap: 14,
        padding: "12px 14px",
        borderRadius: 12,
        background: "#F7F8FA",
        border: "1px solid #EEF2F6",
        opacity: disabled ? 0.55 : 1,
        transition: "opacity 160ms ease",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "#20242B" }}>{title}</p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#98A2B3" }}>{description}</p>
      </div>

      <Switch checked={checked} onChange={onChange} disabled={disabled} accent={accent} label={title} />
    </div>
  );
}

/* ============================================================
   SAVED BADGE
============================================================ */

export function SavedBadge({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }

  return (
    <span className="fade-in flex items-center" style={{ gap: 5, fontSize: 11.5, fontWeight: 600, color: "#20242B" }}>
      <CircleCheck size={14} color="#8EA7BF" />
      Saved
    </span>
  );
}
