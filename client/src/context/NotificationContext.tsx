import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import type { NewNotification, Notification } from "../data/notificationData";
import { useAuth } from "./AuthContext";
import { ApiError } from "../lib/api";
import {
  listNotifications as listNotificationsRequest,
  createNotification as createNotificationRequest,
  updateNotificationRead,
  markAllNotificationsRead as markAllNotificationsReadRequest,
  deleteNotification as deleteNotificationRequest,
  clearAllNotifications as clearAllNotificationsRequest,
  NOTIFICATION_TYPES as API_NOTIFICATION_TYPES,
  type NotificationApiType,
  type NotificationRecord,
} from "../lib/notificationApi";
import { NotificationContext } from "./notificationContextValue";

/* ============================================================
   NOTIFICATION PROVIDER (Stage 4 — Real Notifications)

   Recipient-scoped, not workspace-scoped (mirrors the backend's own
   design — see notification.routes.ts) — fetched once per signed-in
   session, not re-fetched on workspace switch. Replaces the old
   localStorage-backed notificationData.ts persistence entirely; no
   fallback to it on a load failure (an empty list + `error` is the
   honest state, same convention as every other real-data context
   this session).

   `avatar` is never populated for real notifications: the backend
   only stores a raw `actorId`, and an actor may not be a member of
   the viewer's *current* workspace (notifications aren't
   workspace-scoped), so there's no reliable roster to resolve their
   avatar color from. NotificationItem.tsx already has a working,
   pre-existing fallback (the type icon) for a notification with no
   avatar — used here rather than fabricating one.
============================================================ */

function mapRecord(record: NotificationRecord): Notification {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    message: record.message,
    createdAt: new Date(record.createdAt).getTime(),
    read: record.read,
    actionHref: record.actionHref ?? undefined,
  };
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Deferred into the promise chain — never synchronous in the effect
    // body, including the "no user" case below — same reasoning as every
    // other real-data fetch effect this session (e.g. TaskContext.tsx).
    Promise.resolve()
      .then(() => {
        if (cancelled || !user) return null;
        setIsLoading(true);
        setError(null);
        return listNotificationsRequest();
      })
      .then((records) => {
        if (cancelled) return;
        if (!user || !records) {
          setNotifications([]);
          return;
        }
        setNotifications(records.map(mapRecord));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setNotifications([]);
        setError(err instanceof ApiError ? err.message : "Couldn't load notifications. Try again in a moment.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function addNotification(input: NewNotification) {
    if (!user) return;

    // "mention"/"deadline" exist in the wider display union (for reading
    // any older/seed rows) but have zero live trigger sites and no
    // backend support (notification.service.ts's NOTIFICATION_TYPES) —
    // dropped here rather than sent to an API that would 400 on them.
    if (!(API_NOTIFICATION_TYPES as readonly string[]).includes(input.type)) {
      console.error(`Notification type "${input.type}" has no backend support; dropped.`);
      return;
    }

    try {
      const record = await createNotificationRequest({
        type: input.type as NotificationApiType,
        title: input.title,
        message: input.message,
        actionHref: input.actionHref ?? null,
        recipientId: input.recipientId,
      });

      // A cross-user notification (recipientId given, someone else)
      // belongs in *their* list, not mine — it lands there on their own
      // next fetch, never mirrored into my own state here.
      if (record.recipientId === user.id) {
        setNotifications((current) => [mapRecord(record), ...current]);
      }
    } catch (err) {
      console.error("Couldn't create notification:", err);
    }
  }

  async function markAsRead(id: string) {
    const target = notifications.find((notification) => notification.id === id);
    if (!target || target.read) return;

    setNotifications((current) => current.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)));

    try {
      await updateNotificationRead(id, true);
    } catch (err) {
      console.error("Couldn't mark notification as read:", err);
    }
  }

  async function markAllAsRead() {
    const hadUnread = notifications.some((notification) => !notification.read);
    if (!hadUnread) return;

    setNotifications((current) => current.map((notification) => (notification.read ? notification : { ...notification, read: true })));

    try {
      await markAllNotificationsReadRequest();
    } catch (err) {
      console.error("Couldn't mark all notifications as read:", err);
    }
  }

  async function clearAll() {
    const previous = notifications;
    setNotifications([]);

    try {
      await clearAllNotificationsRequest();
    } catch (err) {
      console.error("Couldn't clear notifications:", err);
      // Destructive action — restore on failure so the UI doesn't claim
      // an empty inbox that the backend never actually cleared.
      setNotifications(previous);
    }
  }

  /**
   * Single-notification delete — the per-row trash action. Same
   * optimistic-then-restore-on-failure shape as clearAll above (also
   * destructive/irreversible), just scoped to one id instead of every
   * notification. Never touches the task/project/comment the deleted
   * notification referenced — only the Notification row itself.
   */
  async function deleteNotification(id: string) {
    const previous = notifications;
    setNotifications((current) => current.filter((notification) => notification.id !== id));

    try {
      await deleteNotificationRequest(id);
    } catch (err) {
      console.error("Couldn't delete notification:", err);
      setNotifications(previous);
    }
  }

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, isLoading, error, addNotification, markAsRead, markAllAsRead, deleteNotification, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
