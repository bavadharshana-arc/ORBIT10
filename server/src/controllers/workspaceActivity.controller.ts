import type { Request, Response } from "express";
import * as workspaceActivityService from "../services/workspaceActivity.service";
import * as workspaceService from "../services/workspace.service";
import { logError } from "../lib/logger";

export const createActivityEvent = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const { text, memberId } = req.body ?? {};

  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  if (memberId !== undefined) {
    if (memberId !== null && typeof memberId !== "string") {
      return res.status(400).json({ error: "memberId must be a string or null" });
    }
    if (memberId !== null) {
      // A single membership lookup covers both "user doesn't exist" and
      // "user exists but isn't in this workspace" — same convention as
      // Task.assigneeId and ActivityEvent.actorId's validation.
      const membership = await workspaceService.findMembership(workspaceId, memberId);
      if (!membership) {
        return res.status(400).json({ error: "memberId must be a member of this workspace" });
      }
    }
  }

  try {
    const event = await workspaceActivityService.createActivityEvent(
      workspaceId,
      text.trim(),
      memberId,
    );
    return res.status(201).json(event);
  } catch (error) {
    logError("workspaceActivity.createActivityEvent", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const listActivity = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;

  try {
    const events = await workspaceActivityService.listActivityForWorkspace(workspaceId);
    return res.status(200).json(events);
  } catch (error) {
    logError("workspaceActivity.listActivity", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
