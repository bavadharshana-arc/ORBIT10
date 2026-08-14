import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, User, Settings as SettingsIcon, LogOut } from "lucide-react";

import { Avatar } from "../ui/Avatar";
import { useAuth } from "../../context/AuthContext";

interface PanelPosition {
  top: number;
  right: number;
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? "Coming soon" : undefined}
      className={disabled ? "flex items-center" : "nav-item flex items-center"}
      style={{
        width: "100%",
        gap: 9,
        padding: "9px 10px",
        borderRadius: 9,
        border: "none",
        background: "transparent",
        color: disabled ? "var(--text-3)" : "var(--text-2)",
        fontSize: 12.5,
        fontWeight: 500,
        cursor: disabled ? "default" : "pointer",
        textAlign: "left",
      }}
    >
      <Icon size={14} strokeWidth={1.8} />
      {label}
    </button>
  );
}

/**
 * Replaces the old static avatar/name row in TopBar — same trigger
 * markup and size, now wired to a working dropdown instead of being
 * a purely decorative div.
 *
 * Positioned the same way as NotificationBell (portal to
 * document.body, anchored to the trigger's own bounding rect) rather
 * than as an absolutely-positioned child like ProjectActionsMenu/
 * ProjectAddMemberMenu do it — this trigger lives in that same
 * TopBar and faces the identical stacking-context problem described
 * over there, so it needs the same fix.
 */
// Fallback shown when no one is signed in yet (e.g. a route visited
// directly without going through Login/Register) — matches the mock
// Owner identity AuthContext's login() signs in, so the trigger keeps
// its previous appearance rather than rendering blank.
const GUEST_NAME = "Maya Chen";
const GUEST_INITIALS = "MC";
const GUEST_ROLE = "Owner";

export function ProfileMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const displayName = user?.name ?? GUEST_NAME;
  const displayInitials = user?.initials ?? GUEST_INITIALS;
  const displayRole = user?.role ?? GUEST_ROLE;
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function updatePosition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ top: rect.bottom + 10, right: window.innerWidth - rect.right });
  }

  function toggleOpen() {
    if (!isOpen) updatePosition();
    setIsOpen((current) => !current);
  }

  function close() {
    setIsOpen(false);
  }

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Profile menu"
        onClick={toggleOpen}
        className="bg-card border-soft lift"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 14px 6px 6px",
          borderRadius: 16,
          border: "1px solid #E4E8ED",
          cursor: "pointer",
        }}
      >
        <Avatar initials={displayInitials} bg="#AFC5DA" size={32} />
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{displayName}</div>
        </div>
        <ChevronDown size={14} color="#98A2B3" />
      </button>

      {isOpen &&
        position &&
        createPortal(
          <>
            <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 999 }} />
            <div
              role="menu"
              className="bg-card border-soft shadow-float-lg fade-in-static"
              style={{
                position: "fixed",
                top: position.top,
                right: position.right,
                width: 200,
                borderRadius: 16,
                padding: 6,
                zIndex: 1000,
              }}
            >
              <div style={{ padding: "8px 10px 10px" }}>
                <div style={{ fontSize: 13, fontWeight: 650, color: "var(--text)" }}>{displayName}</div>
                <div className="text-ink-3" style={{ fontSize: 11 }}>
                  {displayRole}
                </div>
              </div>

              <div className="border-soft-t" style={{ marginBottom: 6 }} />

              <MenuItem icon={User} label="My Profile" disabled />

              <MenuItem
                icon={SettingsIcon}
                label="Settings"
                onClick={() => {
                  close();
                  navigate("/settings");
                }}
              />

              <MenuItem
                icon={LogOut}
                label="Logout"
                onClick={() => {
                  close();
                  logout();
                  navigate("/login");
                }}
              />
            </div>
          </>,
          document.body
        )}
    </>
  );
}
