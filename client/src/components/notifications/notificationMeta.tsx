import type { LucideIcon } from "lucide-react";
import { ClipboardCheck, MessageSquare, AtSign, AlarmClock, FolderKanban, Users, Paperclip, CheckCircle2, Clock3, RefreshCw, UserPlus, Bell } from "lucide-react";

import type { Notification, NotificationType } from "../../data/notificationData";

/** Guaranteed fallback when a notification's `type` doesn't match any NOTIFICATION_META key (a value outside the known union — a future backend type, bad data, anything) — every row gets an icon, never nothing. */
const DEFAULT_ICON: { icon: LucideIcon; color: string } = { icon: Bell, color: "var(--text-3)" };

/** Icon + accent color per notification type, used for the fallback avatar and any type-based visual grouping. Colors stay within Orbit's existing muted palette (design tokens + the one amber already used for "Away" status elsewhere) rather than introducing a new semantic color scheme. */
export const NOTIFICATION_META: Record<NotificationType, { icon: LucideIcon; color: string; label: string }> = {
  assignment: { icon: ClipboardCheck, color: "var(--blue-dark)", label: "Assignment" },
  comment: { icon: MessageSquare, color: "var(--text-2)", label: "Comment" },
  mention: { icon: AtSign, color: "var(--text)", label: "Mention" },
  deadline: { icon: AlarmClock, color: "#D8A657", label: "Deadline" },
  project: { icon: FolderKanban, color: "var(--blue)", label: "Project" },
  team: { icon: Users, color: "var(--text-3)", label: "Team" },
  file: { icon: Paperclip, color: "var(--text-2)", label: "File" },
};

/**
 * Notification Center redesign — a purely presentational refinement on
 * top of NOTIFICATION_META, not a new data field: the real backend has
 * only 5 notification types (see NotificationContext.tsx's doc comment),
 * so "task completed", "task status changed", and "deadline approaching"
 * all persist as the same `type: "project"` row as "a project was
 * updated", and "member joined" persists as the same `type: "team"` row
 * as any other team notification — this is the one place that tells
 * them apart visually, by sniffing the (also real, already-persisted)
 * `title` text every genuine trigger already sets verbatim ("Task
 * completed" — systemNotifications.ts's notifyTaskCompleted; "Deadline
 * approaching"/"Task status changed"/"... joined ..." — the seeded Demo
 * Workspace notifications). Never changes `notification.type` itself or
 * anything NotificationContext/the API sees — only which icon a
 * "project"/"team"-typed row renders with here.
 */
export function resolveNotificationIcon(notification: Notification): { icon: LucideIcon; color: string } {
  // `?? ""` guards against a malformed row (title/message missing) throwing
  // out of .toLowerCase() and taking the whole row's icon down with it.
  const title = (notification.title ?? "").toLowerCase();
  // "... joined ..." (member-joined team notifications) names the actual
  // event in the message body, not a generic title like "Team activity" —
  // checked here too so those still resolve to UserPlus, not just Users.
  const message = (notification.message ?? "").toLowerCase();
  // Falls back to DEFAULT_ICON rather than indexing NOTIFICATION_META
  // directly — `notification.type` is trusted data from the API's own
  // response, not narrowed by a runtime check, so a value outside the
  // known NotificationType union (a newer backend type this build
  // predates, bad data, anything) would otherwise look up `undefined`
  // and silently render no icon at all instead of a sensible fallback.
  const base = NOTIFICATION_META[notification.type] ?? DEFAULT_ICON;

  if (notification.type === "project") {
    if (title.includes("complet")) return { icon: CheckCircle2, color: "var(--blue-dark)" };
    if (title.includes("deadline")) return { icon: Clock3, color: NOTIFICATION_META.deadline.color };
    // "Task status changed"/"Task updated" — distinct from a project-level
    // "Project updated" (which stays the plain folder icon below), so
    // scoped to titles that are actually about a task, not the project.
    if (title.startsWith("task") && (title.includes("status") || title.includes("updat"))) {
      return { icon: RefreshCw, color: "var(--blue)" };
    }
    return base;
  }

  if (notification.type === "team" && (title.includes("joined") || message.includes("joined"))) {
    return { icon: UserPlus, color: NOTIFICATION_META.team.color };
  }

  return base;
}
