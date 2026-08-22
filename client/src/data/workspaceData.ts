import type { Project, ProjectPermission } from "../types/dashboard";
import type { Task } from "./taskData";
import type { Member } from "./teamData";
import type { AuthUser } from "../types/auth";
import type {
  ActivityEvent,
  ActivityFeedItem,
  Discussion,
  FileKind,
  WorkspaceActor,
} from "../types/workspace";



export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}


function idTimestamp(id: string, fallback = 0): number {
  const match = id.match(/-(\d{10,})-/);
  if (!match) return fallback;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : fallback;
}


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



// matchMember/getProjectActors (matched TeamMember-shaped "people" against
// the mock loadMembers() roster) were removed in the Phase 19 Frontend
// Integration follow-up — Project.people is gone, and ProjectDiscussionsTab's
// @mention actor list now maps straight from the real projectMembers
// (ProjectContext) instead of fuzzy-matching a local field against a
// mock list. Confirmed via grep before removal (both had zero remaining
// callers once ProjectSettingsTab.tsx's own members section, the other
// matchMember caller, was replaced by a pointer to the real Team tab).

export function toActor(member: Member): WorkspaceActor {
  return { id: member.id, name: member.name, initials: member.initials, bg: member.bg, fg: member.fg };
}

export function resolveCurrentActor(members: Member[], authUser: AuthUser | null): WorkspaceActor {
  if (!authUser) {
    return { id: "guest", name: "Guest", initials: "?", bg: "#AFC5DA", fg: "#20242B" };
  }
  const match = members.find((member) => member.email === authUser.email);
  if (match) return toActor(match);
  return { id: authUser.id, name: authUser.name, initials: authUser.initials, bg: "#AFC5DA", fg: "#20242B" };
}


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


export function hasProjectPermission(permission: ProjectPermission, required: ProjectPermission): boolean {
  return PERMISSION_RANK[permission] >= PERMISSION_RANK[required];
}


export function canEditProjectContent(permission: ProjectPermission): boolean {
  return hasProjectPermission(permission, "Editor");
}


export function canCommentOnProject(permission: ProjectPermission): boolean {
  return hasProjectPermission(permission, "Commenter");
}


export function canManageProject(permission: ProjectPermission): boolean {
  return hasProjectPermission(permission, "Owner");
}


export function getPermissionForProjectName(projectName: string, projects: Project[], initials: string): ProjectPermission {
  const project = projects.find((candidate) => candidate.name === projectName);
  if (!project) return "Editor";
  return getProjectPermission(project, initials);
}

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


// buildProjectAssigneeOptions/ProjectAssigneeOption (mock-roster-scoped
// assignee picker options) were removed in Stage 2 (Real Task Assignees)
// — every call site now builds its options from the real workspace
// roster instead (buildWorkspaceAssigneeOptions, TaskDetailsDrawer.tsx).

export function getProjectCreatedAt(project: Project): number | null {
  if (project.createdAt) {
    const parsed = new Date(project.createdAt).getTime();
    if (Number.isFinite(parsed)) return parsed;
  }

  const match = project.id.match(/^project-(\d{10,})-/);
  return match ? Number(match[1]) : null;
}

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


const sessionObjectUrls = new Map<string, string>();

export function setSessionObjectUrl(fileId: string, url: string): void {
  sessionObjectUrls.set(fileId, url);
}

export function getSessionObjectUrl(fileId: string): string | undefined {
  return sessionObjectUrls.get(fileId);
}

export function clearSessionObjectUrl(fileId: string): void {
  const url = sessionObjectUrls.get(fileId);
  if (!url) return;
  URL.revokeObjectURL(url);
  sessionObjectUrls.delete(fileId);
}
// projectFilesKey/readProjectFiles/writeProjectFiles/appendProjectFile/
// seedFilesForProject (localStorage-backed mock file list + demo seed
// generator) were removed in the Phase 19 Frontend Integration audit fix
// (Priority 6 & 7) — ProjectOverviewTab.tsx's filesCount stat, the last
// real (if stale) reader, now calls the real Files API
// (lib/fileApi.ts's listFiles) instead, same one ProjectFilesTab.tsx's
// own list already used. Confirmed via grep before removal.



export const REACTION_EMOJIS = ["👍", "🎉", "❤️", "👀", "🚀"];

export const DISCUSSION_TYPE_LABEL: Record<Discussion["type"], string> = {
  update: "Update",
  question: "Question",
  announcement: "Announcement",
};

// discussionsKey/readProjectDiscussions/seedDiscussionsForProject
// (localStorage-backed mock discussion list + demo seed generator) were
// removed in the Phase 19 Frontend Integration follow-up (Fix
// Discussions Count) — ProjectOverviewTab.tsx's discussionsCount stat,
// the last real (if stale) reader, now calls the real Discussions API
// (lib/discussionApi.ts's listDiscussions) instead, same one
// ProjectDiscussionsTab.tsx's own list already used. Confirmed via grep
// before removal.



// activityKey/readProjectActivity/writeProjectActivity/appendProjectActivity
// (localStorage-backed project activity) were removed in Stage 5 (Real
// Activity) once ProjectActivityTab.tsx/ProjectOverviewTab.tsx moved to
// real ActivityEvent rows (lib/activityApi.ts). Their last remaining
// caller, ProjectTeamTab.tsx's member add/remove, was itself migrated to
// the real ProjectMember API in Stage 6 (Permissions Alignment), which
// is what made these fully dead — confirmed via a zero-results grep
// before removal.

/** The task's own creation timestamp — straight from Task.createdAt (see TaskContext.mapTaskRecordToTask). Null on tasks built by an optimistic create that hasn't been refetched yet, same caveat as getProjectCreatedAt. */
export function getTaskCreatedAt(task: Task): number | null {
  return typeof task.createdAt === "number" ? task.createdAt : null;
}

export function getTaskCompletedAt(task: Task): number | null {
  // Prefer the session-local activity log when present — it's the more
  // precise signal (timestamped at the moment the status actually
  // flipped, during this session).
  const entry = [...(task.activity ?? [])].reverse().find((e) => e.text === "Status changed to Completed");
  if (entry) {
    const ts = idTimestamp(entry.id, 0);
    if (ts > 0) return ts;
  }

  // Fall back to Task.updatedAt for tasks loaded straight from the API —
  // TaskContext seeds `activity` empty (real per-status history isn't
  // fetched), so a task that was already Completed before this page load
  // would otherwise never show up here at all. The backend has no
  // dedicated completedAt column, so "last modified, while Completed" is
  // the closest true signal available rather than a fabricated one.
  if (task.status === "Completed" && typeof task.updatedAt === "number") {
    return task.updatedAt;
  }

  return null;
}

function inferTaskEventType(text: string): ActivityFeedItem["type"] {
  if (text === "Task created") return "task_created";
  if (text.startsWith("Status changed")) return "status_changed";
  if (text === "Added a comment") return "comment_added";
  return "task_updated";
}


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
