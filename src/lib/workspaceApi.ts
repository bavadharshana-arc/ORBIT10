import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

/* ============================================================
   WORKSPACE API

   Mirrors what server/src/services/workspace.service.ts's
   createWorkspace/findWorkspaceById/updateWorkspace return — every
   Workspace column (no relations included).
============================================================ */

export interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string | null;
  timezone: string | null;
  dateFormat: string | null;
  weekStart: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSettingsUpdate {
  name: string;
  slug: string;
  timezone: string;
  dateFormat: string;
  weekStart: string;
}

/** GET /api/workspaces — every workspace the caller belongs to, oldest first. */
export function listMyWorkspaces(): Promise<WorkspaceRecord[]> {
  return apiGet<WorkspaceRecord[]>("/workspaces");
}

/**
 * POST /api/workspaces — creates a workspace owned by the caller (identity
 * comes from the Bearer token, not the request body — see
 * workspace.controller.ts's createWorkspace). The caller is made its first
 * OWNER member server-side; slug/timezone/dateFormat/weekStart all start
 * unset, same as any workspace before someone visits Settings -> Workspace.
 */
export function createWorkspace(name: string): Promise<WorkspaceRecord> {
  return apiPost<WorkspaceRecord>("/workspaces", { name });
}

/**
 * Full-replace update of the five Settings -> Workspace fields — matches
 * PATCH /api/workspaces/:id's actual contract (all five required), not a
 * partial patch.
 */
export function updateWorkspaceSettings(
  workspaceId: string,
  update: WorkspaceSettingsUpdate,
): Promise<WorkspaceRecord> {
  return apiPatch<WorkspaceRecord>(`/workspaces/${workspaceId}`, update);
}

/* ============================================================
   WORKSPACE MEMBERS (Phase 20; read wired into Team.tsx Phase 21;
   full CRUD wired into Team.tsx as its primary data source, Stage 1)

   Mirrors what server/src/services/workspace.service.ts's
   memberWithUser now selects — every WorkspaceMember column plus the
   Phase 18 User profile fields, minus password.
============================================================ */

export const WORKSPACE_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export interface WorkspaceMemberProfile {
  id: string;
  name: string | null;
  email: string;
  jobTitle: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  avatarBg: string | null;
  avatarFg: string | null;
}

export interface WorkspaceMemberRecord {
  id: string;
  userId: string;
  workspaceId: string;
  role: string;
  createdAt: string;
  user: WorkspaceMemberProfile;
}

/** GET /api/workspaces/:id/members — every member of the workspace, oldest first. */
export function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberRecord[]> {
  return apiGet<WorkspaceMemberRecord[]>(`/workspaces/${workspaceId}/members`);
}

/**
 * POST /api/workspaces/:id/members — adds an existing ORBIT user to the
 * workspace. The backend only ever accepted `userId` (an internal id
 * nothing in the UI exposes); Stage 1 added `email` as an alternative,
 * resolved server-side via the same user lookup login already uses — no
 * new route, no invitation system, no schema change. A 404 here means no
 * ORBIT account exists for that email yet (they'd need to register
 * first) — same as an unresolvable userId would 404.
 */
export function addWorkspaceMember(
  workspaceId: string,
  email: string,
  role: WorkspaceRole,
): Promise<WorkspaceMemberRecord> {
  return apiPost<WorkspaceMemberRecord>(`/workspaces/${workspaceId}/members`, { email, role });
}

/** PATCH /api/workspaces/:id/members/:memberId — OWNER/ADMIN only; the backend also refuses to demote the last OWNER. */
export function updateWorkspaceMemberRole(
  workspaceId: string,
  memberId: string,
  role: WorkspaceRole,
): Promise<WorkspaceMemberRecord> {
  return apiPatch<WorkspaceMemberRecord>(`/workspaces/${workspaceId}/members/${memberId}`, { role });
}

/** DELETE /api/workspaces/:id/members/:memberId — OWNER/ADMIN only; the backend also refuses to remove the last OWNER. */
export function removeWorkspaceMember(workspaceId: string, memberId: string): Promise<void> {
  return apiDelete(`/workspaces/${workspaceId}/members/${memberId}`);
}
