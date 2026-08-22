import { createContext, useContext } from "react";
import type { NewNotification, Notification } from "../data/notificationData";

export interface NotificationContextValue {
  notifications: Notification[];

  unreadCount: number;

  isLoading: boolean;
  error: string | null;

  addNotification: (input: NewNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  /** Deletes a single notification — the per-row trash action, distinct from clearAll (which deletes every notification). */
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}


export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);


export function useNotificationContext(): NotificationContextValue {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotificationContext must be used inside NotificationProvider");
  }

  return context;
}
