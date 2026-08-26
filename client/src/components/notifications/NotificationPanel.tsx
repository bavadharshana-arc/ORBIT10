import { useState, type CSSProperties } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type { Notification, NotificationGroupLabel } from "../../data/notificationData";
import { groupNotificationsByRecency } from "../../data/notificationData";
import { useNotificationContext } from "../../context/notificationContextValue";
import { NotificationItem } from "./NotificationItem";

/* ============================================================
   NOTIFICATION CENTER (visual redesign only)

   Same data flow as before — NotificationContext's real, backend-backed
   `notifications`/`unreadCount`/markAsRead/markAllAsRead/clearAll are
   the only source of truth here; this file only decides how to lay
   them out. `activeTab` below is the one bit of new state, and it's
   pure view-state (which already-fetched bucket is visible), the same
   category NotificationBell's own `isOpen` already lives in — not a
   second notification store.
============================================================ */

interface NotificationPanelProps {
  /** Closes the parent dropdown — called after any item click or destructive action, matching ProjectActionsMenu/ProjectAddMemberMenu's close-on-selection convention. */
  onClose: () => void;
}

const TAB_LABELS: NotificationGroupLabel[] = ["Today", "This Week", "Earlier"];

const headerButtonStyle = (disabled: boolean): CSSProperties => ({
  border: "none",
  background: "transparent",
  fontSize: 11,
  fontWeight: 600,
  color: disabled ? "var(--text-3)" : "var(--text-2)",
  cursor: disabled ? "default" : "pointer",
  padding: 0,
});

/** The dropdown content anchored under NotificationBell's trigger — header actions, a Today/This Week/Earlier tab row, the active tab's list, and the empty state. */
export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { notifications, unreadCount, isLoading, error, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotificationContext();
  const navigate = useNavigate();

  const groups = groupNotificationsByRecency(notifications);

  // Lazily picks whichever tab actually has something in it at the
  // moment the panel first opens (falling back to "Today"), so a demo
  // account whose notifications all landed in "Today" doesn't open on a
  // tab that looks broken/empty. Deliberately NOT re-derived on every
  // render — once the user picks a tab, later state changes (e.g.
  // marking something read) shouldn't yank them back to a different one.
  const [activeTab, setActiveTab] = useState<NotificationGroupLabel>(
    () => groups.find((group) => group.items.length > 0)?.label ?? "Today"
  );

  const activeGroup = groups.find((group) => group.label === activeTab) ?? groups[0];

  function handleItemClick(notification: Notification) {
    if (!notification.read) markAsRead(notification.id);
    if (notification.actionHref) navigate(notification.actionHref);
    onClose();
  }

  function handleClearAll() {
    if (notifications.length === 0) return;
    const confirmed = window.confirm("Clear all notifications? This can't be undone.");
    if (!confirmed) return;
    clearAll();
  }

  return (
    <div>
      <div style={{ padding: "16px 18px 12px" }}>
        <div className="flex items-center justify-between">
          <h3 className="font-display" style={{ margin: 0, fontSize: 17, fontWeight: 560, color: "var(--text)" }}>
            Notifications
          </h3>
          <button type="button" disabled title="Coming soon" style={headerButtonStyle(true)}>
            See All
          </button>
        </div>

        <div className="flex items-center justify-between" style={{ marginTop: 4 }}>
          <p className="text-ink-3" style={{ margin: 0, fontSize: 11.5 }}>
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
          <div className="flex items-center" style={{ gap: 12 }}>
            <button type="button" disabled={unreadCount === 0} onClick={markAllAsRead} style={headerButtonStyle(unreadCount === 0)}>
              Mark all read
            </button>
            <button
              type="button"
              disabled={notifications.length === 0}
              onClick={handleClearAll}
              style={headerButtonStyle(notifications.length === 0)}
            >
              Clear all
            </button>
          </div>
        </div>

        {/* TABS — Today / This Week / Earlier, a raised segmented control
            over a muted track. Purely a display filter over `groups`;
            never refetches or reshapes the underlying notifications. */}
        <div
          className="flex items-center"
          style={{ gap: 3, marginTop: 14, padding: 3, background: "var(--surface-2)", borderRadius: 12 }}
        >
          {TAB_LABELS.map((label) => {
            const isActive = label === activeTab;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setActiveTab(label)}
                className={isActive ? undefined : "nav-item"}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 9,
                  padding: "7px 8px",
                  fontSize: 11.5,
                  fontWeight: isActive ? 650 : 550,
                  color: isActive ? "var(--text)" : "var(--text-3)",
                  background: isActive ? "var(--card)" : "transparent",
                  boxShadow: isActive ? "0 1px 2px rgba(32,36,43,0.08)" : "none",
                  cursor: "pointer",
                  transition: "background 160ms ease, color 160ms ease, box-shadow 160ms ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-soft-t" />

      <div style={{ maxHeight: 460, overflowY: "auto", padding: "6px 8px" }}>
        {isLoading ? (
          <div className="flex flex-col items-center" style={{ padding: "48px 24px", textAlign: "center", gap: 10 }}>
            <p className="text-ink-3" style={{ fontSize: 12.5 }}>Loading notifications…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center" style={{ padding: "48px 24px", textAlign: "center", gap: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#B3564B", margin: 0 }}>Couldn't load notifications</p>
            <p className="text-ink-3" style={{ fontSize: 11.5, maxWidth: 260, margin: 0 }}>{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center" style={{ padding: "56px 24px", textAlign: "center", gap: 12 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "var(--surface-2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bell size={22} strokeWidth={1.6} color="var(--text-3)" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0 }}>No notifications</p>
              <p className="text-ink-3" style={{ fontSize: 12, maxWidth: 260, margin: "4px 0 0" }}>
                You're all caught up.
              </p>
            </div>
          </div>
        ) : !activeGroup || activeGroup.items.length === 0 ? (
          <div className="flex flex-col items-center" style={{ padding: "40px 24px", textAlign: "center", gap: 4 }}>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", margin: 0 }}>
              Nothing from {activeTab.toLowerCase()}
            </p>
            <p className="text-ink-3" style={{ fontSize: 11.5, margin: 0 }}>
              Try another tab above.
            </p>
          </div>
        ) : (
          activeGroup.items.map((notification, index) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              isLast={index === activeGroup.items.length - 1}
              onClick={() => handleItemClick(notification)}
              onDelete={() => deleteNotification(notification.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
