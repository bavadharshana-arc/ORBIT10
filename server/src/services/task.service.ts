import { prisma } from "../lib/prisma";

// Agreed Phase 8A vocabulary (Option A — superset of the old seed statuses,
// with "Done" renamed to "Completed" to match the frontend's canonical name).
export const TASK_STATUSES = [
  "To Do",
  "In Progress",
  "In Review",
  "Completed",
  "Blocked",
  "Backlog",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const isTaskStatus = (value: unknown): value is TaskStatus =>
  typeof value === "string" && (TASK_STATUSES as readonly string[]).includes(value);

export const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const isTaskPriority = (value: unknown): value is TaskPriority =>
  typeof value === "string" && (TASK_PRIORITIES as readonly string[]).includes(value);

export type TaskWriteInput = {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  dueDate?: Date | null;
};

/**
 * Builds a Prisma data object containing only the fields the caller actually
 * set. Mutating into a plain object (rather than spreading a conditional
 * `{}`) keeps every assigned value definitely non-undefined, which is what
 * `exactOptionalPropertyTypes` requires for Prisma's optional input fields.
 */
const buildData = (input: TaskWriteInput): TaskWriteInput => {
  const data: TaskWriteInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) data.status = input.status;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.assigneeId !== undefined) data.assigneeId = input.assigneeId;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate;
  return data;
};

export const listTasksForProject = async (projectId: string) => {
  return prisma.task.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
};

export const findTaskInProject = async (projectId: string, taskId: string) => {
  return prisma.task.findFirst({ where: { id: taskId, projectId } });
};

export const createTask = async (projectId: string, input: TaskWriteInput & { title: string }) => {
  const data = buildData(input);
  return prisma.task.create({ data: { ...data, projectId, title: input.title } });
};

export const updateTask = async (projectId: string, taskId: string, input: TaskWriteInput) => {
  const task = await findTaskInProject(projectId, taskId);
  if (!task) {
    throw new Error("Task not found");
  }

  return prisma.task.update({ where: { id: taskId }, data: buildData(input) });
};

export const deleteTask = async (projectId: string, taskId: string) => {
  const task = await findTaskInProject(projectId, taskId);
  if (!task) {
    throw new Error("Task not found");
  }

  await prisma.task.delete({ where: { id: taskId } });
};
