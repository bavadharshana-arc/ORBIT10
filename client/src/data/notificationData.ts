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


/** Drives the Notification Center's tab row (NotificationPanel) — Today / This Week / Earlier, in that order. */
export type NotificationGroupLabel = "Today" | "This Week" | "Earlier";

export interface NotificationGroup {
  label: NotificationGroupLabel;
  items: Notification[];
}

const GROUP_LABELS: NotificationGroupLabel[] = ["Today", "This Week", "Earlier"];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function isSameDay(ms: number, reference: Date): boolean {
  return new Date(ms).toDateString() === reference.toDateString();
}

/**
 * Buckets by real `createdAt` only — never a fabricated timestamp just to
 * populate a category. Unlike the old Today/Yesterday/Earlier grouping
 * (which skipped empty buckets, fine for a flat stacked list), every one
 * of the 3 labels is always returned, even with an empty `items` array —
 * NotificationPanel's tab row needs the full set to render "This Week"/
 * "Earlier" as clickable tabs regardless of whether they currently hold
 * anything; it decides what an empty tab looks like, not this function.
 */
export function groupNotificationsByRecency(notifications: Notification[]): NotificationGroup[] {
  const today = new Date();
  const weekAgo = today.getTime() - WEEK_MS;

  const buckets: Record<NotificationGroupLabel, Notification[]> = {
    Today: [],
    "This Week": [],
    Earlier: [],
  };

  notifications.forEach((notification) => {
    if (isSameDay(notification.createdAt, today)) buckets.Today.push(notification);
    else if (notification.createdAt >= weekAgo) buckets["This Week"].push(notification);
    else buckets.Earlier.push(notification);
  });

  return GROUP_LABELS.map((label) => ({ label, items: buckets[label] }));
}
