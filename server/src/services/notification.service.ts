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
 * Demo Workspace baseline notifications.
 *
 * prisma/seed.ts never creates Notification rows — every notification a
 * Demo Workspace account has ever seen was created organically by a real
 * trigger (task assigned/completed, member invited, ...) as someone
 * actually used the app. "Clear all" is a genuine hard delete (matches
 * its own "can't be undone" confirm copy), so with nothing to fall back
 * on, a demo account that cleared its inbox saw an empty panel forever,
 * even after logout/login — which reads as broken in a product demo.
 *
 * This restores a small, realistic baseline, scoped narrowly so it can
 * never surprise a real user: only for Demo Workspace members (checked
 * against the real WorkspaceMember table, same pattern as
 * usersShareWorkspace above), and only when their notification list is
 * currently empty. A demo user who still has *any* notification — a
 * default they haven't cleared, or an organic one — never gets
 * reseeded, so a single trashed/swiped default stays gone on refresh;
 * only clearing (or deleting) everything brings the baseline back.
 *
 * Not imported from prisma/seed.ts: that file is a standalone script
 * whose main() runs on import, so pulling its DEMO_WORKSPACE_NAME in
 * here would re-run the whole seed. Duplicated as a literal instead —
 * it names the same workspace prisma/seed.ts creates.
 */
const DEMO_WORKSPACE_NAME = "Demo Workspace";

const isDemoWorkspaceMember = async (userId: string): Promise<boolean> => {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, workspace: { name: DEMO_WORKSPACE_NAME } },
  });
  return membership !== null;
};

/** Same `?task=<id>` convention systemNotifications.ts's withTaskParam uses client-side, duplicated here rather than imported (client code isn't importable from the server). */
const withTaskParam = (href: string, taskId: string): string => `${href}${href.includes("?") ? "&" : "?"}task=${taskId}`;

type DefaultNotificationKey = "assignment" | "deadline" | "comment" | "completed" | "project-update";

/**
 * Builds the 5 default rows for one demo user. Prefers a real task
 * already assigned to them (if the seed/demo data has produced one) so
 * the task-shaped defaults link somewhere real and clickable, same as
 * every organic notification does — falls back to the plain list views
 * when this particular demo user has no assigned task yet.
 */
const buildDefaultDemoNotifications = async (
  userId: string,
): Promise<Array<{ key: DefaultNotificationKey; type: NotificationType; title: string; message: string; actionHref: string }>> => {
  const assignedTask = await prisma.task.findFirst({
    where: { assigneeId: userId },
    include: { project: true },
    orderBy: { dueDate: "asc" },
  });

  const taskHref = assignedTask ? withTaskParam(`/projects/${assignedTask.projectId}/list`, assignedTask.id) : "/tasks";
  const taskTitle = assignedTask?.title ?? "a task";
  const projectName = assignedTask?.project.name ?? "your project";

  return [
    {
      key: "assignment",
      type: "assignment",
      title: "You were assigned a task",
      message: `Demo Product Manager assigned you "${taskTitle}" in ${projectName}.`,
      actionHref: taskHref,
    },
    {
      key: "deadline",
      // "deadline" has no backend NOTIFICATION_TYPES entry (see the const
      // above) — persists as "project", same as every real "Deadline
      // approaching" row; notificationMeta.tsx resolves the clock icon by
      // sniffing this exact title, matching how it already treats organic
      // rows shaped this way.
      type: "project",
      title: "Deadline approaching",
      message: `"${taskTitle}" is due soon.`,
      actionHref: taskHref,
    },
    {
      key: "comment",
      type: "comment",
      title: "New comment on your task",
      message: `Demo Designer left a comment on "${taskTitle}".`,
      actionHref: taskHref,
    },
    {
      key: "completed",
      type: "project",
      title: "Task completed",
      message: `A task in ${projectName} was marked complete.`,
      actionHref: "/projects",
    },
    {
      key: "project-update",
      type: "project",
      title: "Project update",
      message: `${projectName} has a new update.`,
      actionHref: "/projects",
    },
  ];
};

/**
 * Seeds the baseline above exactly once per "empty inbox" — gated on a
 * real count check, and additionally made safe against the rare
 * double-fetch race (e.g. two near-simultaneous loads of the panel) by
 * giving each default a deterministic id and inserting with
 * `skipDuplicates: true`: if a concurrent call already created that
 * exact row, Postgres's own primary-key uniqueness silently drops the
 * duplicate insert rather than erroring or doubling the row up. No
 * schema change needed — `id` is already unique, we're just supplying
 * it explicitly instead of letting `@default(cuid())` generate a random
 * one for these particular rows.
 */
const ensureDefaultDemoNotifications = async (userId: string): Promise<void> => {
  if (!(await isDemoWorkspaceMember(userId))) return;

  const existingCount = await prisma.notification.count({ where: { recipientId: userId } });
  if (existingCount > 0) return;

  const defaults = await buildDefaultDemoNotifications(userId);

  await prisma.notification.createMany({
    data: defaults.map((item) => ({
      id: `demo-default-${userId}-${item.key}`,
      recipientId: userId,
      actorId: null,
      type: item.type,
      title: item.title,
      message: item.message,
      actionHref: item.actionHref,
      read: false,
    })),
    skipDuplicates: true,
  });
};

/**
 * Notifications are recipient-scoped, not workspace/project-scoped like
 * every other domain model — there is no workspace membership check here,
 * only "does this row belong to the caller". Mirrors the one existing
 * precedent for this shape, GET /api/users/me (user.service.ts/getMe).
 */
export const listNotificationsForUser = async (recipientId: string) => {
  await ensureDefaultDemoNotifications(recipientId);

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

/**
 * Single-notification delete (per-row trash action) — same ownership
 * check as markAsRead above (a client can only ever delete its own
 * notification, never trusted from the client beyond the id), just a
 * hard delete instead of a read-state update. Only ever removes the
 * Notification row itself; never touches the task/project/comment it
 * references.
 */
export const deleteNotification = async (recipientId: string, notificationId: string) => {
  const notification = await findNotificationForUser(recipientId, notificationId);
  if (!notification) {
    throw new Error("Notification not found");
  }

  await prisma.notification.delete({ where: { id: notificationId } });
};
