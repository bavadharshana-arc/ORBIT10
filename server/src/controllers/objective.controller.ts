import type { Request, Response } from "express";
import * as objectiveService from "../services/objective.service";
import * as projectService from "../services/project.service";
import type { ObjectiveWriteInput } from "../services/objective.service";
import { logError } from "../lib/logger";

export const createObjective = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const { text } = req.body ?? {};
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  try {
    const objective = await objectiveService.createObjective(projectId, text.trim());
    return res.status(201).json(objective);
  } catch (error) {
    logError("objective.createObjective", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const listObjectives = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    const objectives = await objectiveService.listObjectivesForProject(projectId);
    return res.status(200).json(objectives);
  } catch (error) {
    logError("objective.listObjectives", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateObjective = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;
  const objectiveId = req.params.objectiveId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const { text, done } = req.body ?? {};
  const input: ObjectiveWriteInput = {};

  if (text !== undefined) {
    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "text must be a non-empty string" });
    }
    input.text = text.trim();
  }

  if (done !== undefined) {
    if (typeof done !== "boolean") {
      return res.status(400).json({ error: "done must be a boolean" });
    }
    input.done = done;
  }

  try {
    const objective = await objectiveService.updateObjective(projectId, objectiveId, input);
    return res.status(200).json(objective);
  } catch (error) {
    if (error instanceof Error && error.message === "Objective not found") {
      return res.status(404).json({ error: error.message });
    }
    logError("objective.updateObjective", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteObjective = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;
  const objectiveId = req.params.objectiveId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    await objectiveService.deleteObjective(projectId, objectiveId);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === "Objective not found") {
      return res.status(404).json({ error: error.message });
    }
    logError("objective.deleteObjective", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
