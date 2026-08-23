import type { Request, Response } from "express";
import * as projectMemberService from "../services/projectMember.service";
import * as projectService from "../services/project.service";
import * as notificationService from "../services/notification.service";
import { logError } from "../lib/logger";

export const listMembers = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;

  const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  try {
    const members = await projectMemberService.listMembers(projectId);
    return res.status(200).json(members);
  } catch (error) {
    logError("projectMember.listMembers", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const addMember = async (req: Request, res: Response) => {
  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;
  const { userId, role } = req.body ?? {};

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "userId is required" });
  }

  const resolvedRole = role ?? "Viewer";
  if (!projectMemberService.isProjectRole(resolvedRole)) {
    return res.status(400).json({
      error: `role must be one of ${projectMemberService.PROJECT_ROLES.join(", ")}`,
    });
  }

  try {
    const member = await projectMemberService.addMember(workspaceId, projectId, userId, resolvedRole);

    // Step 8: notify the newly-added member. Best-effort — a notification
    // failure must never turn an otherwise-successful add into an error
    // response.
    try {
      const project = await projectService.findProjectInWorkspace(workspaceId, projectId);
      await notificationService.createNotification(
        req.userId!,
        {
          type: "team",
          title: "You were added to a project",
          message: `You were added to ${project?.name ?? "a project"}.`,
          actionHref: null,
        },
        userId,
      );
    } catch (notificationError) {
      console.error("Failed to create project-member-added notification:", notificationError);
    }

    return res.status(201).json(member);
  } catch (error) {
    if (error instanceof Error && error.message === "User must be a member of this workspace") {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof Error && error.message === "User is already a member of this project") {
      return res.status(409).json({ error: error.message });
    }
    logError("projectMember.addMember", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateMemberRole = async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const { role } = req.body ?? {};

  if (!projectMemberService.isProjectRole(role)) {
    return res.status(400).json({
      error: `role must be one of ${projectMemberService.PROJECT_ROLES.join(", ")}`,
    });
  }

  try {
    const member = await projectMemberService.updateMemberRole(
      projectId,
      req.params.memberId as string,
      role,
    );
    return res.status(200).json(member);
  } catch (error) {
    if (error instanceof Error && error.message === "Member not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof Error && error.message === "Cannot demote the last Owner of a project") {
      return res.status(409).json({ error: error.message });
    }
    logError("projectMember.updateMemberRole", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const removeMember = async (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;

  try {
    await projectMemberService.removeMember(projectId, req.params.memberId as string);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === "Member not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof Error && error.message === "Cannot remove the last Owner of a project") {
      return res.status(409).json({ error: error.message });
    }
    logError("projectMember.removeMember", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
