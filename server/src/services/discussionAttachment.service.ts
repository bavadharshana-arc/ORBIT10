import { prisma } from "../lib/prisma";
import { findDiscussionInProject } from "./discussion.service";
import { findFileInProject } from "./projectFile.service";

export const withFile = {
  include: { file: true },
} as const;

export const listAttachmentsForDiscussion = async (discussionId: string) => {
  return prisma.discussionAttachment.findMany({
    where: { discussionId },
    orderBy: { createdAt: "asc" },
    ...withFile,
  });
};

/** Lightweight existence/scoping check — no relations — used before delete. */
export const findAttachmentInDiscussion = async (discussionId: string, attachmentId: string) => {
  return prisma.discussionAttachment.findFirst({ where: { id: attachmentId, discussionId } });
};

/**
 * Attaches a ProjectFile to a Discussion. Both the discussion and the file
 * must already belong to `projectId` — cross-project attachment would leak
 * file metadata across project boundaries, the same isolation rule
 * Task.assigneeId and ProjectMember.userId enforce relative to their own
 * scopes (Phase 16 approved Option B).
 */
export const addAttachment = async (projectId: string, discussionId: string, fileId: string) => {
  const discussion = await findDiscussionInProject(projectId, discussionId);
  if (!discussion) {
    throw new Error("Discussion not found");
  }

  const file = await findFileInProject(projectId, fileId);
  if (!file) {
    throw new Error("File not found");
  }

  const existing = await prisma.discussionAttachment.findUnique({
    where: { discussionId_fileId: { discussionId, fileId } },
  });
  if (existing) {
    throw new Error("File is already attached to this discussion");
  }

  return prisma.discussionAttachment.create({
    data: { discussionId, fileId },
    ...withFile,
  });
};

export const removeAttachment = async (
  projectId: string,
  discussionId: string,
  attachmentId: string,
) => {
  const discussion = await findDiscussionInProject(projectId, discussionId);
  if (!discussion) {
    throw new Error("Discussion not found");
  }

  const attachment = await findAttachmentInDiscussion(discussionId, attachmentId);
  if (!attachment) {
    throw new Error("Attachment not found");
  }

  await prisma.discussionAttachment.delete({ where: { id: attachmentId } });
};
