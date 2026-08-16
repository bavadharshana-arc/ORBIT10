import type { Request, Response } from "express";
import * as discussionAttachmentService from "../services/discussionAttachment.service";
import * as projectService from "../services/project.service";

export const addAttachment = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;
  const discussionId = req.params.discussionId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const { fileId } = req.body ?? {};
  if (!fileId || typeof fileId !== "string") {
    return res.status(400).json({ error: "fileId is required" });
  }

  try {
    const attachment = await discussionAttachmentService.addAttachment(
      projectId,
      discussionId,
      fileId,
    );
    return res.status(201).json(attachment);
  } catch (error) {
    if (error instanceof Error && error.message === "Discussion not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof Error && error.message === "File not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof Error && error.message === "File is already attached to this discussion") {
      return res.status(409).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const removeAttachment = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;
  const discussionId = req.params.discussionId as string;
  const attachmentId = req.params.attachmentId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    await discussionAttachmentService.removeAttachment(projectId, discussionId, attachmentId);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === "Discussion not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof Error && error.message === "Attachment not found") {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};
