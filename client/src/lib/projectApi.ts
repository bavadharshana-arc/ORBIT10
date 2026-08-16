import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

/* ============================================================
   PROJECT API (Phase 25)

   Mirrors server/src/services/project.service.ts's return shape exactly
   — every Project column, no relations.
============================================================ */

export interface ProjectRecord {
  id: string;
  name: string;
  description: string | null;
  // Phase 19 Frontend Integration audit fix (Priority 8): previously
  // client-only fields that reset on every refresh — now real, persisted
  // columns (see server/prisma/schema.prisma's Project model).
  tag: string | null;
  color: string | null;
  /** "YYYY-MM-DD" — sliced from the ISO timestamp the API returns, same convention as TaskRecord.dueDate's client-side handling. */
  startDate: string | null;
  dueDate: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWriteInput {
  name?: string;
  description?: string;
  tag?: string | null;
  color?: string | null;
  /** "YYYY-MM-DD", or null to clear. */
  startDate?: string | null;
  /** "YYYY-MM-DD", or null to clear. */
  dueDate?: string | null;
}

export function listProjects(workspaceId: string): Promise<ProjectRecord[]> {
  return apiGet<ProjectRecord[]>(`/workspaces/${workspaceId}/projects`);
}

export function getProject(workspaceId: string, projectId: string): Promise<ProjectRecord> {
  return apiGet<ProjectRecord>(`/workspaces/${workspaceId}/projects/${projectId}`);
}

export function createProject(workspaceId: string, input: ProjectWriteInput & { name: string }): Promise<ProjectRecord> {
  return apiPost<ProjectRecord>(`/workspaces/${workspaceId}/projects`, input);
}

export function updateProject(
  workspaceId: string,
  projectId: string,
  input: ProjectWriteInput,
): Promise<ProjectRecord> {
  return apiPatch<ProjectRecord>(`/workspaces/${workspaceId}/projects/${projectId}`, input);
}

export function deleteProject(workspaceId: string, projectId: string): Promise<void> {
  return apiDelete(`/workspaces/${workspaceId}/projects/${projectId}`);
}
