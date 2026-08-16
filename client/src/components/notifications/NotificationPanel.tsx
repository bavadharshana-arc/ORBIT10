import type { CSSProperties } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type { Notification } from "../../data/notificationData";
import { groupNotificationsByRecency } from "../../data/notificationData";
import { useNotificationContext } from "../../context/notificationContextValue";
import { NotificationItem } from "./NotificationItem";

interface NotificationPanelProps {
  /** Closes the parent dropdown — called after any item click or destructive action, matching ProjectActionsMenu/ProjectAddMemberMenu's close-on-selection convention. */
  onClose: () => void;
}

const headerButtonStyle = (disabled: boolean): CSSProperties => ({
  border: "none",
  background: "transparent",
  fontSize: 11,
  fontWeight: 600,
  color: disabled ? "var(--text-3)" : "var(--text-2)",
  cursor: disabled ? "default" : "pointer",
  padding: 0,
});

/** The dropdown content anchored under NotificationBell's trigger — header actions, grouped list, empty state. */
export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { notifications, unreadCount, isLoading, error, markAsRead, markAllAsRead, clearAll } = useNotificationContext();
  const navigate = useNavigate();

  const groups = groupNotificationsByRecency(notifications);

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
      <div className="flex items-center justify-between" style={{ padding: "14px 16px 12px" }}>
        <div>
          <h3 className="font-display" style={{ margin: 0, fontSize: 15, fontWeight: 560, color: "var(--text)" }}>
            Notifications
          </h3>
          <p className="text-ink-3" style={{ margin: "2px 0 0", fontSize: 11 }}>
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>

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

      <div className="border-soft-t" />

      <div style={{ maxHeight: 420, overflowY: "auto" }}>
        {isLoading ? (
          <div className="flex flex-col items-center" style={{ padding: "44px 24px", textAlign: "center", gap: 10 }}>
            <p className="text-ink-3" style={{ fontSize: 12.5 }}>Loading notifications…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center" style={{ padding: "44px 24px", textAlign: "center", gap: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#B3564B", margin: 0 }}>Couldn't load notifications</p>
            <p className="text-ink-3" style={{ fontSize: 11.5, maxWidth: 240, margin: 0 }}>{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center" style={{ padding: "44px 24px", textAlign: "center", gap: 10 }}>
            <Bell size={22} strokeWidth={1.6} color="var(--text-3)" />
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)", margin: 0 }}>No notifications</p>
            <p className="text-ink-3" style={{ fontSize: 12, maxWidth: 240, margin: 0 }}>
              New activity — assignments, comments, and more — will show up here.
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div
                className="bg-card text-ink-3"
                style={{
                  position: "sticky",
                  top: 0,
                  padding: "10px 16px 6px",
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                {group.label}
              </div>
              <div style={{ padding: "0 8px" }}>
                {group.items.map((notification, index) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    isLast={index === group.items.length - 1}
                    onClick={() => handleItemClick(notification)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
