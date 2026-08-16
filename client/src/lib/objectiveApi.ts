import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

/* ============================================================
   OBJECTIVE API (Phase 36)

   Mirrors server/src/services/objective.service.ts's return shape
   exactly. Mounted under a project, same two-level scoping every
   other project-nested resource (Task, Discussion, ProjectFile) uses
   — the backend verifies :projectId belongs to :workspaceId on every
   request (project.controller.ts's findProjectInWorkspace), so a
   mismatched pair 404s rather than leaking another project's data.
============================================================ */

export interface ObjectiveRecord {
  id: string;
  text: string;
  done: boolean;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ObjectiveWriteInput {
  text?: string;
  done?: boolean;
}

const objectivesPath = (workspaceId: string, projectId: string) =>
  `/workspaces/${workspaceId}/projects/${projectId}/objectives`;

/** GET .../objectives — every objective on the project, oldest first. */
export function listObjectives(workspaceId: string, projectId: string): Promise<ObjectiveRecord[]> {
  return apiGet<ObjectiveRecord[]>(objectivesPath(workspaceId, projectId));
}

export function createObjective(
  workspaceId: string,
  projectId: string,
  text: string,
): Promise<ObjectiveRecord> {
  return apiPost<ObjectiveRecord>(objectivesPath(workspaceId, projectId), { text });
}

export function updateObjective(
  workspaceId: string,
  projectId: string,
  objectiveId: string,
  input: ObjectiveWriteInput,
): Promise<ObjectiveRecord> {
  return apiPatch<ObjectiveRecord>(`${objectivesPath(workspaceId, projectId)}/${objectiveId}`, input);
}

export function deleteObjective(
  workspaceId: string,
  projectId: string,
  objectiveId: string,
): Promise<void> {
  return apiDelete(`${objectivesPath(workspaceId, projectId)}/${objectiveId}`);
}
