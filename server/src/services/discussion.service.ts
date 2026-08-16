import { prisma } from "../lib/prisma";

export const DISCUSSION_TYPES = ["update", "question", "announcement"] as const;
export type DiscussionType = (typeof DISCUSSION_TYPES)[number];
export const isDiscussionType = (value: unknown): value is DiscussionType =>
  typeof value === "string" && (DISCUSSION_TYPES as readonly string[]).includes(value);

export const REACTION_EMOJIS = ["👍", "🎉", "❤️", "👀", "🚀"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];
export const isReactionEmoji = (value: unknown): value is ReactionEmoji =>
  typeof value === "string" && (REACTION_EMOJIS as readonly string[]).includes(value);

const withRelations = {
  include: {
    replies: { orderBy: { createdAt: "asc" as const } },
    reactions: true,
    // Phase 16 (Option B): attachments are read-only here — created/removed
    // via discussionAttachment.service.ts's own POST/DELETE endpoints, never
    // through Discussion creation/update.
    attachments: { orderBy: { createdAt: "asc" as const }, include: { file: true } },
  },
} as const;

export const listDiscussionsForProject = async (projectId: string) => {
  return prisma.discussion.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    ...withRelations,
  });
};

/** Lightweight existence/scoping check — no relations — used before every mutation. */
export const findDiscussionInProject = async (projectId: string, discussionId: string) => {
  return prisma.discussion.findFirst({ where: { id: discussionId, projectId } });
};

export const createDiscussion = async (
  projectId: string,
  authorId: string,
  type: DiscussionType,
  body: string,
  mentions: string[],
) => {
  return prisma.discussion.create({
    data: { projectId, authorId, type, body, mentions },
    ...withRelations,
  });
};

export const setPinned = async (projectId: string, discussionId: string, pinned: boolean) => {
  const discussion = await findDiscussionInProject(projectId, discussionId);
  if (!discussion) {
    throw new Error("Discussion not found");
  }

  return prisma.discussion.update({ where: { id: discussionId }, data: { pinned } });
};

export const addReply = async (
  projectId: string,
  discussionId: string,
  authorId: string,
  text: string,
) => {
  const discussion = await findDiscussionInProject(projectId, discussionId);
  if (!discussion) {
    throw new Error("Discussion not found");
  }

  return prisma.discussionReply.create({ data: { discussionId, authorId, text } });
};

export const addReaction = async (
  projectId: string,
  discussionId: string,
  userId: string,
  emoji: string,
) => {
  const discussion = await findDiscussionInProject(projectId, discussionId);
  if (!discussion) {
    throw new Error("Discussion not found");
  }

  const existing = await prisma.discussionReaction.findUnique({
    where: { discussionId_userId_emoji: { discussionId, userId, emoji } },
  });
  if (existing) {
    throw new Error("Already reacted with this emoji");
  }

  return prisma.discussionReaction.create({ data: { discussionId, userId, emoji } });
};

export const removeReaction = async (
  projectId: string,
  discussionId: string,
  userId: string,
  emoji: string,
) => {
  const discussion = await findDiscussionInProject(projectId, discussionId);
  if (!discussion) {
    throw new Error("Discussion not found");
  }

  const existing = await prisma.discussionReaction.findUnique({
    where: { discussionId_userId_emoji: { discussionId, userId, emoji } },
  });
  if (!existing) {
    throw new Error("Reaction not found");
  }

  await prisma.discussionReaction.delete({ where: { id: existing.id } });
};
