export function OrbitAnimation() {
  return (
    <div className="relative flex h-40 w-40 items-center justify-center">

      {/* rotating ellipse rings */}
      <div className="absolute animate-spin animation-duration-[10s]">
        <svg
          width="140"
          height="140"
          viewBox="0 0 40 40"
          fill="none"
        >
          <ellipse
            cx="20"
            cy="20"
            rx="17"
            ry="8"
            stroke="var(--blue-dark)"
            strokeWidth="1.2"
          />

          <ellipse
            cx="20"
            cy="20"
            rx="17"
            ry="8"
            stroke="var(--text)"
            strokeWidth="1.2"
            transform="rotate(60 20 20)"
          />
        </svg>
      </div>


      {/* center dot */}
      <div className="absolute h-3 w-3 rounded-full bg-[var(--text)]" />

    </div>
  );
}