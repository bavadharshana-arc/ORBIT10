import type { Project, ProjectPermission, TeamMember } from "../types/dashboard";
import type { Task } from "./taskData";
import type { Member } from "./teamData";
import type { AuthUser } from "../types/auth";
import type {
  ActivityEvent,
  ActivityFeedItem,
  Discussion,
  FileKind,
  ProjectFileRecord,
  WorkspaceActor,
} from "../types/workspace";

/* ============================================================
   ID GENERATION
   Mirrors the `${prefix}-${Date.now()}-${rand}` shape every other
   data file (taskData.ts, teamData.ts, projectData.ts) already
   uses for its own ids — kept local here rather than imported from
   one of those, since none of them is a natural "owner" of a
   cross-domain id helper.
============================================================ */

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Recovers the epoch-ms embedded in a `generateId()`-style id
 * (`prefix-<13 digit timestamp>-rand`). Lets the Activity tab sort
 * Task.activity entries — which only carry a display string like
 * "Just now" — by real time without adding a parallel timestamp
 * field to Task. Ids that don't match the pattern (hand-seeded ones
 * like "activity-1") fall back to `fallback`, sorting oldest by
 * default so they never masquerade as recent.
 */
function idTimestamp(id: string, fallback = 0): number {
  const match = id.match(/-(\d{10,})-/);
  if (!match) return fallback;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : fallback;
}

/* ============================================================
   RELATIVE TIME
============================================================ */

/** Truncates to `maxLength` characters, appending an ellipsis when cut — used for notification message previews (comment text, etc.) so a long body doesn't blow out the notification list. */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 30_000) return "Just now";

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const date = new Date(ms);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: sameYear ? undefined : "numeric" });
}

/* ============================================================
   PROJECT <-> MEMBER RESOLUTION
   Project.people only stores the lightweight TeamMember shape
   (initials/bg/fg). These helpers resolve it against the full
   workspace roster (teamData.ts) so the workspace can show names,
   job titles, and status without inventing a parallel member list.
============================================================ */

export function matchMember(person: TeamMember, members: Member[]): Member | undefined {
  return members.find((member) => member.initials === person.initials && member.bg === person.bg);
}

export function toActor(member: Member): WorkspaceActor {
  return { id: member.id, name: member.name, initials: member.initials, bg: member.bg, fg: member.fg };
}

/** Resolves every person on a project to a WorkspaceActor, falling back to a synthetic actor (keyed by initials) for anyone not found in the workspace roster. */
export function getProjectActors(project: Project, members: Member[]): WorkspaceActor[] {
  return project.people.map((person, index) => {
    const matched = matchMember(person, members);
    if (matched) return toActor(matched);
    return { id: `unmatched-${person.initials}-${index}`, name: person.initials, initials: person.initials, bg: person.bg, fg: person.fg };
  });
}

/**
 * Resolves the signed-in AuthContext user (pass `useAuth().user` in) to
 * a WorkspaceActor — matched against the roster by email when they have
 * a roster row (so they inherit their real avatar colors/id from
 * teamData.ts), otherwise synthesized straight from their AuthUser
 * identity. No longer hardcodes "Maya Chen": a freshly registered
 * account, or one of AuthContext's dev/test role accounts (see
 * AuthContext.tsx's MOCK_ROLE_ACCOUNTS), has no roster row and so
 * resolves to *their own* name/initials instead of someone else's.
 * Falls back to a nameless guest actor when signed out — shouldn't
 * happen for any caller, since every page that resolves an actor sits
 * behind ProtectedRoute, but keeps this total rather than throwing.
 */
export function resolveCurrentActor(members: Member[], authUser: AuthUser | null): WorkspaceActor {
  if (!authUser) {
    return { id: "guest", name: "Guest", initials: "?", bg: "#AFC5DA", fg: "#20242B" };
  }
  const match = members.find((member) => member.email === authUser.email);
  if (match) return toActor(match);
  return { id: authUser.id, name: authUser.name, initials: authUser.initials, bg: "#AFC5DA", fg: "#20242B" };
}

/* ============================================================
   PERMISSIONS
   Rank-based so every other check is "at least as much access as
   X" rather than an exact match — Owner already satisfies an
   Editor-gated action, Editor already satisfies a Commenter-gated
   one, and so on. Project pages should gate UI through the canX()
   helpers below rather than comparing ProjectPermission values
   directly, so the hierarchy only has to be defined once here.
============================================================ */

export const PROJECT_PERMISSIONS: ProjectPermission[] = ["Owner", "Editor", "Commenter", "Viewer"];

export function getProjectPermission(project: Project, initials: string): ProjectPermission {
  return project.memberRoles?.[initials] ?? "Editor";
}

const PERMISSION_RANK: Record<ProjectPermission, number> = {
  Viewer: 0,
  Commenter: 1,
  Editor: 2,
  Owner: 3,
};

/** True when `permission` grants at least as much access as `required`. */
export function hasProjectPermission(permission: ProjectPermission, required: ProjectPermission): boolean {
  return PERMISSION_RANK[permission] >= PERMISSION_RANK[required];
}

/** Create/edit/delete tasks, drag cards between statuses, upload or delete files, attach files in Discussions — Editor and Owner. */
export function canEditProjectContent(permission: ProjectPermission): boolean {
  return hasProjectPermission(permission, "Editor");
}

/** Comment on tasks, post/reply/react in Discussions — Commenter, Editor, and Owner (i.e. everyone except Viewer). */
export function canCommentOnProject(permission: ProjectPermission): boolean {
  return hasProjectPermission(permission, "Commenter");
}

/** Manage the project itself: edit details, membership, per-member permissions, duplicate/archive/delete — Owner only. */
export function canManageProject(permission: ProjectPermission): boolean {
  return hasProjectPermission(permission, "Owner");
}

/**
 * Resolves a user's ProjectPermission for a task/card that only carries a
 * project *name* (Task.project, or the Kanban page's KanbanTask.project) —
 * for the workspace-wide Tasks and Kanban pages, which aren't nested under
 * a single project's context and so have to look the project up per task.
 * Falls back to "Editor" (the same default getProjectPermission() already
 * uses for a member with no explicit entry) when no project matches the
 * name, rather than silently locking the task down over stale/mismatched
 * data.
 */
export function getPermissionForProjectName(projectName: string, projects: Project[], initials: string): ProjectPermission {
  const project = projects.find((candidate) => candidate.name === projectName);
  if (!project) return "Editor";
  return getProjectPermission(project, initials);
}

/* ============================================================
   WORKLOAD
============================================================ */

export interface MemberWorkload {
  active: number;
  completed: number;
  total: number;
}

export function getMemberWorkload(initials: string, projectTasks: Task[]): MemberWorkload {
  const assigned = projectTasks.filter((task) => {
    if (task.assignees && task.assignees.length > 0) return task.assignees.some((a) => a.initials === initials);
    return task.assignee?.initials === initials;
  });

  return {
    active: assigned.filter((task) => task.status !== "Completed").length,
    completed: assigned.filter((task) => task.status === "Completed").length,
    total: assigned.length,
  };
}

/* ============================================================
   ASSIGNEE OPTIONS FOR CreateTaskDrawer
   Scoped to the current project's people, rather than the
   workspace-wide `team` record Tasks.tsx/Kanban.tsx use — a task
   created from inside a project workspace should only offer that
   project's members as assignees.
============================================================ */

export interface ProjectAssigneeOption {
  key: string;
  label: string;
  /** Full TeamMember (not just initials) so callers can build Task.assignees directly from the selected option, without a second lookup. */
  member: TeamMember;
}

export function buildProjectAssigneeOptions(project: Project, members: Member[]): ProjectAssigneeOption[] {
  return project.people.map((person, index) => {
    const matched = matchMember(person, members);
    return {
      key: matched?.id ?? `${person.initials}-${index}`,
      label: matched?.name ?? person.initials,
      member: person,
    };
  });
}

/* ============================================================
   PROJECT CREATED AT
   Falls back to the timestamp embedded in generateProjectId()'s
   output (`project-<ts>-rand`) for projects created before
   Project.createdAt existed, or without ever reading/writing a
   migration. Seed projects (plain ids like "orbit-mobile-app")
   have neither, so callers should treat `null` as "unknown".
============================================================ */

export function getProjectCreatedAt(project: Project): number | null {
  if (project.createdAt) {
    const parsed = new Date(project.createdAt).getTime();
    if (Number.isFinite(parsed)) return parsed;
  }

  const match = project.id.match(/^project-(\d{10,})-/);
  return match ? Number(match[1]) : null;
}

/* ============================================================
   FILES
============================================================ */

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  let decimals = value < 10 ? 1 : 0;
  // The unit above was picked from the raw value, but rounding for
  // display can itself round up to "1024" (e.g. 1023.6 KB -> "1024 KB")
  // instead of promoting to the next unit — reapply the same promotion
  // against the rounded value that's actually about to be shown.
  if (Number(value.toFixed(decimals)) >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
    decimals = value < 10 ? 1 : 0;
  }
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

export function inferFileKind(extension: string): FileKind {
  const ext = extension.toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["xlsx", "xls", "csv"].includes(ext)) return "spreadsheet";
  if (["doc", "docx", "md", "txt", "rtf"].includes(ext)) return "document";
  return "other";
}

export const FILE_KIND_LABEL: Record<FileKind, string> = {
  document: "Document",
  pdf: "PDF",
  image: "Image",
  spreadsheet: "Spreadsheet",
  other: "File",
};

export const DEFAULT_FOLDER = "General";

/**
 * A small, in-memory-only registry mapping a file id to a real
 * blob: URL created via URL.createObjectURL() for files actually
 * picked/dropped by the user this session. Module-level (not React
 * state) so it survives the Files/Discussions tabs unmounting on
 * route navigation, and is intentionally excluded from the
 * persisted ProjectFileRecord — blob URLs don't survive a reload
 * anyway. Seed/demo files never get an entry, so their preview
 * falls back to a generated placeholder.
 */
const sessionObjectUrls = new Map<string, string>();

export function setSessionObjectUrl(fileId: string, url: string): void {
  sessionObjectUrls.set(fileId, url);
}

export function getSessionObjectUrl(fileId: string): string | undefined {
  return sessionObjectUrls.get(fileId);
}

/** Releases a file's blob URL — call when the file it belongs to is deleted, so its memory isn't held for the rest of the session. */
export function clearSessionObjectUrl(fileId: string): void {
  const url = sessionObjectUrls.get(fileId);
  if (!url) return;
  URL.revokeObjectURL(url);
  sessionObjectUrls.delete(fileId);
}

/** Exported so usePersistedState() call sites (ProjectFilesTab) key off the exact same string as the raw read/write helpers below (used by cross-tab writers like the Discussions composer's file attach). */
export function projectFilesKey(projectId: string): string {
  return `orbit-project-files-${projectId}`;
}

export function readProjectFiles(projectId: string): ProjectFileRecord[] {
  try {
    const stored = localStorage.getItem(projectFilesKey(projectId));
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as ProjectFileRecord[]) : [];
  } catch (error) {
    console.error("Failed to load project files:", error);
    return [];
  }
}

export function writeProjectFiles(projectId: string, files: ProjectFileRecord[]): void {
  try {
    localStorage.setItem(projectFilesKey(projectId), JSON.stringify(files));
  } catch (error) {
    console.error("Failed to save project files:", error);
  }
}

/** Appends a file directly to a project's store via localStorage, for callers (e.g. the Discussions composer's file attach) that aren't the mounted Files tab and so don't hold its usePersistedState. */
export function appendProjectFile(projectId: string, file: ProjectFileRecord): void {
  writeProjectFiles(projectId, [file, ...readProjectFiles(projectId)]);
}

export function seedFilesForProject(project: Project, members: Member[]): ProjectFileRecord[] {
  const actors = getProjectActors(project, members);
  if (actors.length === 0) return [];

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const templates: { name: string; extension: string; kind: FileKind; sizeBytes: number; folder: string; daysAgo: number }[] = [
    { name: `${project.tag} kickoff brief`, extension: "pdf", kind: "pdf", sizeBytes: 1_240_000, folder: "General", daysAgo: 6 },
    { name: `${project.name} roadmap`, extension: "docx", kind: "document", sizeBytes: 86_000, folder: "Planning", daysAgo: 4 },
    { name: "Reference visuals", extension: "png", kind: "image", sizeBytes: 2_050_000, folder: "Design", daysAgo: 2 },
  ];

  return templates.map((template, index) => ({
    id: generateId("file"),
    projectId: project.id,
    name: template.name,
    extension: template.extension,
    kind: template.kind,
    sizeBytes: template.sizeBytes,
    folder: template.folder,
    uploadedBy: actors[index % actors.length],
    uploadedAt: now - template.daysAgo * day,
  }));
}

/* ============================================================
   DISCUSSIONS
============================================================ */

export const REACTION_EMOJIS = ["👍", "🎉", "❤️", "👀", "🚀"];

export const DISCUSSION_TYPE_LABEL: Record<Discussion["type"], string> = {
  update: "Update",
  question: "Question",
  announcement: "Announcement",
};

export function discussionsKey(projectId: string): string {
  return `orbit-project-discussions-${projectId}`;
}

export function readProjectDiscussions(projectId: string): Discussion[] {
  try {
    const stored = localStorage.getItem(discussionsKey(projectId));
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as Discussion[]) : [];
  } catch (error) {
    console.error("Failed to load project discussions:", error);
    return [];
  }
}

export function seedDiscussionsForProject(project: Project, members: Member[]): Discussion[] {
  const actors = getProjectActors(project, members);
  if (actors.length === 0) return [];

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const author = actors[0];
  const responder = actors[1 % actors.length];

  const seeded: Discussion[] = [
    {
      id: generateId("discussion"),
      projectId: project.id,
      type: "announcement",
      body: `Kicking off ${project.name} 🚀 — excited to get started. Drop questions or blockers here as they come up.`,
      author,
      createdAt: now - 5 * day,
      pinned: true,
      mentions: [],
      attachments: [],
      reactions: responder.id !== author.id ? { "🎉": [responder.id] } : {},
      replies:
        responder.id !== author.id
          ? [{ id: generateId("reply"), author: responder, text: "Looking forward to it!", createdAt: now - 5 * day + 3_600_000 }]
          : [],
    },
    {
      id: generateId("discussion"),
      projectId: project.id,
      type: "update",
      body: `Progress update: we're at ${project.progress}% complete. Good momentum this week — nice work everyone.`,
      author: responder,
      createdAt: now - 2 * day,
      pinned: false,
      mentions: [],
      attachments: [],
      reactions: {},
      replies: [],
    },
  ];

  return seeded;
}

/* ============================================================
   ACTIVITY
============================================================ */

function activityKey(projectId: string): string {
  return `orbit-project-activity-${projectId}`;
}

export function readProjectActivity(projectId: string): ActivityEvent[] {
  try {
    const stored = localStorage.getItem(activityKey(projectId));
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as ActivityEvent[]) : [];
  } catch (error) {
    console.error("Failed to load project activity:", error);
    return [];
  }
}

export function writeProjectActivity(projectId: string, events: ActivityEvent[]): void {
  try {
    localStorage.setItem(activityKey(projectId), JSON.stringify(events));
  } catch (error) {
    console.error("Failed to save project activity:", error);
  }
}

/** Logs one explicit activity event (file uploads, member changes, discussion posts, milestones) — task lifecycle events are derived live from Task.activity in buildProjectActivityFeed() instead, so they're never logged here. */
export function appendProjectActivity(
  projectId: string,
  event: Pick<ActivityEvent, "type" | "text"> & Partial<Pick<ActivityEvent, "actor">>
): ActivityEvent {
  const entry: ActivityEvent = {
    id: generateId("activity-evt"),
    projectId,
    createdAt: Date.now(),
    type: event.type,
    text: event.text,
    actor: event.actor,
  };

  writeProjectActivity(projectId, [entry, ...readProjectActivity(projectId)]);
  return entry;
}

/** Finds when a task most recently landed on "Completed", by reading the real epoch-ms embedded in its "Status changed to Completed" activity entry's id. Used by the Analytics tab's velocity chart. Returns null for tasks that were never completed, or whose completion entry predates generateId()'s timestamp convention. */
export function getTaskCompletedAt(task: Task): number | null {
  const entry = [...(task.activity ?? [])].reverse().find((e) => e.text === "Status changed to Completed");
  if (!entry) return null;
  const ts = idTimestamp(entry.id, 0);
  return ts > 0 ? ts : null;
}

function inferTaskEventType(text: string): ActivityFeedItem["type"] {
  if (text === "Task created") return "task_created";
  if (text.startsWith("Status changed")) return "status_changed";
  if (text === "Added a comment") return "comment_added";
  return "task_updated";
}

/**
 * Merges the project's explicit activity log with events derived
 * live from its tasks (created/status/priority/assignee/comment,
 * read straight off Task.activity) and, when knowable, a single
 * "project created" event — a single chronological feed without
 * ever duplicating Task's own state into a second store.
 */
export function buildProjectActivityFeed(project: Project, projectTasks: Task[], events: ActivityEvent[]): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = [];

  const createdAt = getProjectCreatedAt(project);
  if (createdAt) {
    items.push({ id: `project-created-${project.id}`, type: "project_created", text: `"${project.name}" was created`, timestampMs: createdAt });
  }

  projectTasks.forEach((task) => {
    (task.activity ?? []).forEach((entry) => {
      items.push({
        id: entry.id,
        type: inferTaskEventType(entry.text),
        text: `${entry.text} on "${task.title}"`,
        timestampMs: idTimestamp(entry.id, createdAt ?? 0),
      });
    });
  });

  events.forEach((event) => {
    items.push({ id: event.id, type: event.type, text: event.text, timestampMs: event.createdAt, actor: event.actor });
  });

  return items.sort((a, b) => b.timestampMs - a.timestampMs);
}
