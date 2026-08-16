import { prisma } from "../lib/prisma";

// Phase 17 approved scope (CRUD-only) — only the 5 types the frontend
// actually fires today (systemNotifications.ts + useTaskCommentHandlers.ts).
// "mention" and "deadline" exist in the frontend's NotificationType union
// but have zero live call sites (seed data only) — deliberately excluded
// here per Phase 17's explicit "do not implement mentions or deadlines".
export const NOTIFICATION_TYPES = ["assignment", "comment", "project", "team", "file"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export const isNotificationType = (value: unknown): value is NotificationType =>
  typeof value === "string" && (NOTIFICATION_TYPES as readonly string[]).includes(value);

export type CreateNotificationInput = {
  type: NotificationType;
  title: string;
  message: string;
  actionHref?: string | null;
};

/**
 * Notifications are recipient-scoped, not workspace/project-scoped like
 * every other domain model — there is no workspace membership check here,
 * only "does this row belong to the caller". Mirrors the one existing
 * precedent for this shape, GET /api/users/me (user.service.ts/getMe).
 */
export const listNotificationsForUser = async (recipientId: string) => {
  return prisma.notification.findMany({
    where: { recipientId },
    orderBy: { createdAt: "desc" },
  });
};

/** Lightweight existence/scoping check — used before every mutation. */
export const findNotificationForUser = async (recipientId: string, notificationId: string) => {
  return prisma.notification.findFirst({ where: { id: notificationId, recipientId } });
};

/**
 * Real, DB-backed check (never trusts a client-supplied id) — true when
 * both users are members of at least one of the same workspaces. Used to
 * gate cross-user notification targeting below: every genuine trigger
 * (task assigned, member invited, project created, file uploaded, comment
 * added) only ever fires between people who already share a workspace, so
 * this is the natural, minimal authorization boundary — not a broad
 * "any user can notify any user" opening.
 */
const usersShareWorkspace = async (userIdA: string, userIdB: string): Promise<boolean> => {
  if (userIdA === userIdB) return true;
  const shared = await prisma.workspaceMember.findFirst({
    where: {
      userId: userIdA,
      workspace: { workspaceMembers: { some: { userId: userIdB } } },
    },
  });
  return shared !== null;
};

/**
 * Stage 4 (Real Notifications): `recipientId` defaults to the caller
 * (preserving the original self-service-only behavior) but may target a
 * different real user, provided they share a workspace with the caller —
 * verified server-side above, never trusted from the client. `actorId` is
 * only stamped when the recipient differs from the caller, matching the
 * schema's own "who caused this" intent (Notification.actorId).
 */
export const createNotification = async (
  callerId: string,
  input: CreateNotificationInput,
  recipientId?: string,
) => {
  const targetRecipientId = recipientId ?? callerId;

  if (targetRecipientId !== callerId) {
    const shared = await usersShareWorkspace(callerId, targetRecipientId);
    if (!shared) {
      throw new Error("Recipient must share a workspace with you");
    }
  }

  return prisma.notification.create({
    data: {
      recipientId: targetRecipientId,
      actorId: targetRecipientId !== callerId ? callerId : null,
      type: input.type,
      title: input.title,
      message: input.message,
      actionHref: input.actionHref ?? null,
    },
  });
};

export const markAsRead = async (recipientId: string, notificationId: string, read: boolean) => {
  const notification = await findNotificationForUser(recipientId, notificationId);
  if (!notification) {
    throw new Error("Notification not found");
  }

  return prisma.notification.update({ where: { id: notificationId }, data: { read } });
};

/** Matches the frontend's "Mark all read" — only touches currently-unread rows. */
export const markAllAsRead = async (recipientId: string) => {
  await prisma.notification.updateMany({
    where: { recipientId, read: false },
    data: { read: true },
  });
};

/** Matches the frontend's "Clear all" — hard delete, same as the UI's own "can't be undone" confirm copy. */
export const clearAllNotifications = async (recipientId: string) => {
  await prisma.notification.deleteMany({ where: { recipientId } });
};
