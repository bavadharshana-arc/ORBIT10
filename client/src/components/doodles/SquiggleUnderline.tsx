interface SquiggleUnderlineProps {
  width?: number;
}

/** A hand-drawn accent line, used under headline text. */
export function SquiggleUnderline({ width = 92 }: SquiggleUnderlineProps) {
  return (
    <svg width={width} height="10" viewBox="0 0 92 10" preserveAspectRatio="none" fill="none">
      <path
        d="M2 6.5C10 2.5 16 2.5 24 6.5C32 10.5 38 2.5 46 4.5C54 6.5 60 9 68 5.5C76 2 82 3.5 90 6.5"
        stroke="var(--blue)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}