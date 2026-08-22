import type { NewNotification } from "./notificationData";
import type { WorkspaceActor } from "../types/workspace";



type Notify = (input: NewNotification) => void;

/**
 * Appends `?task=<id>` to an existing page href (`/projects/:id/list`,
 * `/tasks`, …) — the query-param convention every task-list-capable view
 * (ProjectListTab/ProjectCalendarTab/ProjectTimelineTab/Tasks/Timeline)
 * now reads on mount to auto-open that task's existing TaskDetailsDrawer,
 * so a notification click lands on the specific task, not just its list.
 * No new routes/pages — every one of those views already has its own
 * `selectedTaskId` + TaskDetailsDrawer; this just gives it a real id to
 * consume. Exported so useTaskCommentHandlers.ts's comment notification
 * (the one other trigger that names a specific task) uses the exact same
 * convention rather than inventing its own.
 */
export function withTaskParam(href: string, taskId: string): string {
  return `${href}${href.includes("?") ? "&" : "?"}task=${taskId}`;
}

/* ============================================================
   Stage 4 (Real Notifications): every trigger below now targets a
   real recipient userId (`recipientId`, verified server-side to
   share a workspace with the caller — see notification.service.ts).
   `avatar` is no longer set — see NotificationContext.tsx's doc
   comment for why. A trigger with no real, single recipient to
   target (self-notifying is pointless — it never left the actor's
   own browser under the old localStorage system either) simply
   doesn't fire, rather than notifying the wrong person or no one
   correctly at all.
============================================================ */

export function notifyTaskAssigned(
  addNotification: Notify,
  params: {
    taskTitle: string;
    /** Real task id — appended to actionHref so the click opens this specific task, not just its list. */
    taskId: string;
    projectName: string;
    /** Real assignee userId — the notification's recipient. */
    assigneeId: string | null | undefined;
    /** Real caller userId — assigning a task to yourself isn't worth notifying about. */
    actorId: string | null | undefined;
    actor: WorkspaceActor;
    actionHref: string;
  }
): void {
  const { taskTitle, taskId, projectName, assigneeId, actorId, actor, actionHref } = params;

  if (!assigneeId || assigneeId === actorId) {
    return;
  }

  addNotification({
    type: "assignment",
    title: "You were assigned a task",
    message: `${actor.name} assigned you "${taskTitle}" in ${projectName}.`,
    recipientId: assigneeId,
    actionHref: withTaskParam(actionHref, taskId),
  });
}


export function notifyTaskCompleted(
  addNotification: Notify,
  params: {
    taskTitle: string;
    /** Real task id — appended to actionHref so the click opens this specific task, not just its list. */
    taskId: string;
    projectName: string;
    /** Real assignee userId — the notification's recipient. */
    assigneeId: string | null | undefined;
    /** Real caller userId — an assignee completing their own task doesn't need to be told about it. */
    actorId: string | null | undefined;
    actor: WorkspaceActor;
    actionHref: string;
  }
): void {
  const { taskTitle, taskId, projectName, assigneeId, actorId, actor, actionHref } = params;

  if (!assigneeId || assigneeId === actorId) {
    return;
  }

  addNotification({
    type: "project",
    title: "Task completed",
    message: `${actor.name} marked "${taskTitle}" in ${projectName} as complete.`,
    recipientId: assigneeId,
    actionHref: withTaskParam(actionHref, taskId),
  });
}

// notifyFileUploaded intentionally has zero call sites right now — see
// ProjectFilesTab.tsx's processFiles for the full reasoning: there's no
// real endpoint yet to enumerate a project's *members* (as opposed to
// its files), so there's no real audience to target without notifying
// the whole workspace, which would over-broadcast a project-scoped
// event to people outside the project. Kept defined (not deleted) for
// when that endpoint exists — see the Stage 4 report's "genuine
// backend limitation" note.
export function notifyFileUploaded(
  addNotification: Notify,
  params: {
    fileName: string;
    projectName: string;
    actor: WorkspaceActor;
    actionHref: string;
    recipientId: string;
  }
): void {
  const { fileName, projectName, actor, actionHref, recipientId } = params;

  addNotification({
    type: "file",
    title: `New file in ${projectName}`,
    message: `${actor.name} uploaded "${fileName}".`,
    recipientId,
    actionHref,
  });
}

export function notifyMemberInvited(
  addNotification: Notify,
  params: {
    department: string;
    actionHref: string;
    /** Real userId of the person who was just added — the notification's recipient. */
    recipientId: string;
  }
): void {
  const { department, actionHref, recipientId } = params;

  addNotification({
    type: "team",
    title: "You were added to the workspace",
    message: `You were added as ${department}.`,
    recipientId,
    actionHref,
  });
}

export function notifyProjectCreated(
  addNotification: Notify,
  params: {
    projectName: string;
    actor: WorkspaceActor;
    actionHref: string;
    /** Real userIds of every other workspace member to notify (caller already excluded by the site calling this). */
    recipientIds: string[];
  }
): void {
  const { projectName, actor, actionHref, recipientIds } = params;

  recipientIds.forEach((recipientId) => {
    addNotification({
      type: "project",
      title: "New project created",
      message: `${actor.name} created "${projectName}".`,
      recipientId,
      actionHref,
    });
  });
}
