import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";

import { useNotificationContext } from "../../context/notificationContextValue";
import { NotificationPanel } from "./NotificationPanel";

interface PanelPosition {
  top: number;
  right: number;
}

/**
 * Replaces the old static bell button in TopBar — same trigger size/shape,
 * now wired to NotificationContext with a working dropdown.
 *
 * The panel is rendered via createPortal(document.body) rather than as an
 * absolutely-positioned child, like ProjectActionsMenu/ProjectAddMemberMenu
 * do it. TopBar sits inside DashboardLayout's normal document flow, and
 * several ancestors/siblings in that flow (Sidebar, and most page content
 * via the shared `.fade-in` class) become their own stacking contexts —
 * any element promoted to its own stacking context that way paints as a
 * unit, so a merely-higher z-index several levels down inside TopBar isn't
 * guaranteed to land above content painted elsewhere in the tree. Porting
 * the panel straight to <body> sidesteps that entirely: its position is
 * computed from the trigger button's own bounding rect instead of CSS
 * inheritance, so it always paints above the whole app regardless of what
 * stacking contexts exist between TopBar and the page root.
 */
export function NotificationBell() {
  const { unreadCount } = useNotificationContext();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function updatePosition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    // 10px gap below the button, right-aligned to the button's right edge —
    // same offsets the old absolutely-positioned version used.
    setPosition({ top: rect.bottom + 10, right: window.innerWidth - rect.right });
  }

  function toggleOpen() {
    if (!isOpen) updatePosition();
    setIsOpen((current) => !current);
  }

  // Keep the panel anchored to the button if the viewport resizes or the
  // page scrolls while it's open (e.g. a long page on a small screen).
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
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        onClick={toggleOpen}
        className="bg-card border-soft lift"
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          border: "1px solid var(--border)",
          cursor: "pointer",
        }}
      >
        <Bell size={17} strokeWidth={1.8} color="var(--text)" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 17,
              height: 17,
              borderRadius: 999,
              background: "var(--blue-dark)",
              color: "var(--surface)",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              boxShadow: "0 0 0 2px var(--card)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen &&
        position &&
        createPortal(
          <>
            <div onClick={() => setIsOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 999 }} />
            <div
              className="bg-card border-soft shadow-float-lg fade-in-static"
              style={{
                position: "fixed",
                top: position.top,
                right: position.right,
                width: "min(380px, calc(100vw - 24px))",
                borderRadius: 18,
                overflow: "hidden",
                zIndex: 1000,
              }}
            >
              <NotificationPanel onClose={() => setIsOpen(false)} />
            </div>
          </>,
          document.body
        )}
    </>
  );
}
