interface OrbitMarkProps {
  size?: number;
}

/** The product's signature crossed-orbit mark. Used as the logo and as a decorative motif. */
export function OrbitMark({ size = 28 }: OrbitMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <ellipse cx="20" cy="20" rx="17" ry="8" stroke="var(--blue-dark)" strokeWidth="1.4" />
      <ellipse
        cx="20"
        cy="20"
        rx="17"
        ry="8"
        stroke="var(--text)"
        strokeWidth="1.4"
        transform="rotate(60 20 20)"
      />
      <circle cx="20" cy="20" r="3.4" fill="var(--text)" />
    </svg>
  );
}