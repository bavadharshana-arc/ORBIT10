import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { ProgressRing } from "../ui/ProgressRing";
import { StatCardGraphic, type StatCardGraphicVariant } from "./StatCardGraphic";

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
  ring?: number;
  compact?: boolean;
  onClick?: () => void;
  active?: boolean;
  /** Shows a tiny upward-trend arrow before `delta` — for deltas that read as growth (e.g. "+3 this week"), not as a warning (e.g. "6 overdue"). */
  trendUp?: boolean;
  /** Shows a tiny filled dot before `delta` instead of a trend arrow — a quieter "worth noting" marker for deltas that aren't growth (e.g. "6 overdue"). Ignored when `trendUp` is set. */
  deltaDot?: boolean;
  /** A small decorative graphic (trend line / checklist / bar chart / target) anchored to the card's bottom-right corner, behind the real content. Purely optional flair — omit for a plain card. */
  graphic?: StatCardGraphicVariant;
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
  trendUp = false,
  deltaDot = false,
  graphic,
}: StatCardProps) {
  const iconSize = compact ? 32 : 36;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="bg-card border-soft lift fade-in"
      style={{
        position: "relative",
        overflow: "hidden",
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
      {/* Decorative graphic sits behind everything below — the content
          wrapper is itself positioned so it stacks above this regardless
          of DOM order (same trick GreetingCard uses for its orbit svg). */}
      {graphic && <StatCardGraphic variant={graphic} compact={compact} />}

      <div style={{ position: "relative" }}>
        {/* TOP */}
        <div className="flex items-center" style={{ justifyContent: "space-between", marginBottom: compact ? 10 : 14 }}>
          {/* ICON */}
          <div
            style={{
              width: iconSize,
              height: iconSize,
              borderRadius: compact ? 11 : 13,
              background: active ? "var(--blue)" : "var(--blue-tint)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 160ms ease",
            }}
          >
            <Icon size={compact ? 17 : 19} strokeWidth={2} style={{ color: active ? "var(--text)" : "var(--blue-dark)" }} />
          </div>

          {/* PROGRESS */}
          {ring !== undefined && (
            <div
              style={{
                borderRadius: "50%",
                background: "var(--surface-2)",
                padding: 3,
                display: "flex",
              }}
            >
              <ProgressRing value={ring} size={compact ? 34 : 34} stroke={compact ? 3.5 : 3.5} />
            </div>
          )}
        </div>

        {/* VALUE */}
        <div className="font-display" style={{ fontSize: compact ? 23 : 24, fontWeight: 600, lineHeight: 1.1, marginBottom: 4, color: "var(--text)" }}>
          {value}
        </div>

        {/* LABEL */}
        <div className="flex items-center" style={{ gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: compact ? 11.5 : 12.5, color: "var(--text-2)", fontWeight: 500 }}>
            {label}
          </span>
          {delta && (
            <span className="flex items-center" style={{ gap: 4, fontSize: 11, color: "var(--blue-dark)", fontWeight: 700 }}>
              {trendUp && <ArrowUpRight size={12} strokeWidth={2.8} />}
              {!trendUp && deltaDot && (
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--blue-dark)", flexShrink: 0 }} />
              )}
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
      </div>
    </button>
  );
}
