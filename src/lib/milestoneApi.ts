import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

/* ============================================================
   MILESTONE API (Phase 36)

   Mirrors server/src/services/milestone.service.ts's return shape
   exactly. Same two-level project/workspace scoping as objectiveApi.ts
   — see its doc comment.
============================================================ */

export interface MilestoneRecord {
  id: string;
  title: string;
  done: boolean;
  /** ISO timestamp (UTC midnight for a date-only value), or null — matches task.controller.ts's dueDate convention. */
  dueDate: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneWriteInput {
  title?: string;
  done?: boolean;
  /** "YYYY-MM-DD", or null to clear — matches the backend's parseDueDate contract exactly. */
  dueDate?: string | null;
}

const milestonesPath = (workspaceId: string, projectId: string) =>
  `/workspaces/${workspaceId}/projects/${projectId}/milestones`;

/** GET .../milestones — every milestone on the project, oldest first. */
export function listMilestones(workspaceId: string, projectId: string): Promise<MilestoneRecord[]> {
  return apiGet<MilestoneRecord[]>(milestonesPath(workspaceId, projectId));
}

export function createMilestone(
  workspaceId: string,
  projectId: string,
  title: string,
  dueDate?: string | null,
): Promise<MilestoneRecord> {
  return apiPost<MilestoneRecord>(milestonesPath(workspaceId, projectId), { title, dueDate });
}

export function updateMilestone(
  workspaceId: string,
  projectId: string,
  milestoneId: string,
  input: MilestoneWriteInput,
): Promise<MilestoneRecord> {
  return apiPatch<MilestoneRecord>(`${milestonesPath(workspaceId, projectId)}/${milestoneId}`, input);
}

export function deleteMilestone(
  workspaceId: string,
  projectId: string,
  milestoneId: string,
): Promise<void> {
  return apiDelete(`${milestonesPath(workspaceId, projectId)}/${milestoneId}`);
}
