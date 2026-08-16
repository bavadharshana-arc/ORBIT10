import type { NextFunction, Request, Response } from "express";
import { findProjectInWorkspace } from "../services/project.service";
import {
  findProjectMembership,
  isProjectRole,
  type ProjectRole,
} from "../services/projectMember.service";

declare global {
  namespace Express {
    interface Request {
      projectRole?: ProjectRole;
    }
  }
}

/**
 * Confirms the project in `:projectId` belongs to the workspace in `:id`
 * and that the authenticated user is a member of that *project*
 * (independent of their workspace role — see projectMember.service.ts).
 * Attaches the caller's project role to `req.projectRole` for use by
 * `requireProjectRole`. Must run after `authMiddleware` and
 * `requireWorkspaceMembership`.
 */
export const requireProjectMembership = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const workspaceId = req.params.id as string;
  const projectId = req.params.projectId as string;

  try {
    const project = await findProjectInWorkspace(workspaceId, projectId);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const membership = await findProjectMembership(projectId, req.userId);
    const role = membership?.role;

    if (!isProjectRole(role)) {
      return res.status(403).json({ error: "You are not a member of this project" });
    }

    req.projectRole = role;

    return next();
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Restricts a route to callers whose project role is in `allowedRoles`.
 * Must run after `requireProjectMembership`.
 */
export const requireProjectRole = (...allowedRoles: ProjectRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.projectRole || !allowedRoles.includes(req.projectRole)) {
      return res.status(403).json({ error: "You do not have permission to perform this action" });
    }

    return next();
  };
};
