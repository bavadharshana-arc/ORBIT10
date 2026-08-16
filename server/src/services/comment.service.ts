import { prisma } from "../lib/prisma";
import type { WorkspaceRole } from "./workspace.service";

export const listCommentsForTask = async (taskId: string) => {
  return prisma.taskComment.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
  });
};

export const findCommentInTask = async (taskId: string, commentId: string) => {
  return prisma.taskComment.findFirst({ where: { id: commentId, taskId } });
};

export const createComment = async (taskId: string, authorId: string, text: string) => {
  return prisma.taskComment.create({ data: { taskId, authorId, text } });
};

export const updateComment = async (
  taskId: string,
  commentId: string,
  callerId: string,
  text: string,
) => {
  const comment = await findCommentInTask(taskId, commentId);
  if (!comment) {
    throw new Error("Comment not found");
  }

  if (comment.authorId !== callerId) {
    throw new Error("Only the comment author can edit this comment");
  }

  return prisma.taskComment.update({
    where: { id: commentId },
    data: { text, editedAt: new Date() },
  });
};

export const deleteComment = async (
  taskId: string,
  commentId: string,
  callerId: string,
  callerRole: WorkspaceRole,
) => {
  const comment = await findCommentInTask(taskId, commentId);
  if (!comment) {
    throw new Error("Comment not found");
  }

  const isAuthor = comment.authorId === callerId;
  const isModerator = callerRole === "OWNER" || callerRole === "ADMIN";

  if (!isAuthor && !isModerator) {
    throw new Error("Only the comment author or a workspace OWNER/ADMIN can delete this comment");
  }

  await prisma.taskComment.delete({ where: { id: commentId } });
};
