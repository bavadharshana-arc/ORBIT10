import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

/* ============================================================
   NOTIFICATION API (Stage 4 — Real Notifications)

   Mirrors server/src/services/notification.service.ts's shape.
   Recipient-scoped, not workspace/project-scoped — GET/PATCH/DELETE
   always operate on the caller's own notifications (server-side
   filtered by req.userId, never trusted from the client). POST may
   target a different real recipient via `recipientId`, verified
   server-side to share a workspace with the caller.
============================================================ */

export const NOTIFICATION_TYPES = ["assignment", "comment", "project", "team", "file"] as const;
export type NotificationApiType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationRecord {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: NotificationApiType;
  title: string;
  message: string;
  actionHref: string | null;
  read: boolean;
  createdAt: string;
}

export interface CreateNotificationInput {
  type: NotificationApiType;
  title: string;
  message: string;
  actionHref?: string | null;
  /** Omit to notify yourself (the default). Set to deliver to a different real user — the server rejects it unless they share a workspace with you. */
  recipientId?: string;
}

const BASE = "/users/me/notifications";

export function listNotifications(): Promise<NotificationRecord[]> {
  return apiGet<NotificationRecord[]>(BASE);
}

export function createNotification(input: CreateNotificationInput): Promise<NotificationRecord> {
  return apiPost<NotificationRecord>(BASE, input);
}

export function updateNotificationRead(notificationId: string, read: boolean): Promise<NotificationRecord> {
  return apiPatch<NotificationRecord>(`${BASE}/${notificationId}`, { read });
}

export function markAllNotificationsRead(): Promise<void> {
  return apiPost<void>(`${BASE}/read-all`);
}

/** Deletes a single notification — the per-row trash action. Distinct from clearAllNotifications below (which wipes every notification) and never touches the task/project/comment the notification referenced. */
export function deleteNotification(notificationId: string): Promise<void> {
  return apiDelete(`${BASE}/${notificationId}`);
}

export function clearAllNotifications(): Promise<void> {
  return apiDelete(BASE);
}
