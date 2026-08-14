import type { NewNotification } from "./notificationData";
import type { WorkspaceActor } from "../types/workspace";

/* ============================================================
   SYSTEM NOTIFICATIONS

   Phase 6.9 — Connect Systems. The single place that builds the
   Notification copy for the "system" actions that generate one
   automatically (task assigned, task completed, file uploaded,
   member invited, project created) — every call site hands its
   NotificationContext addNotification() in and its own actionHref,
   rather than each page re-writing the same title/message/avatar
   shape by hand. Comment notifications already have their own
   single source (useTaskCommentHandlers) and aren't duplicated here.

   Plain functions, not a hook — there's no other hook state involved,
   just addNotification() plus the data already in hand at each call
   site (mirrors addCommentToTask()'s shape: dependencies passed in,
   nothing pulled from context internally).
============================================================ */

type Notify = (input: NewNotification) => void;

/** Fires only when at least one person was newly assigned — no-ops on a save that didn't add an assignee. */
export function notifyTaskAssigned(
  addNotification: Notify,
  params: {
    taskTitle: string;
    projectName: string;
    assignedNames: string[];
    actor: WorkspaceActor;
    actionHref: string;
  }
): void {
  const { taskTitle, projectName, assignedNames, actor, actionHref } = params;

  if (assignedNames.length === 0) {
    return;
  }

  const isSingle = assignedNames.length === 1;

  addNotification({
    type: "assignment",
    title: isSingle ? `${assignedNames[0]} was assigned a task` : "New task assignees",
    message: `${assignedNames.join(", ")} ${isSingle ? "was" : "were"} assigned to "${taskTitle}" in ${projectName}.`,
    avatar: { initials: actor.initials, bg: actor.bg, fg: actor.fg },
    actionHref,
  });
}

/** Call only when a task's status just transitioned *into* "Completed" (not merely re-saved while already Completed). */
export function notifyTaskCompleted(
  addNotification: Notify,
  params: {
    taskTitle: string;
    projectName: string;
    actor: WorkspaceActor;
    actionHref: string;
  }
): void {
  const { taskTitle, projectName, actor, actionHref } = params;

  addNotification({
    type: "project",
    title: "Task completed",
    message: `"${taskTitle}" in ${projectName} was marked complete.`,
    avatar: { initials: actor.initials, bg: actor.bg, fg: actor.fg },
    actionHref,
  });
}

export function notifyFileUploaded(
  addNotification: Notify,
  params: {
    fileName: string;
    projectName: string;
    actor: WorkspaceActor;
    actionHref: string;
  }
): void {
  const { fileName, projectName, actor, actionHref } = params;

  addNotification({
    type: "file",
    title: `New file in ${projectName}`,
    message: `${actor.name} uploaded "${fileName}".`,
    avatar: { initials: actor.initials, bg: actor.bg, fg: actor.fg },
    actionHref,
  });
}

export function notifyMemberInvited(
  addNotification: Notify,
  params: {
    memberName: string;
    department: string;
    actionHref: string;
  }
): void {
  const { memberName, department, actionHref } = params;

  addNotification({
    type: "team",
    title: `${memberName} was invited`,
    message: `${memberName} was invited to join ${department}.`,
    actionHref,
  });
}

export function notifyProjectCreated(
  addNotification: Notify,
  params: {
    projectName: string;
    actor: WorkspaceActor;
    actionHref: string;
  }
): void {
  const { projectName, actor, actionHref } = params;

  addNotification({
    type: "project",
    title: "New project created",
    message: `${actor.name} created "${projectName}".`,
    avatar: { initials: actor.initials, bg: actor.bg, fg: actor.fg },
    actionHref,
  });
}
