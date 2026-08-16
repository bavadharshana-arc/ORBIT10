import type { LucideIcon } from "lucide-react";
import { ClipboardCheck, MessageSquare, AtSign, AlarmClock, FolderKanban, Users, Paperclip } from "lucide-react";

import type { NotificationType } from "../../data/notificationData";

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
