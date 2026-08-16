import type { Request, Response } from "express";
import * as milestoneService from "../services/milestone.service";
import * as projectService from "../services/project.service";
import type { MilestoneWriteInput } from "../services/milestone.service";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a "YYYY-MM-DD" date-only string (same convention as
 * task.controller.ts's parseDueDate, matching the frontend's
 * ProjectMilestone.dueDate format) into a UTC-midnight Date, or returns
 * an error. Explicit `null` clears an existing due date.
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

export const createMilestone = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const { title, dueDate } = req.body ?? {};
  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }

  let parsedDueDate: Date | null | undefined;
  if (dueDate !== undefined) {
    const parsed = parseDueDate(dueDate);
    if (!parsed.ok) {
      return res.status(400).json({ error: "dueDate must be a valid YYYY-MM-DD date, or null" });
    }
    parsedDueDate = parsed.value;
  }

  try {
    const milestone = await milestoneService.createMilestone(projectId, title.trim(), parsedDueDate);
    return res.status(201).json(milestone);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const listMilestones = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    const milestones = await milestoneService.listMilestonesForProject(projectId);
    return res.status(200).json(milestones);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateMilestone = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;
  const milestoneId = req.params.milestoneId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const { title, done, dueDate } = req.body ?? {};
  const input: MilestoneWriteInput = {};

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "title must be a non-empty string" });
    }
    input.title = title.trim();
  }

  if (done !== undefined) {
    if (typeof done !== "boolean") {
      return res.status(400).json({ error: "done must be a boolean" });
    }
    input.done = done;
  }

  if (dueDate !== undefined) {
    const parsed = parseDueDate(dueDate);
    if (!parsed.ok) {
      return res.status(400).json({ error: "dueDate must be a valid YYYY-MM-DD date, or null" });
    }
    input.dueDate = parsed.value;
  }

  try {
    const milestone = await milestoneService.updateMilestone(projectId, milestoneId, input);
    return res.status(200).json(milestone);
  } catch (error) {
    if (error instanceof Error && error.message === "Milestone not found") {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMilestone = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;
  const milestoneId = req.params.milestoneId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    await milestoneService.deleteMilestone(projectId, milestoneId);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === "Milestone not found") {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};
