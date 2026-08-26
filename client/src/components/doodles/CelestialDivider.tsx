import { useId } from "react";

interface CelestialDividerProps {
 
  className?: string;
  color?: string;
  opacity?: number;
  /** Mirrors the line horizontally (its solid end moves from right to left) — pass this for the copy sitting on the right of whatever it's flanking, so both copies fade outward, away from the center, rather than in the same direction. */
  flip?: boolean;
}

/** A single gentle, hand-drawn-feeling wave — not a symmetric arch, so it reads as "slightly organic" rather than a bowl/crescent shape. */
const CELESTIAL_DIVIDER_PATH = "M2 5 C 20 2, 40 7, 62 4.5 C 76 3, 88 5.5, 96 4";

/**
 * A thin, softly-faded celestial line — used flanking a small badge/pill
 * (e.g. the greeting hero's date pill) rather than under a headline, which
 * is SquiggleUnderline's job. Solid at one end, fading to nothing at the
 * other (via its own gradient) so it reads as "extending outward into
 * nothing" instead of a hard-edged `<hr>`-style rule.
 */
export function CelestialDivider({ className, color = "var(--blue-dark)", opacity = 0.6, flip = false }: CelestialDividerProps) {
  const gradientId = useId();

  return (
    <svg
      aria-hidden="true"
      className={className}
      height="8"
      viewBox="0 0 96 8"
      preserveAspectRatio="none"
      style={{ flexShrink: 0, transform: flip ? "scaleX(-1)" : undefined, pointerEvents: "none" }}
    >
      <defs>
        {/* Transparent at the far/outer end (x=0%), full opacity at the
            end that sits flush against the pill (x=100%) — flip mirrors
            the whole line, so this same gradient still fades outward. */}
        <linearGradient id={gradientId} x1="0%" x2="100%" y1="0" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="100%" stopColor={color} stopOpacity={opacity} />
        </linearGradient>
      </defs>
      <path d={CELESTIAL_DIVIDER_PATH} fill="none" stroke={`url(#${gradientId})`} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
