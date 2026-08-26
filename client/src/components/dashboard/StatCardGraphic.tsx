import type { ReactElement } from "react";

export type StatCardGraphicVariant = "trend" | "checklist" | "bars" | "target";

interface StatCardGraphicProps {
  variant: StatCardGraphicVariant;
  compact?: boolean;
}

/* ============================================================
   STAT CARD GRAPHIC

   Small decorative line-art anchored to a StatCard's bottom-right
   corner — one per dashboard metric (upward trend line, checklist/
   document, bar chart, target). Composition, scale, and right-side
   placement are modeled on a reference mock the product team shared
   (reference/metric-reference.png); the reference's purple/green/
   orange/pink per-card colors were intentionally dropped in favor of
   the existing Orbit --blue/--blue-dark tokens so every card stays on
   the same monochrome-blue system as the rest of the dashboard.

   Purely decorative: pointer-events are disabled, and StatCard is
   responsible for rendering these behind the card's real content (see
   the position:relative content wrapper there) so overlapping text
   always stays legible on top.
============================================================ */

const SPARKLE_PATH = "M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z";

function TrendGraphic() {
  return (
    <svg viewBox="0 0 56 56" width="100%" height="100%" fill="none">
      <path
        d="M4 42 C 14 44, 18 32, 26 36 S 40 22, 50 12"
        stroke="var(--blue)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.4"
      />
      <polyline
        points="6,40 16,31 24,34 34,17 44,21 50,8"
        stroke="var(--blue-dark)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />
      <circle cx="50" cy="8" r="2.4" fill="var(--blue-dark)" opacity="0.85" />
      <g transform="translate(36,4) scale(0.34) translate(-12,-11)">
        <path d={SPARKLE_PATH} fill="var(--blue)" opacity="0.7" />
      </g>
    </svg>
  );
}

function ChecklistGraphic() {
  return (
    <svg viewBox="0 0 56 56" width="100%" height="100%" fill="none" style={{ transform: "rotate(6deg)" }}>
      <rect x="21" y="1" width="14" height="7" rx="2" stroke="var(--blue-dark)" strokeWidth="1.5" opacity="0.6" />
      <rect x="13" y="5" width="30" height="40" rx="4" stroke="var(--blue-dark)" strokeWidth="1.6" opacity="0.55" />
      <line x1="19" y1="21" x2="37" y2="21" stroke="var(--blue-dark)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="19" y1="28" x2="37" y2="28" stroke="var(--blue-dark)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="19" y1="35" x2="30" y2="35" stroke="var(--blue-dark)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M17 29.5 L20 32.5 L26 25.5" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

function BarsGraphic() {
  return (
    <svg viewBox="0 0 56 56" width="100%" height="100%" fill="none">
      <rect x="4" y="34" width="7" height="16" rx="2" fill="var(--blue)" opacity="0.4" />
      <rect x="16" y="26" width="7" height="24" rx="2" fill="var(--blue)" opacity="0.5" />
      <rect x="28" y="16" width="7" height="34" rx="2" fill="var(--blue-dark)" opacity="0.65" />
      <rect x="40" y="6" width="7" height="44" rx="2" fill="var(--blue-dark)" opacity="0.8" />
      <g transform="translate(45,0) scale(0.3) translate(-12,-11)">
        <path d={SPARKLE_PATH} fill="var(--blue)" opacity="0.65" />
      </g>
    </svg>
  );
}

function TargetGraphic() {
  return (
    <svg viewBox="0 0 56 56" width="100%" height="100%" fill="none">
      <circle cx="26" cy="30" r="22" stroke="var(--blue)" strokeWidth="1.6" opacity="0.4" />
      <circle cx="26" cy="30" r="14" stroke="var(--blue-dark)" strokeWidth="1.6" opacity="0.55" />
      <circle cx="26" cy="30" r="5" fill="var(--blue-dark)" opacity="0.7" />
      <path d="M43 12 L31 24" stroke="var(--blue-dark)" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
      <path d="M43 12 L38 13.5 L41.5 17 Z" fill="var(--blue-dark)" opacity="0.8" />
    </svg>
  );
}

const GRAPHICS: Record<StatCardGraphicVariant, () => ReactElement> = {
  trend: TrendGraphic,
  checklist: ChecklistGraphic,
  bars: BarsGraphic,
  target: TargetGraphic,
};

/** A small decorative graphic anchored to a card's bottom-right corner. Not interactive — sits visually behind the card's real content. */
export function StatCardGraphic({ variant, compact = false }: StatCardGraphicProps) {
  const Graphic = GRAPHICS[variant];
  const size = compact ? 42 : 52;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        right: compact ? 6 : 8,
        bottom: compact ? 6 : 8,
        width: size,
        height: size,
        pointerEvents: "none",
      }}
    >
      <Graphic />
    </div>
  );
}
