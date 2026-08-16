
import type { NextFunction, Request, Response } from "express";
import {
  findMembership,
  findWorkspaceById,
  isWorkspaceRole,
  type WorkspaceRole,
} from "../services/workspace.service";

declare global {
  namespace Express {
    interface Request {
      workspaceRole?: WorkspaceRole;
    }
  }
}

/**
 * Confirms the workspace in `:id` exists and that the authenticated user is a
 * member of it. Attaches the caller's role to `req.workspaceRole` for use by
 * `requireWorkspaceRole`. Must run after `authMiddleware`.
 */
export const requireWorkspaceMembership = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const workspaceId = req.params.id as string;

  try {
    const workspace = await findWorkspaceById(workspaceId);

    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    const membership = await findMembership(workspaceId, req.userId);
    const role = membership?.role;

    if (!isWorkspaceRole(role)) {
      return res.status(403).json({ error: "You are not a member of this workspace" });
    }

    req.workspaceRole = role;

    return next();
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Restricts a route to callers whose workspace role is in `allowedRoles`.
 * Must run after `requireWorkspaceMembership`.
 */
export const requireWorkspaceRole = (...allowedRoles: WorkspaceRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.workspaceRole || !allowedRoles.includes(req.workspaceRole)) {
      return res.status(403).json({ error: "You do not have permission to perform this action" });
    }

    return next();
  };
};
