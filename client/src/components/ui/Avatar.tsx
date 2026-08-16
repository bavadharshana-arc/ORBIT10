interface AvatarProps {
  initials: string;
  bg?: string;
  fg?: string;
  size?: number;
  ring?: boolean;
}

/**
 * A circular initials avatar.
 * `ring` adds a page-colored ring,
 * used when stacking avatars.
 */
export function Avatar({
  initials,
  bg = "#E9EDF2",
  fg = "#20242B",
  size = 32,
  ring = false,
}: AvatarProps) {
  return (
    <div
      className="font-display"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.36,
        fontWeight: 560,
        boxShadow: ring
          ? "0 0 0 2.5px #F7F8FA"
          : "none",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}