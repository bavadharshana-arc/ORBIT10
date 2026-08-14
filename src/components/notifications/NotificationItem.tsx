import type { Notification } from "../../data/notificationData";
import { formatNotificationTime } from "../../data/notificationData";
import { Avatar } from "../ui/Avatar";
import { NOTIFICATION_META } from "./notificationMeta";

interface NotificationItemProps {
  notification: Notification;
  isLast: boolean;
  onClick: () => void;
}

/** A single row inside NotificationPanel. Presentational only — click handling (mark-as-read, navigation, closing the panel) is decided by the caller so this stays reusable wherever a notification needs rendering. */
export function NotificationItem({ notification, isLast, onClick }: NotificationItemProps) {
  const meta = NOTIFICATION_META[notification.type];
  const Icon = meta.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onClick()}
      className="nav-item flex items-start"
      style={{
        gap: 12,
        padding: "12px 10px",
        borderRadius: 12,
        cursor: "pointer",
        background: notification.read ? "transparent" : "rgba(142,167,191,0.1)",
        borderBottom: isLast ? "none" : "1px solid var(--border)",
      }}
    >
      <div style={{ flexShrink: 0 }}>
        {notification.avatar ? (
          <Avatar initials={notification.avatar.initials} bg={notification.avatar.bg} fg={notification.avatar.fg} size={34} />
        ) : (
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "var(--surface-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={15} strokeWidth={1.8} color={meta.color} />
          </div>
        )}
      </div>

      <div style={{ minWidth: 0, flex: 1, paddingTop: 1 }}>
        <div className="flex items-start justify-between" style={{ gap: 8 }}>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: notification.read ? 600 : 650, color: "var(--text)", lineHeight: 1.4 }}>
            {notification.title}
          </p>
          {!notification.read && (
            <span
              aria-hidden="true"
              style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--blue-dark)", flexShrink: 0, marginTop: 5 }}
            />
          )}
        </div>
        <p className="text-ink-2" style={{ margin: "2px 0 0", fontSize: 12, lineHeight: 1.5 }}>
          {notification.message}
        </p>
        <span className="text-ink-3" style={{ fontSize: 11, marginTop: 4, display: "inline-block" }}>
          {formatNotificationTime(notification.createdAt)}
        </span>
      </div>
    </div>
  );
}
