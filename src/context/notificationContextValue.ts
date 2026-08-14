import { createContext, useContext } from "react";

import type { NewNotification, Notification } from "../data/notificationData";

/* ============================================================
   NOTIFICATION CONTEXT VALUE
============================================================ */

export interface NotificationContextValue {
  notifications: Notification[];
  /** Derived from `notifications` — not stored separately, so it can never drift out of sync. */
  unreadCount: number;
  /**
   * Creates a notification (id/createdAt/read are filled in automatically).
   * The single entry point later features (comments, mentions, task
   * assignment, file uploads) should call — nothing else needs to
   * change here for them to start producing real notifications.
   */
  addNotification: (input: NewNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

/* ============================================================
   CONTEXT
============================================================ */

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

/* ============================================================
   HOOK
============================================================ */

export function useNotificationContext(): NotificationContextValue {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotificationContext must be used inside NotificationProvider");
  }

  return context;
}
