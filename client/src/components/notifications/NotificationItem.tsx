import { useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { Trash2, X, Bell } from "lucide-react";

import type { Notification } from "../../data/notificationData";
import { formatNotificationTime } from "../../data/notificationData";
import { Avatar } from "../ui/Avatar";
import { resolveNotificationIcon } from "./notificationMeta";

interface NotificationItemProps {
  notification: Notification;
  isLast: boolean;
  onClick: () => void;
  /**
   * The real per-notification delete — a genuine backend DELETE, fired by
   * either dismiss gesture below (trash-icon click or a completed
   * left-swipe). Deletes only this Notification row; never the
   * task/project/comment it references, and never touches read state or
   * navigates.
   */
  onDelete: () => void;
}

/** Below this, a pointerup is read as a tap (existing onClick fires) rather than a drag. */
const TAP_THRESHOLD = 6;
/** Horizontal drag distance that commits to a dismiss on release. */
const DISMISS_THRESHOLD = 88;
/** Horizontal movement must outpace vertical by this factor before a gesture is claimed as a swipe — otherwise it's released back to native vertical list scrolling. */
const DIRECTION_LOCK_RATIO = 1.3;

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  /** True once the gesture has been confirmed horizontal and the pointer captured. */
  locked: boolean;
}

/** A single row inside NotificationPanel. Presentational only — click handling (mark-as-read, navigation, closing the panel) is decided by the caller so this stays reusable wherever a notification needs rendering. Adds one local interaction on top of that: drag/swipe left to delete, mirroring the trash button. */
export function NotificationItem({ notification, isLast, onClick, onDelete }: NotificationItemProps) {
  const { icon: Icon, color } = resolveNotificationIcon(notification);
  // Last-resort runtime guard on top of resolveNotificationIcon's own
  // DEFAULT_ICON fallback — if `Icon` is ever falsy for any reason this
  // can't statically rule out, render a visible icon instead of nothing
  // rather than trust the upstream guarantee blindly.
  const SafeIcon = Icon ?? Bell;

  const [dragX, setDragX] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);
  // Mirrors dragRef.current?.locked as real state — needed to disable the
  // CSS transition below while a drag is live, and refs can't be read
  // during render (only in effects/handlers).
  const [isDragging, setIsDragging] = useState(false);
  // `.nav-item:hover` (globals.css) can never actually show through here —
  // the row's own inline `background` below (driven by read/unread state)
  // always outranks a class-based hover rule in the cascade, so hover
  // needs its own explicit state instead to have any visible effect.
  const [isHovered, setIsHovered] = useState(false);
  const dragRef = useRef<DragState | null>(null);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return; // primary mouse button (or any touch/pen contact) only
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, locked: false };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (!drag.locked) {
      if (Math.abs(dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD) return; // not enough movement yet to read intent
      if (Math.abs(dx) < Math.abs(dy) * DIRECTION_LOCK_RATIO) {
        // Reads as a vertical scroll, not a horizontal swipe — hand it
        // back to the browser's native touch scrolling untouched.
        dragRef.current = null;
        return;
      }
      drag.locked = true;
      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
    // Only a leftward swipe reveals/progresses the dismiss affordance —
    // dragging right just resists back to 0, so it never looks like
    // partial progress toward dismissing.
    setDragX(Math.min(0, dx));
  }

  // Shared exit animation for both ways a row can leave the list — a full
  // swipe and a trash-icon click both fade + slide the row off before the
  // real backend delete (onDelete) actually fires, so both gestures get
  // the same polish rather than either one just vanishing instantly.
  function animateOutThen(finish: () => void) {
    setIsDismissing(true);
    setDragX(-480);
    window.setTimeout(finish, 200); // let the transition finish before actually removing the row
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    if (!drag.locked) return; // a genuine tap — onClick below runs exactly as it always has

    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);

    if (Math.abs(dragX) >= DISMISS_THRESHOLD) {
      animateOutThen(onDelete);
    } else {
      setDragX(0);
    }
  }

  function handleDeleteClick(event: ReactMouseEvent<HTMLButtonElement>) {
    // Stop it reaching the row's own onClick (mark-as-read + navigate) —
    // the trash icon is a distinct action, not a click on the notification.
    event.stopPropagation();
    animateOutThen(onDelete);
  }

  const swipeProgress = Math.min(1, Math.abs(dragX) / DISMISS_THRESHOLD);

  // Unread rows keep their accent at full, consistent strength — "a
  // slightly stronger visual presence than read" — rather than dimming on
  // hover; only read rows get the subtle elevated-background hover cue.
  const background = notification.read ? (isHovered ? "var(--surface-2)" : "var(--card)") : "var(--blue-tint)";

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 14, borderBottom: isLast ? "none" : "1px solid var(--border)" }}>
      {/* Dismiss affordance — sits behind the row, revealed as it swipes left. */}
      <div
        aria-hidden="true"
        className="flex items-center justify-end"
        style={{ position: "absolute", inset: 0, padding: "0 18px", gap: 6, background: "var(--blue-tint)", opacity: swipeProgress }}
      >
        {/*
          `color`/`stroke` as a lucide-react *prop* renders straight onto
          the <svg>'s `stroke` XML attribute (see lucide-react's own
          source), not a CSS `style` property — and a bare XML attribute
          never resolves `var(--...)`, so every icon here that took a CSS
          custom property through `color` painted with an invalid,
          silently-dropped stroke: present in the DOM (confirmed via a
          real rendered page), just invisible. `style={{ stroke }}` goes
          through the actual CSSOM instead, where var() resolves
          normally, and a style-attribute stroke wins over the (still
          invalid) attribute one by cascade — this was the actual bug
          behind every "missing" icon and the missing delete button, not
          hover/CSS-visibility as originally suspected.
        */}
        <X size={14} strokeWidth={2} style={{ stroke: "var(--blue-dark)" }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--blue-dark)" }}>Delete</span>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onClick()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex items-start"
        style={{
          gap: 13,
          padding: "13px 12px",
          borderRadius: 14,
          cursor: "pointer",
          background,
          transform: `translateX(${dragX}px)`,
          opacity: isDismissing ? 0 : 1,
          transition: isDragging ? "none" : "transform 220ms ease, opacity 200ms ease, background 160ms ease",
          touchAction: "pan-y",
        }}
      >
        <div style={{ flexShrink: 0 }}>
          {notification.avatar ? (
            <Avatar initials={notification.avatar.initials} bg={notification.avatar.bg} fg={notification.avatar.fg} size={36} />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--blue-tint)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* style={{ stroke }}, not the color prop — see the doc comment on the <X> above. */}
              <SafeIcon size={16} strokeWidth={1.8} style={{ stroke: color ?? "var(--text)" }} />
            </div>
          )}
        </div>

        <div style={{ minWidth: 0, flex: 1, paddingTop: 2 }}>
          <div className="flex items-center justify-between" style={{ gap: 10 }}>
            <span className="flex items-center" style={{ gap: 6, minWidth: 0 }}>
              {!notification.read && (
                <span
                  aria-hidden="true"
                  style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--blue-dark)", flexShrink: 0 }}
                />
              )}
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: notification.read ? 600 : 650,
                  color: "var(--text)",
                  lineHeight: 1.4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {notification.title}
              </span>
            </span>
            <span className="flex items-center" style={{ gap: 6, flexShrink: 0 }}>
              <span className="text-ink-3" style={{ fontSize: 11 }}>{formatNotificationTime(notification.createdAt)}</span>
              <button
                type="button"
                aria-label="Delete notification"
                onClick={handleDeleteClick}
                className="nav-item"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  border: "none",
                  borderRadius: 7,
                  background: isHovered ? "var(--surface-2)" : "transparent",
                  cursor: "pointer",
                  // Unconditionally visible for now (was opacity: isHovered
                  // ? 1 : 0.45) — per explicit request, so the fix above
                  // (the real bug: color→stroke-attribute doesn't resolve
                  // var(), not hover/opacity) is visible on every row
                  // without having to hover each one to confirm. Trivial
                  // to bring back the hover-reveal once that's confirmed.
                  opacity: 1,
                  flexShrink: 0,
                  transition: "background 160ms ease",
                }}
              >
                {/* style={{ stroke }}, not the color prop — see the doc comment on the <X> above. */}
                <Trash2 size={12} strokeWidth={1.8} style={{ stroke: "var(--text-3)" }} />
              </button>
            </span>
          </div>
          <p className="text-ink-2" style={{ margin: "3px 0 0", fontSize: 12, lineHeight: 1.5 }}>
            {notification.message}
          </p>
        </div>
      </div>
    </div>
  );
}
