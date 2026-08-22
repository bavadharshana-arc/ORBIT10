import type { CSSProperties } from "react";

/* ============================================================
   CELESTIAL MARKS

   A small, shared vocabulary of hand-drawn-feeling decorative marks —
   solid dots, hollow rings, thin sharp sparkles (including elongated
   "spike" variants), and thin orbit-arc fragments — used to scatter a
   minimal, editorial constellation of detail around the Dashboard
   (the "Good evening" hero, the Weekly Activity empty state).

   Deliberately thinner and sharper than a generic filled-diamond "UI
   sparkle" icon (SPARKLE_PATH uses curved, concave sides rather than
   straight edges), and meant to be used sparingly — a few varied
   marks with real empty space between them, not a dense pattern.
   Colors are left to callers, but every call site should stick to the
   existing --blue / --blue-dark / --text tokens (or literal white for
   the light-on-blue Weekly Activity empty state) — no new palette.
============================================================ */

/** A slim 4-point star, centered at (12,12) in its own 24×24 box so callers can position/scale/rotate it via a single transform. */
export const SPARKLE_PATH =
  "M12 1 C12.8 7 14 10 20 12 C14 14 12.8 17 12 23 C11.2 17 10 14 4 12 C10 10 11.2 7 12 1 Z";

interface MarkProps {
  style?: CSSProperties;
  size?: number;
  color?: string;
  opacity?: number;
}

/** A tiny solid dot. Absolutely positioned — the caller supplies `left`/`top` (or similar) via `style` against a `position: relative` ancestor. */
export function TinyDot({ style, size = 3, color = "var(--blue-dark)", opacity = 0.6 }: MarkProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        opacity,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}

interface RingProps extends MarkProps {
  strokeWidth?: number;
}

/** A tiny hollow circle. Absolutely positioned the same way as TinyDot. */
export function TinyRing({ style, size = 7, color = "var(--blue)", opacity = 0.5, strokeWidth = 1 }: RingProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ position: "absolute", opacity, pointerEvents: "none", ...style }}
    >
      <circle cx="12" cy="12" r={12 - strokeWidth} fill="none" stroke={color} strokeWidth={strokeWidth} />
    </svg>
  );
}

interface SparkleProps extends MarkProps {
  /** Non-uniform stretch for the elongated vertical/horizontal "spike" variant — both default to 1 for a regular 4-point star. */
  elongateX?: number;
  elongateY?: number;
  rotate?: number;
  stroke?: string;
  strokeWidth?: number;
}

/** A thin, sharp 4-point sparkle. Absolutely positioned the same way as TinyDot; stretch `elongateX`/`elongateY` for the spike variant. */
export function TinySparkle({
  style,
  size = 10,
  color = "var(--blue-dark)",
  opacity = 0.65,
  elongateX = 1,
  elongateY = 1,
  rotate = 0,
  stroke,
  strokeWidth = 0.6,
}: SparkleProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ position: "absolute", opacity, pointerEvents: "none", ...style }}
    >
      <g transform={`translate(12,12) rotate(${rotate}) scale(${elongateX},${elongateY}) translate(-12,-12)`}>
        <path d={SPARKLE_PATH} fill={color} stroke={stroke} strokeWidth={stroke ? strokeWidth : 0} strokeLinejoin="round" />
      </g>
    </svg>
  );
}

interface ArcProps extends MarkProps {
  strokeWidth?: number;
  width?: number;
  height?: number;
}

/** A very thin curved orbit-line fragment — a short arc, not a full ellipse. Absolutely positioned the same way as TinyDot. */
export function OrbitArc({ style, width = 46, height = 18, color = "var(--blue)", opacity = 0.35, strokeWidth = 0.8 }: ArcProps) {
  return (
    <svg
      aria-hidden="true"
      width={width}
      height={height}
      viewBox="0 0 46 18"
      style={{ position: "absolute", opacity, pointerEvents: "none", ...style }}
    >
      <path d="M1 15 C 10 2, 36 2, 45 15" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

interface SparkleGlyphProps {
  x: number;
  y: number;
  scale?: number;
  elongateX?: number;
  elongateY?: number;
  rotate?: number;
  color?: string;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
}

/** Same slim star as TinySparkle, but as a bare `<g>` for embedding inside an existing `<svg>` (e.g. GreetingCard's orbit-ring canvas) via a plain SVG transform instead of TinySparkle's absolute-`style` positioning. */
export function SparkleGlyph({
  x,
  y,
  scale = 1,
  elongateX = 1,
  elongateY = 1,
  rotate = 0,
  color = "var(--blue-dark)",
  opacity = 0.65,
  stroke,
  strokeWidth = 0.6,
}: SparkleGlyphProps) {
  return (
    <g transform={`translate(${x},${y}) rotate(${rotate}) scale(${scale * elongateX},${scale * elongateY}) translate(-12,-12)`}>
      <path d={SPARKLE_PATH} fill={color} stroke={stroke} strokeWidth={stroke ? strokeWidth : 0} strokeLinejoin="round" opacity={opacity} />
    </g>
  );
}
