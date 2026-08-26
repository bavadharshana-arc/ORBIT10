import type { Request, Response } from "express";
import * as taskService from "../services/task.service";
import * as projectService from "../services/project.service";
import * as workspaceService from "../services/workspace.service";
import * as notificationService from "../services/notification.service";
import type { TaskWriteInput } from "../services/task.service";
import { logError } from "../lib/logger";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a "YYYY-MM-DD" date-only string (the frontend's convention — see
 * taskData.ts's toLocalDateString/getDueGroup) into a UTC-midnight Date, or
 * returns an error. Explicit `null` clears an existing due date. Validates
 * the calendar date is real (JS `Date` silently rolls "2026-02-30" into
 * March, which this rejects rather than silently accepting).
 */
const parseDueDate = (value: unknown): { ok: true; value: Date | null } | { ok: false } => {
  if (value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== "string" || !DATE_ONLY_PATTERN.test(value)) {
    return { ok: false };
  }

  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return { ok: false };
  }

  return { ok: true, value: date };
};

/**
 * Validates and assembles the mutable Task fields shared by create/update
 * from the request body. Returns either the validated input or a 400
 * response payload to send as-is.
 */
const parseTaskWrite = async (
  workspaceId: string,
  body: Record<string, unknown>,
  { requireTitle }: { requireTitle: boolean },
): Promise<{ ok: true; value: TaskWriteInput } | { ok: false; status: number; error: string }> => {
  const { title, description, status, priority, assigneeId, dueDate } = body;
  const input: TaskWriteInput = {};

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return { ok: false, status: 400, error: "title must be a non-empty string" };
    }
    input.title = title.trim();
  } else if (requireTitle) {
    return { ok: false, status: 400, error: "title is required" };
  }

  if (description !== undefined) {
    if (description !== null && typeof description !== "string") {
      return { ok: false, status: 400, error: "description must be a string or null" };
    }
    input.description = description;
  }

  if (status !== undefined) {
    if (!taskService.isTaskStatus(status)) {
      return {
        ok: false,
        status: 400,
        error: `status must be one of ${taskService.TASK_STATUSES.join(", ")}`,
      };
    }
    input.status = status;
  }

  if (priority !== undefined) {
    if (!taskService.isTaskPriority(priority)) {
      return {
        ok: false,
        status: 400,
        error: `priority must be one of ${taskService.TASK_PRIORITIES.join(", ")}`,
      };
    }
    input.priority = priority;
  }

  if (assigneeId !== undefined) {
    if (assigneeId !== null && typeof assigneeId !== "string") {
      return { ok: false, status: 400, error: "assigneeId must be a string or null" };
    }
    if (assigneeId !== null) {
      const membership = await workspaceService.findMembership(workspaceId, assigneeId);
      if (!membership) {
        return { ok: false, status: 400, error: "assigneeId must be a member of this workspace" };
      }
    }
    input.assigneeId = assigneeId;
  }

  if (dueDate !== undefined) {
    const parsed = parseDueDate(dueDate);
    if (!parsed.ok) {
      return { ok: false, status: 400, error: "dueDate must be a valid YYYY-MM-DD date, or null" };
    }
    input.dueDate = parsed.value;
  }

  return { ok: true, value: input };
};

export const createTask = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const parsed = await parseTaskWrite(workspaceId, req.body ?? {}, { requireTitle: true });
  if (!parsed.ok) {
    return res.status(parsed.status).json({ error: parsed.error });
  }

  try {
    const task = await taskService.createTask(projectId, parsed.value as TaskWriteInput & { title: string });
    return res.status(201).json(task);
  } catch (error) {
    logError("task.createTask", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const listTasks = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    const tasks = await taskService.listTasksForProject(projectId);
    return res.status(200).json(tasks);
  } catch (error) {
    logError("task.listTasks", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getTask = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;
  const taskId = req.params.taskId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    const task = await taskService.findTaskInProject(projectId, taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    return res.status(200).json(task);
  } catch (error) {
    logError("task.getTask", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;
  const taskId = req.params.taskId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const parsed = await parseTaskWrite(workspaceId, req.body ?? {}, { requireTitle: false });
  if (!parsed.ok) {
    return res.status(parsed.status).json({ error: parsed.error });
  }

  // Captured before the write so the assignment-notification check below
  // compares against the real previous value, not the just-written one —
  // only fetched when assigneeId is actually part of this request.
  const previousTask =
    parsed.value.assigneeId !== undefined ? await taskService.findTaskInProject(projectId, taskId) : null;

  try {
    const task = await taskService.updateTask(projectId, taskId, parsed.value);

    // Step 8: notify the new assignee on assignment/reassignment only —
    // never on an unchanged assigneeId, a clear (null), or a
    // self-assignment. Best-effort: a notification failure must never
    // turn an otherwise-successful task update into an error response.
    if (
      parsed.value.assigneeId !== undefined &&
      parsed.value.assigneeId !== null &&
      parsed.value.assigneeId !== previousTask?.assigneeId &&
      parsed.value.assigneeId !== req.userId
    ) {
      try {
        await notificationService.createNotification(
          req.userId!,
          {
            type: "assignment",
            title: "You were assigned a task",
            message: `You were assigned "${task.title}" in ${project.name}.`,
            actionHref: null,
          },
          parsed.value.assigneeId,
        );
      } catch (notificationError) {
        console.error("Failed to create task-assignment notification:", notificationError);
      }
    }

    return res.status(200).json(task);
  } catch (error) {
    if (error instanceof Error && error.message === "Task not found") {
      return res.status(404).json({ error: error.message });
    }
    logError("task.updateTask", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;
  const taskId = req.params.taskId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    await taskService.deleteTask(projectId, taskId);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === "Task not found") {
      return res.status(404).json({ error: error.message });
    }
    logError("task.deleteTask", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
