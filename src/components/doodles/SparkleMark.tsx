interface SparkleMarkProps {
  size?: number;
}

/**
 * Minimal circular sparkle logo mark, matching the provided reference:
 * a thin ring with two opposite tapering "comet trail" arcs, thin
 * cross rays running through the center, a compact solid 4-point
 * sparkle at the middle, and a small square marker riding the rim.
 * Monochrome by design (single color throughout).
 */
export function SparkleMark({ size = 28 }: SparkleMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="sparkleMarkArcA" x1="2.47" y1="17.5" x2="6.5" y2="2.47" gradientUnits="userSpaceOnUse">
          <stop offset="0%" style={{ stopColor: "var(--text)" }} stopOpacity="0" />
          <stop offset="50%" style={{ stopColor: "var(--text)" }} stopOpacity="0.9" />
          <stop offset="100%" style={{ stopColor: "var(--text)" }} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sparkleMarkArcB" x1="21.53" y1="6.5" x2="17.5" y2="21.53" gradientUnits="userSpaceOnUse">
          <stop offset="0%" style={{ stopColor: "var(--text)" }} stopOpacity="0" />
          <stop offset="50%" style={{ stopColor: "var(--text)" }} stopOpacity="0.9" />
          <stop offset="100%" style={{ stopColor: "var(--text)" }} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Thin base ring */}
      <circle cx="12" cy="12" r="11" style={{ stroke: "var(--text)" }} strokeWidth="1.1" />

      {/* Two opposite tapering trail arcs, echoing an orbit path */}
      <path d="M2.47 17.5 A11 11 0 0 1 6.5 2.47" stroke="url(#sparkleMarkArcA)" strokeWidth="2.3" strokeLinecap="round" fill="none" />
      <path d="M21.53 6.5 A11 11 0 0 1 17.5 21.53" stroke="url(#sparkleMarkArcB)" strokeWidth="2.3" strokeLinecap="round" fill="none" />

      {/* Thin cross rays through the center */}
      <line x1="12" y1="2.5" x2="12" y2="21.5" style={{ stroke: "var(--text)" }} strokeWidth="0.7" opacity="0.8" />
      <line x1="2.5" y1="12" x2="21.5" y2="12" style={{ stroke: "var(--text)" }} strokeWidth="0.7" opacity="0.8" />

      {/* Compact solid sparkle at center */}
      <path
        d="M12 7.7 L12.92 11.08 L16.3 12 L12.92 12.92 L12 16.3 L11.08 12.92 L7.7 12 L11.08 11.08 Z"
        style={{ fill: "var(--text)" }}
      />

      {/* Small square marker on the rim */}
      <rect x="15.65" y="1.03" width="2" height="2" rx="0.3" style={{ fill: "var(--text)" }} />
    </svg>
  );
}
