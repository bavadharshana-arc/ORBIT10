import { prisma } from "../lib/prisma";

// Full 10-value frontend ActivityEventType vocabulary (types/workspace.ts),
// accepted for forward compatibility even though only a subset has a live
// frontend call site today (see Phase 13 inspection report).
export const ACTIVITY_EVENT_TYPES = [
  "project_created",
  "task_created",
  "task_updated",
  "status_changed",
  "comment_added",
  "discussion_posted",
  "file_uploaded",
  "member_added",
  "member_removed",
  "milestone_completed",
] as const;
export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];
export const isActivityEventType = (value: unknown): value is ActivityEventType =>
  typeof value === "string" && (ACTIVITY_EVENT_TYPES as readonly string[]).includes(value);

// Matches workspace.service.ts's memberWithUser convention — id/name/email
// only, no password or other fields, for hydrating the frontend's
// WorkspaceActor shape.
const withActor = {
  include: { actor: { select: { id: true, name: true, email: true } } },
} as const;

export const listActivityForProject = async (projectId: string) => {
  return prisma.activityEvent.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    ...withActor,
  });
};

export const createActivityEvent = async (
  projectId: string,
  type: ActivityEventType,
  text: string,
  actorId?: string | null,
) => {
  if (actorId !== undefined && actorId !== null) {
    return prisma.activityEvent.create({
      data: { projectId, type, text, actorId },
      ...withActor,
    });
  }
  return prisma.activityEvent.create({
    data: { projectId, type, text },
    ...withActor,
  });
};
