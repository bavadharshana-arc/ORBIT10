import type { Request, Response } from "express";
import * as projectFileService from "../services/projectFile.service";
import * as projectService from "../services/project.service";

export const createFile = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const { name, extension, kind, sizeBytes, folder } = req.body ?? {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  if (!extension || typeof extension !== "string" || !extension.trim()) {
    return res.status(400).json({ error: "extension is required" });
  }

  if (!projectFileService.isFileKind(kind)) {
    return res.status(400).json({
      error: `kind must be one of ${projectFileService.FILE_KINDS.join(", ")}`,
    });
  }

  if (typeof sizeBytes !== "number" || !Number.isInteger(sizeBytes) || sizeBytes < 0) {
    return res.status(400).json({ error: "sizeBytes must be a non-negative integer" });
  }

  if (folder !== undefined && typeof folder !== "string") {
    return res.status(400).json({ error: "folder must be a string" });
  }
  // Empty/omitted folder defaults to "General" server-side, matching the
  // frontend's own DEFAULT_FOLDER fallback (approved Phase 15 decision).
  const resolvedFolder = folder && folder.trim() ? folder.trim() : projectFileService.DEFAULT_FOLDER;

  try {
    const file = await projectFileService.createFile(projectId, {
      name: name.trim(),
      extension: extension.trim(),
      kind,
      sizeBytes,
      folder: resolvedFolder,
      uploaderId: req.userId!,
    });
    return res.status(201).json(file);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const listFiles = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    const files = await projectFileService.listFilesForProject(projectId);
    return res.status(200).json(files);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteFile = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;
  const fileId = req.params.fileId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    await projectFileService.deleteFile(projectId, fileId);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === "File not found") {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};
