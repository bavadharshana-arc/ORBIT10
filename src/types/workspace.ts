/* ============================================================
   PROJECT WORKSPACE TYPES
   Files, Discussions, and Activity are genuinely new domains (no
   prior state exists for them elsewhere in the app) so they get
   their own shapes here, persisted per-project in workspaceData.ts
   — the same localStorage-backed pattern taskData.ts/projectData.ts
   already use for Task[]/Project[].
============================================================ */

/** A lightweight person reference, enough to render an avatar + name without re-fetching from teamData. */
export interface WorkspaceActor {
  id: string;
  name: string;
  initials: string;
  bg: string;
  fg?: string;
}

/* ============================================================
   FILES
============================================================ */

export type FileKind = "document" | "image" | "pdf" | "spreadsheet" | "other";

export interface ProjectFileRecord {
  id: string;
  projectId: string;
  name: string;
  extension: string;
  kind: FileKind;
  sizeBytes: number;
  /** Free-form folder tag (e.g. "General", "Design") — files are organized by grouping/filtering on this rather than a rigid tree. */
  folder: string;
  uploadedBy: WorkspaceActor;
  /** Epoch ms. */
  uploadedAt: number;
}

/* ============================================================
   DISCUSSIONS
============================================================ */

export type DiscussionType = "update" | "question" | "announcement";

export interface DiscussionAttachment {
  fileId: string;
  name: string;
  sizeBytes: number;
}

export interface DiscussionReply {
  id: string;
  author: WorkspaceActor;
  text: string;
  /** Epoch ms. */
  createdAt: number;
}

export interface Discussion {
  id: string;
  projectId: string;
  type: DiscussionType;
  body: string;
  author: WorkspaceActor;
  /** Epoch ms. */
  createdAt: number;
  pinned: boolean;
  /** Member ids mentioned via @name in the body. */
  mentions: string[];
  attachments: DiscussionAttachment[];
  /** emoji -> member ids who reacted with it. */
  reactions: Record<string, string[]>;
  replies: DiscussionReply[];
}

/* ============================================================
   ACTIVITY
============================================================ */

export type ActivityEventType =
  | "project_created"
  | "task_created"
  | "task_updated"
  | "status_changed"
  | "comment_added"
  | "file_uploaded"
  | "member_added"
  | "member_removed"
  | "milestone_completed"
  | "discussion_posted";

/** An explicit, persisted activity log entry — for events that don't already live inside Task (file uploads, member changes, discussion posts, milestones). Task-sourced events (created/updated/status/comment) are derived live from Task.activity instead, so they're never duplicated here. */
export interface ActivityEvent {
  id: string;
  projectId: string;
  type: ActivityEventType;
  text: string;
  /** Epoch ms. */
  createdAt: number;
  actor?: WorkspaceActor;
}

/** A normalized row rendered by the Activity tab, after merging ActivityEvent[] with Task-derived events. */
export interface ActivityFeedItem {
  id: string;
  type: ActivityEventType;
  text: string;
  /** Epoch ms. */
  timestampMs: number;
  actor?: WorkspaceActor;
}
