import type { Request, Response } from "express";
import * as discussionService from "../services/discussion.service";
import * as projectService from "../services/project.service";
import { logError } from "../lib/logger";

export const createDiscussion = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const { type, body, mentions } = req.body ?? {};

  if (!discussionService.isDiscussionType(type)) {
    return res.status(400).json({
      error: `type must be one of ${discussionService.DISCUSSION_TYPES.join(", ")}`,
    });
  }

  if (!body || typeof body !== "string" || !body.trim()) {
    return res.status(400).json({ error: "body is required" });
  }

  let mentionIds: string[] = [];
  if (mentions !== undefined) {
    if (!Array.isArray(mentions) || !mentions.every((m) => typeof m === "string")) {
      return res.status(400).json({ error: "mentions must be an array of strings" });
    }
    mentionIds = mentions;
  }

  try {
    const discussion = await discussionService.createDiscussion(
      projectId,
      req.userId!,
      type,
      body.trim(),
      mentionIds,
    );
    return res.status(201).json(discussion);
  } catch (error) {
    logError("discussion.createDiscussion", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const listDiscussions = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    const discussions = await discussionService.listDiscussionsForProject(projectId);
    return res.status(200).json(discussions);
  } catch (error) {
    logError("discussion.listDiscussions", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateDiscussion = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;
  const discussionId = req.params.discussionId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const { pinned } = req.body ?? {};
  if (typeof pinned !== "boolean") {
    return res.status(400).json({ error: "pinned must be a boolean" });
  }

  try {
    const discussion = await discussionService.setPinned(projectId, discussionId, pinned);
    return res.status(200).json(discussion);
  } catch (error) {
    if (error instanceof Error && error.message === "Discussion not found") {
      return res.status(404).json({ error: error.message });
    }
    logError("discussion.updateDiscussion", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const addReply = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;
  const discussionId = req.params.discussionId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const { text } = req.body ?? {};
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  try {
    const reply = await discussionService.addReply(projectId, discussionId, req.userId!, text.trim());
    return res.status(201).json(reply);
  } catch (error) {
    if (error instanceof Error && error.message === "Discussion not found") {
      return res.status(404).json({ error: error.message });
    }
    logError("discussion.addReply", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const addReaction = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;
  const discussionId = req.params.discussionId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const { emoji } = req.body ?? {};
  if (!discussionService.isReactionEmoji(emoji)) {
    return res.status(400).json({
      error: `emoji must be one of ${discussionService.REACTION_EMOJIS.join(", ")}`,
    });
  }

  try {
    const reaction = await discussionService.addReaction(projectId, discussionId, req.userId!, emoji);
    return res.status(201).json(reaction);
  } catch (error) {
    if (error instanceof Error && error.message === "Discussion not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof Error && error.message === "Already reacted with this emoji") {
      return res.status(409).json({ error: error.message });
    }
    logError("discussion.addReaction", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const removeReaction = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;
  const discussionId = req.params.discussionId as string;
  const emoji = req.params.emoji as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    await discussionService.removeReaction(projectId, discussionId, req.userId!, emoji);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === "Discussion not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof Error && error.message === "Reaction not found") {
      return res.status(404).json({ error: error.message });
    }
    logError("discussion.removeReaction", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
