import type { Request, Response } from "express";
import * as projectService from "../services/project.service";
import type { ProjectWriteFields } from "../services/project.service";

// Phase 19 Frontend Integration audit fix (Priority 8): "YYYY-MM-DD"
// date-only strings, same convention/validation as task.controller.ts's
// parseDueDate — see that file's doc comment for why a real Date parse
// isn't enough on its own (rejects e.g. "2026-02-30" instead of letting
// JS silently roll it into March).
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseProjectDate = (value: unknown): { ok: true; value: Date | null } | { ok: false } => {
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
 * Validates and assembles the optional cosmetic fields
 * (tag/color/startDate/dueDate) shared by create/update, alongside
 * `description`. Returns either the validated fields or a 400 response
 * payload to send as-is. Every field is optional and, except on create
 * (where `undefined` just means "not set yet"), `null` explicitly clears
 * it — same convention as task.controller.ts's parseTaskWrite.
 */
const parseProjectWrite = (
  body: Record<string, unknown>,
): { ok: true; value: ProjectWriteFields } | { ok: false; status: number; error: string } => {
  const { description, tag, color, startDate, dueDate } = body;
  const fields: ProjectWriteFields = {};

  if (description !== undefined) {
    if (typeof description !== "string") {
      return { ok: false, status: 400, error: "description must be a string" };
    }
    fields.description = description;
  }

  if (tag !== undefined) {
    if (tag !== null && typeof tag !== "string") {
      return { ok: false, status: 400, error: "tag must be a string or null" };
    }
    fields.tag = tag;
  }

  if (color !== undefined) {
    if (color !== null && typeof color !== "string") {
      return { ok: false, status: 400, error: "color must be a string or null" };
    }
    fields.color = color;
  }

  if (startDate !== undefined) {
    const parsed = parseProjectDate(startDate);
    if (!parsed.ok) {
      return { ok: false, status: 400, error: "startDate must be a valid YYYY-MM-DD date, or null" };
    }
    fields.startDate = parsed.value;
  }

  if (dueDate !== undefined) {
    const parsed = parseProjectDate(dueDate);
    if (!parsed.ok) {
      return { ok: false, status: 400, error: "dueDate must be a valid YYYY-MM-DD date, or null" };
    }
    fields.dueDate = parsed.value;
  }

  return { ok: true, value: fields };
};

export const createProject = async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  const parsed = parseProjectWrite(req.body ?? {});
  if (!parsed.ok) {
    return res.status(parsed.status).json({ error: parsed.error });
  }

  try {
    const project = await projectService.createProject(
      req.params.id as string,
      req.userId!,
      name.trim(),
      parsed.value,
    );
    return res.status(201).json(project);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const listProjects = async (req: Request, res: Response) => {
  try {
    const projects = await projectService.listProjectsForWorkspace(req.params.id as string);
    return res.status(200).json(projects);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getProject = async (req: Request, res: Response) => {
  try {
    const project = await projectService.findProjectInWorkspace(
      req.params.id as string,
      req.params.projectId as string,
    );

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    return res.status(200).json(project);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  const { name } = req.body ?? {};

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return res.status(400).json({ error: "name must be a non-empty string" });
  }

  const parsed = parseProjectWrite(req.body ?? {});
  if (!parsed.ok) {
    return res.status(parsed.status).json({ error: parsed.error });
  }

  if (name === undefined && Object.keys(parsed.value).length === 0) {
    return res.status(400).json({ error: "At least one field must be provided to update" });
  }

  const data: { name?: string } & ProjectWriteFields = { ...parsed.value };
  if (name !== undefined) {
    data.name = name.trim();
  }

  try {
    const project = await projectService.updateProject(
      req.params.id as string,
      req.params.projectId as string,
      data,
    );
    return res.status(200).json(project);
  } catch (error) {
    if (error instanceof Error && error.message === "Project not found") {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    await projectService.deleteProject(req.params.id as string, req.params.projectId as string);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === "Project not found") {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};
