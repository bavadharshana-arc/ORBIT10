import type { Request, Response } from "express";
import * as activityService from "../services/activity.service";
import * as projectService from "../services/project.service";
import * as workspaceService from "../services/workspace.service";
import { logError } from "../lib/logger";

export const createActivityEvent = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const { type, text, actorId } = req.body ?? {};

  if (!activityService.isActivityEventType(type)) {
    return res.status(400).json({
      error: `type must be one of ${activityService.ACTIVITY_EVENT_TYPES.join(", ")}`,
    });
  }

  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  if (actorId !== undefined) {
    if (actorId !== null && typeof actorId !== "string") {
      return res.status(400).json({ error: "actorId must be a string or null" });
    }
    if (actorId !== null) {
      // A single membership lookup covers both "user doesn't exist" and
      // "user exists but isn't in this workspace" — same convention as
      // Task.assigneeId and ProjectMember.addMember's validation.
      const membership = await workspaceService.findMembership(workspaceId, actorId);
      if (!membership) {
        return res.status(400).json({ error: "actorId must be a member of this workspace" });
      }
    }
  }

  try {
    const event = await activityService.createActivityEvent(projectId, type, text.trim(), actorId);
    return res.status(201).json(event);
  } catch (error) {
    logError("activity.createActivityEvent", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const listActivity = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    const events = await activityService.listActivityForProject(projectId);
    return res.status(200).json(events);
  } catch (error) {
    logError("activity.listActivity", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
