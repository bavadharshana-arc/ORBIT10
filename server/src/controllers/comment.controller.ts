import type { Request, Response } from "express";
import * as commentService from "../services/comment.service";
import * as taskService from "../services/task.service";
import * as projectService from "../services/project.service";

/**
 * Verifies the project belongs to the workspace and the task belongs to
 * that project, mirroring the two-level scoping task.controller.ts already
 * does. Returns the resolved ids, or null after having already sent a 404.
 */
const resolveTask = async (
  req: Request,
  res: Response,
): Promise<{ projectId: string; taskId: string } | null> => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;
  const taskId = req.params.taskId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return null;
  }

  const task = await taskService.findTaskInProject(projectId, taskId);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return null;
  }

  return { projectId, taskId };
};

export const createComment = async (req: Request, res: Response) => {
  const resolved = await resolveTask(req, res);
  if (!resolved) return;

  const { text } = req.body ?? {};
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  try {
    const comment = await commentService.createComment(resolved.taskId, req.userId!, text.trim());
    return res.status(201).json(comment);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const listComments = async (req: Request, res: Response) => {
  const resolved = await resolveTask(req, res);
  if (!resolved) return;

  try {
    const comments = await commentService.listCommentsForTask(resolved.taskId);
    return res.status(200).json(comments);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateComment = async (req: Request, res: Response) => {
  const resolved = await resolveTask(req, res);
  if (!resolved) return;

  const { text } = req.body ?? {};
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  try {
    const comment = await commentService.updateComment(
      resolved.taskId,
      req.params.commentId as string,
      req.userId!,
      text.trim(),
    );
    return res.status(200).json(comment);
  } catch (error) {
    if (error instanceof Error && error.message === "Comment not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof Error && error.message === "Only the comment author can edit this comment") {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  const resolved = await resolveTask(req, res);
  if (!resolved) return;

  try {
    await commentService.deleteComment(
      resolved.taskId,
      req.params.commentId as string,
      req.userId!,
      req.workspaceRole!,
    );
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === "Comment not found") {
      return res.status(404).json({ error: error.message });
    }
    if (
      error instanceof Error &&
      error.message === "Only the comment author or a workspace OWNER/ADMIN can delete this comment"
    ) {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};
