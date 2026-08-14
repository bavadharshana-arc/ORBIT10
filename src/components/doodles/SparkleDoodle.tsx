interface SparkleDoodleProps {
  size?: number;
  color?: string;
}

/** A thin, hand-drawn-feeling sparkle mark. Used next to AI-related copy. */
export function SparkleDoodle({ size = 18, color = "#8EA7BF" }: SparkleDoodleProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z"
        stroke={color}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}