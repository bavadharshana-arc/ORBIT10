import type { LucideIcon } from "lucide-react";
import { ProgressRing } from "../ui/ProgressRing";

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
  ring?: number;
  compact?: boolean;
  onClick?: () => void;
  active?: boolean;
}

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  ring,
  compact,
  onClick,
  active = false,
}: StatCardProps) {
  const iconSize = compact ? 30 : 32;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="bg-card border-soft lift fade-in"
      style={{
        borderRadius: compact ? 16 : 18,
        padding: compact ? 14 : 16,
        width: "100%",
        textAlign: "left",
        border: active ? "1px solid var(--blue-dark)" : "1px solid var(--border)",
        background: active ? "var(--surface)" : "var(--card)",
        cursor: onClick ? "pointer" : "default",
        transition: "all 160ms ease",
        boxShadow: active ? "0 0 0 3px rgba(142,167,191,0.12)" : "0 2px 8px rgba(32,36,43,0.04)",
      }}
    >
      {/* TOP */}
      <div className="flex items-center" style={{ justifyContent: "space-between", marginBottom: compact ? 10 : 14 }}>
        {/* ICON */}
        <div
          style={{
            width: iconSize,
            height: iconSize,
            borderRadius: compact ? 9 : 10,
            background: active ? "var(--blue)" : "var(--surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 160ms ease",
          }}
        >
          <Icon size={compact ? 15 : 16} strokeWidth={1.8} style={{ color: active ? "var(--text)" : "var(--blue-dark)" }} />
        </div>

        {/* PROGRESS */}
        {ring !== undefined && <ProgressRing value={ring} size={compact ? 36 : 36} stroke={compact ? 3.5 : 3.5} />}
      </div>

      {/* VALUE */}
      <div className="font-display" style={{ fontSize: compact ? 23 : 24, fontWeight: 600, lineHeight: 1.1, marginBottom: 4, color: "var(--text)" }}>
        {value}
      </div>

      {/* LABEL */}
      <div className="flex items-center" style={{ gap: 6 }}>
        <span style={{ fontSize: compact ? 11.5 : 12.5, color: "var(--text-2)", fontWeight: 500 }}>
          {label}
        </span>
        {delta && (
          <span style={{ fontSize: 10.5, color: "var(--blue-dark)", fontWeight: 700 }}>
            {delta}
          </span>
        )}
      </div>

      {/* CLICK HINT */}
      {onClick && (
        <div style={{ marginTop: 8, fontSize: 9.5, color: "var(--text-3)" }}>
          Click to filter
        </div>
      )}
    </button>
  );
}
