import type { Request, Response } from "express";
import * as projectService from "../services/project.service";

export const createProject = async (req: Request, res: Response) => {
  const { name, description } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  if (description !== undefined && typeof description !== "string") {
    return res.status(400).json({ error: "description must be a string" });
  }

  try {
    const project = await projectService.createProject(
      req.params.id as string,
      req.userId!,
      name.trim(),
      description,
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
  const { name, description } = req.body;

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return res.status(400).json({ error: "name must be a non-empty string" });
  }

  if (description !== undefined && typeof description !== "string") {
    return res.status(400).json({ error: "description must be a string" });
  }

  if (name === undefined && description === undefined) {
    return res.status(400).json({ error: "name or description is required" });
  }

  const data: { name?: string; description?: string } = {};
  if (name !== undefined) {
    data.name = name.trim();
  }
  if (description !== undefined) {
    data.description = description;
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
