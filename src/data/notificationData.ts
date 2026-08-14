import { formatRelativeTime } from "./workspaceData";

/* ============================================================
   TYPES
============================================================ */

export type NotificationType =
  | "assignment"
  | "comment"
  | "mention"
  | "deadline"
  | "project"
  | "team"
  | "file";

/** A lightweight initials-avatar, matching the <Avatar /> component's own props. Omitted for system-level notifications (deadlines, milestones) — NotificationItem falls back to the type icon instead. */
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
  /** Epoch ms — real timestamps (not display strings) so items can be grouped/sorted, matching the ActivityEvent/Discussion convention elsewhere. */
  createdAt: number;
  read: boolean;
  avatar?: NotificationAvatar;
  /** Optional in-app path (react-router `to`) to navigate to when the notification is clicked, e.g. "/projects/orbit-mobile-app/board". */
  actionHref?: string;
}

/** Everything a caller needs to supply to create a notification — id/createdAt/read are filled in by NotificationContext, so future features (comments, mentions, tasks, files) can call `addNotification()` with just this shape. */
export type NewNotification = Omit<Notification, "id" | "createdAt" | "read"> & {
  read?: boolean;
};

/* ============================================================
   ID GENERATION
   Kept local rather than imported from another domain's file —
   mirrors the `${prefix}-${Date.now()}-${rand}` convention every
   other data file (taskData.ts, teamData.ts, workspaceData.ts)
   already hand-rolls for its own ids.
============================================================ */

export function generateNotificationId(): string {
  return `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ============================================================
   RELATIVE TIME
============================================================ */

/** Re-exported so components only need to import from one place. */
export { formatRelativeTime as formatNotificationTime };

/* ============================================================
   GROUPING — Today / Yesterday / Earlier
============================================================ */

export type NotificationGroupLabel = "Today" | "Yesterday" | "Earlier";

export interface NotificationGroup {
  label: NotificationGroupLabel;
  items: Notification[];
}

const GROUP_LABELS: NotificationGroupLabel[] = ["Today", "Yesterday", "Earlier"];

function isSameDay(ms: number, reference: Date): boolean {
  return new Date(ms).toDateString() === reference.toDateString();
}

/** Buckets an already-sorted (newest-first) notification list into Today/Yesterday/Earlier, omitting empty buckets. */
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

/* ============================================================
   SEED DATA
   Plain dummy content — deliberately not wired to teamData.ts /
   dashboardData.ts / taskData.ts, since Phase 6.1 keeps
   notifications self-contained until a later phase connects
   real comment/task/mention/file events to addNotification().
============================================================ */

function buildInitialNotifications(): Notification[] {
  const now = Date.now();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  const seed: Notification[] = [
    {
      id: generateNotificationId(),
      type: "mention",
      title: "Jonah Diaz mentioned you",
      message: '"@Maya, can you review the onboarding flow before Friday?"',
      createdAt: now - 10 * minute,
      read: false,
      avatar: { initials: "JD", bg: "#EEF2F6", fg: "#20242B" },
      actionHref: "/projects/orbit-mobile-app/discussions",
    },
    {
      id: generateNotificationId(),
      type: "assignment",
      title: "New task assigned to you",
      message: 'Rhea Shah assigned you "Design system audit" in Orbit Mobile App.',
      createdAt: now - 55 * minute,
      read: false,
      avatar: { initials: "RS", bg: "#20242B", fg: "#F7F8FA" },
      actionHref: "/projects/orbit-mobile-app/board",
    },
    {
      id: generateNotificationId(),
      type: "comment",
      title: 'New comment on "API rate limiting"',
      message: 'Aidan Kim replied: "Let\'s cap it at 100 req/min for now."',
      createdAt: now - 3 * hour,
      read: true,
      avatar: { initials: "AK", bg: "#E4E8ED", fg: "#20242B" },
      actionHref: "/projects/api-v2-migration/board",
    },
    {
      id: generateNotificationId(),
      type: "deadline",
      title: "Task due tomorrow",
      message: '"Q3 investor deck — final review" is due tomorrow at 5:00 PM.',
      createdAt: now - day + 2 * hour,
      read: false,
      actionHref: "/tasks",
    },
    {
      id: generateNotificationId(),
      type: "team",
      title: "Priya Nair joined the workspace",
      message: "Say hello to Priya Nair, Frontend Engineer on the Engineering team.",
      createdAt: now - day + 6 * hour,
      read: true,
      avatar: { initials: "PN", bg: "#AFC5DA", fg: "#20242B" },
      actionHref: "/team",
    },
    {
      id: generateNotificationId(),
      type: "project",
      title: "Marketing Site Redesign updated",
      message: "Talia Lang moved the project to 68% complete.",
      createdAt: now - day + 9 * hour,
      read: false,
      avatar: { initials: "TL", bg: "#8EA7BF", fg: "#20242B" },
      actionHref: "/projects/marketing-site-redesign/overview",
    },
    {
      id: generateNotificationId(),
      type: "comment",
      title: 'New comment on "Checkout flow polish"',
      message: "Ezra Cole left feedback on the latest mockups.",
      createdAt: now - 4 * day,
      read: true,
      avatar: { initials: "EC", bg: "#EEF2F6", fg: "#20242B" },
      actionHref: "/projects/orbit-mobile-app/board",
    },
    {
      id: generateNotificationId(),
      type: "project",
      title: "Milestone completed",
      message: '"Beta launch" milestone was marked complete in Orbit Mobile App.',
      createdAt: now - 9 * day,
      read: true,
      actionHref: "/projects/orbit-mobile-app/overview",
    },
  ];

  return seed.sort((a, b) => b.createdAt - a.createdAt);
}

/* ============================================================
   PERSISTENCE
============================================================ */

const NOTIFICATIONS_STORAGE_KEY = "orbit-notifications";

export function loadNotifications(): Notification[] {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);

    if (!stored) {
      return buildInitialNotifications();
    }

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return buildInitialNotifications();
    }

    return parsed as Notification[];
  } catch (error) {
    console.error("Failed to load notifications:", error);
    return buildInitialNotifications();
  }
}

export function saveNotifications(notifications: Notification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error("Failed to save notifications:", error);
  }
}
