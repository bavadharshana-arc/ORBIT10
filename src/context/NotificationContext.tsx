import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import {
  generateNotificationId,
  loadNotifications,
  saveNotifications,
  type NewNotification,
  type Notification,
} from "../data/notificationData";
import { NotificationContext } from "./notificationContextValue";

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications);

  // Persist to localStorage whenever notifications change (new ones,
  // read/unread toggles, clearing) so state survives a refresh —
  // same pattern TaskContext/ProjectContext use.
  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  function addNotification(input: NewNotification) {
    const notification: Notification = {
      id: generateNotificationId(),
      createdAt: Date.now(),
      read: false,
      ...input,
    };

    setNotifications((current) => [notification, ...current]);
  }

  function markAsRead(id: string) {
    setNotifications((current) =>
      current.map((notification) => (notification.id === id ? { ...notification, read: true } : notification))
    );
  }

  function markAllAsRead() {
    setNotifications((current) =>
      current.map((notification) => (notification.read ? notification : { ...notification, read: true }))
    );
  }

  function clearAll() {
    setNotifications([]);
  }

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
