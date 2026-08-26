import { Menu } from "lucide-react";
import { NotificationBell } from "../notifications/NotificationBell";
import { ProfileMenu } from "./ProfileMenu";

interface TopBarProps {
  /** Opens the sidebar drawer. Only surfaced below `lg`, where the sidebar is off-canvas. */
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <div className="fade-in-static mb-4 flex flex-wrap items-center justify-between gap-3 lg:mb-6 lg:justify-end">
      <button
        type="button"
        aria-label="Open menu"
        onClick={onMenuClick}
        className="bg-card border-soft lift flex lg:hidden"
        style={{
          // Only ever rendered below `lg` — bumped to the ~44px
          // touch-target guideline with no desktop appearance change.
          width: 44,
          height: 44,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #E4E8ED",
          cursor: "pointer",
        }}
      >
        <Menu size={18} strokeWidth={1.8} color="#20242B" />
      </button>

      <div className="flex items-center" style={{ gap: 12 }}>
        <NotificationBell />
        <ProfileMenu />
      </div>
    </div>
  );
}