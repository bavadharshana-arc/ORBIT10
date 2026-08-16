import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

/* ============================================================
   PROJECT MEMBERS (Phase 22; wired into ProjectTeamTab.tsx Phase 34;
   writes added Stage 6 — Permissions Alignment)

   Mirrors what server/src/services/projectMember.service.ts's
   memberWithUser now selects — every ProjectMember column plus the
   Phase 18 User profile fields, minus password. The write endpoints
   (add/updateRole/remove) always existed on the backend
   (projectMember.routes.ts) but were unwired on the frontend until
   Stage 6, which needed them: real project-content permissions
   (ProjectWorkspace.tsx's `permission`) derive from these rows, so
   without a real way to add someone, only each project's original
   creator could ever have one.
============================================================ */

export const PROJECT_ROLES = ["Owner", "Editor", "Commenter", "Viewer"] as const;
export type ProjectMemberRole = (typeof PROJECT_ROLES)[number];

export interface ProjectMemberProfile {
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

export interface ProjectMemberRecord {
  id: string;
  userId: string;
  projectId: string;
  role: string;
  createdAt: string;
  user: ProjectMemberProfile;
}

const membersPath = (workspaceId: string, projectId: string) => `/workspaces/${workspaceId}/projects/${projectId}/members`;

/** GET .../members — every member of the project, oldest first. Any workspace member may list. */
export function listProjectMembers(workspaceId: string, projectId: string): Promise<ProjectMemberRecord[]> {
  return apiGet<ProjectMemberRecord[]>(membersPath(workspaceId, projectId));
}

/** POST .../members — adds a real workspace member to this project. Caller must already be an Owner of this project (requireProjectRole("Owner")). */
export function addProjectMember(
  workspaceId: string,
  projectId: string,
  userId: string,
  role: ProjectMemberRole,
): Promise<ProjectMemberRecord> {
  return apiPost<ProjectMemberRecord>(membersPath(workspaceId, projectId), { userId, role });
}

/** PATCH .../members/:memberId — changes a project member's role. Owner only; the backend rejects demoting the last Owner. */
export function updateProjectMemberRole(
  workspaceId: string,
  projectId: string,
  memberId: string,
  role: ProjectMemberRole,
): Promise<ProjectMemberRecord> {
  return apiPatch<ProjectMemberRecord>(`${membersPath(workspaceId, projectId)}/${memberId}`, { role });
}

/** DELETE .../members/:memberId — removes a project member. Owner only; the backend rejects removing the last Owner. */
export function removeProjectMember(workspaceId: string, projectId: string, memberId: string): Promise<void> {
  return apiDelete(`${membersPath(workspaceId, projectId)}/${memberId}`);
}
