import type { ReactNode } from "react";
import type { PillTone } from "../../types/dashboard";

interface PillProps {
  children: ReactNode;
  tone?: PillTone;
}

const TONES: Record<
  PillTone,
  {
    background: string;
    color: string;
  }
> = {
  surface: {
    background: "var(--surface-2)",
    color: "var(--text-2)",
  },

  blue: {
    background: "var(--blue)",
    color: "var(--text)",
  },

  dark: {
    background: "var(--text)",
    color: "var(--surface)",
  },
};

/**
 * A small rounded label/badge,
 * e.g. project tags and date chips.
 */
export function Pill({
  children,
  tone = "surface",
}: PillProps) {
  const toneStyle = TONES[tone];

  return (
    <span
      className="inline-flex items-center"
      style={{
        ...toneStyle,
        fontSize: 12,
        fontWeight: 600,
        padding: "5px 12px",
        borderRadius: 999,
        letterSpacing: 0.2,
      }}
    >
      {children}
    </span>
  );
}