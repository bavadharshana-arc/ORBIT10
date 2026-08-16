import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

/* ============================================================
   TASK API (Phase 26)

   Mirrors server/src/services/task.service.ts's return shape exactly.
   Note the backend's TASK_STATUSES/TASK_PRIORITIES vocabularies are
   wider than the frontend's Status/Priority types (data/taskData.ts) —
   6 statuses ("To Do"/"In Progress"/"In Review"/"Completed"/"Blocked"/
   "Backlog") vs. 3, and 4 priorities vs. 3. TaskRecord types these as
   plain strings (the real values); the mapping into the frontend's
   narrower Task shape (see TaskContext.tsx) clamps anything outside
   the existing 3/3 vocabulary to the closest existing value rather
   than widening Status/Priority across every consumer that switches
   on them.
============================================================ */

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWriteInput {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  /** "YYYY-MM-DD", or null to clear — matches the backend's parseDueDate contract exactly. */
  dueDate?: string | null;
}

export function listTasks(workspaceId: string, projectId: string): Promise<TaskRecord[]> {
  return apiGet<TaskRecord[]>(`/workspaces/${workspaceId}/projects/${projectId}/tasks`);
}

export function getTask(workspaceId: string, projectId: string, taskId: string): Promise<TaskRecord> {
  return apiGet<TaskRecord>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`);
}

export function createTask(
  workspaceId: string,
  projectId: string,
  input: TaskWriteInput & { title: string },
): Promise<TaskRecord> {
  return apiPost<TaskRecord>(`/workspaces/${workspaceId}/projects/${projectId}/tasks`, input);
}

export function updateTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
  input: TaskWriteInput,
): Promise<TaskRecord> {
  return apiPatch<TaskRecord>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`, input);
}

export function deleteTask(workspaceId: string, projectId: string, taskId: string): Promise<void> {
  return apiDelete(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`);
}
