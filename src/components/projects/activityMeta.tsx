import type { LucideIcon } from "lucide-react";
import {
  Rocket,
  FilePlus,
  RefreshCcw,
  ArrowRightLeft,
  MessageSquare,
  Paperclip,
  UserPlus,
  UserMinus,
  Trophy,
  MessagesSquare,
} from "lucide-react";

import type { ActivityEventType } from "../../types/workspace";

/** Icon + accent shared by the Overview tab's "Recent activity" preview and the full Activity tab, so both read as the same feed. */
export const ACTIVITY_META: Record<ActivityEventType, { icon: LucideIcon; accent: boolean }> = {
  project_created: { icon: Rocket, accent: true },
  task_created: { icon: FilePlus, accent: false },
  task_updated: { icon: RefreshCcw, accent: false },
  status_changed: { icon: ArrowRightLeft, accent: false },
  comment_added: { icon: MessageSquare, accent: false },
  file_uploaded: { icon: Paperclip, accent: false },
  member_added: { icon: UserPlus, accent: true },
  member_removed: { icon: UserMinus, accent: false },
  milestone_completed: { icon: Trophy, accent: true },
  discussion_posted: { icon: MessagesSquare, accent: false },
};
