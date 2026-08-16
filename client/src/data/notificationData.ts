import { formatRelativeTime } from "./workspaceData";

// Stage 4 (Real Notifications): "mention" and "deadline" are kept here so
// NotificationItem/notificationMeta.tsx can still render older/seed rows
// if any ever show up, but the real backend (notification.service.ts's
// NOTIFICATION_TYPES) only ever creates the other five — there are no
// live trigger sites for mention/deadline, matching the backend's own
// Phase 17 scope.
export type NotificationType =
  | "assignment"
  | "comment"
  | "mention"
  | "deadline"
  | "project"
  | "team"
  | "file";


export interface NotificationAvatar {
  initials: string;
  bg: string;
  fg?: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;

  createdAt: number;
  read: boolean;
  avatar?: NotificationAvatar;

  actionHref?: string;
}


export type NewNotification = Omit<Notification, "id" | "createdAt" | "read"> & {
  read?: boolean;
  /** Real recipient userId — omit to notify yourself. See lib/notificationApi.ts. */
  recipientId?: string;
};


export { formatRelativeTime as formatNotificationTime };


export type NotificationGroupLabel = "Today" | "Yesterday" | "Earlier";

export interface NotificationGroup {
  label: NotificationGroupLabel;
  items: Notification[];
}

const GROUP_LABELS: NotificationGroupLabel[] = ["Today", "Yesterday", "Earlier"];

function isSameDay(ms: number, reference: Date): boolean {
  return new Date(ms).toDateString() === reference.toDateString();
}


export function groupNotificationsByRecency(notifications: Notification[]): NotificationGroup[] {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const buckets: Record<NotificationGroupLabel, Notification[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };

  notifications.forEach((notification) => {
    if (isSameDay(notification.createdAt, today)) buckets.Today.push(notification);
    else if (isSameDay(notification.createdAt, yesterday)) buckets.Yesterday.push(notification);
    else buckets.Earlier.push(notification);
  });

  return GROUP_LABELS.map((label) => ({ label, items: buckets[label] })).filter((group) => group.items.length > 0);
}
