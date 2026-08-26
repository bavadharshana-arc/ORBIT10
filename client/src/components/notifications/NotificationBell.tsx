import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";

import { useNotificationContext } from "../../context/notificationContextValue";
import { NotificationPanel } from "./NotificationPanel";

interface PanelPosition {
  top: number;
  left: number;
  width: number;
}

/** Preferred panel width — 420px, within the Notification Center redesign's requested 400–460px desktop range (the old dropdown was a fixed 380px `min(380px, calc(100vw - 24px))` CSS cap; this is the same idea, just wider and computed in JS so the clamp below can reason about the panel's actual on-screen size). */
const PANEL_WIDTH = 420;
/** Minimum breathing room kept between the panel and either viewport edge. */
const VIEWPORT_MARGIN = 12;

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
 *
 * That same escape from CSS inheritance has a real cost, though: every
 * Orbit design token (--text, --border, --blue, --card, etc.) is only
 * ever *defined* inside `.orbit-root` (DashboardLayout's own wrapper —
 * see globals.css's `.orbit-root { --blue: ...; ... }`), and a node
 * portaled straight to document.body sits completely outside that
 * subtree — a sibling lineage, not a descendant — so every var(--...) an
 * element inside the portal references resolves to nothing. Text/
 * background properties fail "gracefully" into a plausible-looking
 * default (color inherits/defaults near-black, background defaults to
 * transparent and just shows the page behind it), which is exactly why
 * this went unnoticed — but SVG `stroke`'s unstyled fallback is `none`,
 * genuinely invisible, which is what actually broke every notification
 * icon and the delete button. The panel wrapper below carries its own
 * `orbit-root` class for exactly this reason: `.orbit-root` is a class
 * selector, not a singleton, so a second element can carry it and get
 * its own valid copy of every token (dark mode included, since that
 * override is keyed off `html[data-theme="dark"] .orbit-root`, and
 * `<html>` is a real ancestor of everything, portal included).
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
    // same offsets the old absolutely-positioned version used — but
    // computed as a clamped `left` rather than a bare `right` offset.
    // NotificationBell isn't the topbar's rightmost trigger (ProfileMenu
    // sits to its right), so anchoring purely off the viewport's right
    // edge pushes the panel's left edge off-screen on narrow viewports.
    // Clamping both edges keeps it fully on-screen and left-aligned to
    // the button once there's no longer room to hang it off the right.
    const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, rect.right - width),
      window.innerWidth - width - VIEWPORT_MARGIN
    );
    setPosition({ top: rect.bottom + 10, left, width });
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

  // Escape closes the panel, same as the click-outside backdrop below —
  // a keyboard-only user has no other way to dismiss it, since the
  // backdrop only responds to a pointer click.
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
        {/* style={{ stroke }}, not the color prop — lucide-react maps `color` to the SVG's raw `stroke` XML attribute, which never resolves var(--...) (see the doc comment above). This one's inside .orbit-root already, so scope isn't the issue here, just the same prop bug. */}
        <Bell size={17} strokeWidth={1.8} style={{ stroke: "var(--text)" }} />
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
              className="orbit-root bg-card border-soft shadow-float-lg fade-in"
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                width: position.width,
                borderRadius: 20,
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
