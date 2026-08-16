import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

/* ============================================================
   TASK COMMENT API (Phase 27)

   Mirrors server/src/services/comment.service.ts's return shape exactly
   — no embedded author object, just authorId (resolved into a real
   WorkspaceActor at the call site — see hooks/useTaskCommentHandlers.ts).
============================================================ */

export interface CommentRecord {
  id: string;
  text: string;
  taskId: string;
  authorId: string;
  createdAt: string;
  editedAt: string | null;
}

const commentsPath = (workspaceId: string, projectId: string, taskId: string) =>
  `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/comments`;

export function listComments(workspaceId: string, projectId: string, taskId: string): Promise<CommentRecord[]> {
  return apiGet<CommentRecord[]>(commentsPath(workspaceId, projectId, taskId));
}

export function createComment(
  workspaceId: string,
  projectId: string,
  taskId: string,
  text: string,
): Promise<CommentRecord> {
  return apiPost<CommentRecord>(commentsPath(workspaceId, projectId, taskId), { text });
}

export function updateComment(
  workspaceId: string,
  projectId: string,
  taskId: string,
  commentId: string,
  text: string,
): Promise<CommentRecord> {
  return apiPatch<CommentRecord>(`${commentsPath(workspaceId, projectId, taskId)}/${commentId}`, { text });
}

export function deleteComment(
  workspaceId: string,
  projectId: string,
  taskId: string,
  commentId: string,
): Promise<void> {
  return apiDelete(`${commentsPath(workspaceId, projectId, taskId)}/${commentId}`);
}
