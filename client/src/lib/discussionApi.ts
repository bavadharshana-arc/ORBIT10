import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

/* ============================================================
   DISCUSSION API (Phase 29; attachments added Phase 33)

   Mirrors server/src/services/discussion.service.ts's return shape
   exactly. No embedded author objects (authorId/userId strings only —
   resolved into WorkspaceActors at the call site, same as Comments/
   Files). Only the operations the backend actually supports are
   exposed here: create, list, pin/unpin (the only field
   PATCH .../discussions/:id accepts), reply (create only — no
   edit/delete reply endpoint exists), react/unreact, and attach (link
   an already-uploaded ProjectFile — the backend has no raw file
   upload/storage of its own, Phase 15's approved scope; see
   discussionAttachment.service.ts). There is no discussion delete or
   body-edit endpoint, and no detach/remove-attachment caller yet — the
   backend's DELETE .../attachments/:attachmentId exists but no UI
   trigger for removing an already-posted attachment does, so it isn't
   exposed here either (same "only what has a real caller" convention
   taskApi.ts/workspaceApi.ts already follow).
============================================================ */

export type DiscussionType = "update" | "question" | "announcement";

export interface DiscussionReplyRecord {
  id: string;
  discussionId: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface DiscussionReactionRecord {
  id: string;
  discussionId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface DiscussionAttachmentRecord {
  id: string;
  discussionId: string;
  fileId: string;
  createdAt: string;
  file: {
    id: string;
    name: string;
    extension: string;
    sizeBytes: number;
  };
}

export interface DiscussionRecord {
  id: string;
  projectId: string;
  type: DiscussionType;
  body: string;
  authorId: string;
  pinned: boolean;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
  replies: DiscussionReplyRecord[];
  reactions: DiscussionReactionRecord[];
  attachments: DiscussionAttachmentRecord[];
}

const discussionsPath = (workspaceId: string, projectId: string) =>
  `/workspaces/${workspaceId}/projects/${projectId}/discussions`;

export function listDiscussions(workspaceId: string, projectId: string): Promise<DiscussionRecord[]> {
  return apiGet<DiscussionRecord[]>(discussionsPath(workspaceId, projectId));
}

export function createDiscussion(
  workspaceId: string,
  projectId: string,
  input: { type: DiscussionType; body: string; mentions?: string[] },
): Promise<DiscussionRecord> {
  return apiPost<DiscussionRecord>(discussionsPath(workspaceId, projectId), input);
}

export function setPinned(
  workspaceId: string,
  projectId: string,
  discussionId: string,
  pinned: boolean,
): Promise<DiscussionRecord> {
  return apiPatch<DiscussionRecord>(`${discussionsPath(workspaceId, projectId)}/${discussionId}`, { pinned });
}

export function addReply(
  workspaceId: string,
  projectId: string,
  discussionId: string,
  text: string,
): Promise<DiscussionReplyRecord> {
  return apiPost<DiscussionReplyRecord>(`${discussionsPath(workspaceId, projectId)}/${discussionId}/replies`, {
    text,
  });
}

export function addReaction(
  workspaceId: string,
  projectId: string,
  discussionId: string,
  emoji: string,
): Promise<DiscussionReactionRecord> {
  return apiPost<DiscussionReactionRecord>(`${discussionsPath(workspaceId, projectId)}/${discussionId}/reactions`, {
    emoji,
  });
}

export function removeReaction(
  workspaceId: string,
  projectId: string,
  discussionId: string,
  emoji: string,
): Promise<void> {
  return apiDelete(`${discussionsPath(workspaceId, projectId)}/${discussionId}/reactions/${encodeURIComponent(emoji)}`);
}

/**
 * POST .../discussions/:discussionId/attachments — links an existing
 * ProjectFile (fileApi.ts's real, already-uploaded file records) to a
 * discussion. `discussionId` must already exist, so ProjectDiscussionsTab
 * calls this only after createDiscussion's response comes back, not as
 * part of the create body itself.
 */
export function addAttachment(
  workspaceId: string,
  projectId: string,
  discussionId: string,
  fileId: string,
): Promise<DiscussionAttachmentRecord> {
  return apiPost<DiscussionAttachmentRecord>(`${discussionsPath(workspaceId, projectId)}/${discussionId}/attachments`, {
    fileId,
  });
}
