import type { Request, Response } from "express";
import * as workspaceService from "../services/workspace.service";
import { findUserByEmail } from "../services/user.service";

export const createWorkspace = async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    const workspace = await workspaceService.createWorkspace(req.userId!, name.trim());
    return res.status(201).json(workspace);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const listWorkspaces = async (req: Request, res: Response) => {
  try {
    const workspaces = await workspaceService.listWorkspacesForUser(req.userId!);
    return res.status(200).json(workspaces);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getWorkspace = async (req: Request, res: Response) => {
  try {
    const workspace = await workspaceService.findWorkspaceById(req.params.id as string);

    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    return res.status(200).json(workspace);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PATCH /api/workspaces/:id — full-replace of the five Settings ->
 * Workspace fields. Auth/scoping is entirely handled upstream by
 * requireWorkspaceMembership + requireWorkspaceRole("OWNER", "ADMIN")
 * (workspace.routes.ts) — this controller only validates the body.
 */
export const updateWorkspace = async (req: Request, res: Response) => {
  const { name, slug, timezone, dateFormat, weekStart } = req.body ?? {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  if (typeof slug !== "string" || !workspaceService.WORKSPACE_SLUG_PATTERN.test(slug)) {
    return res
      .status(400)
      .json({ error: "slug must contain only lowercase letters, numbers, and single dashes" });
  }

  if (!workspaceService.isWorkspaceTimezone(timezone)) {
    return res.status(400).json({ error: "timezone must be one of the supported time zones" });
  }

  if (!workspaceService.isWorkspaceDateFormat(dateFormat)) {
    return res
      .status(400)
      .json({ error: `dateFormat must be one of ${workspaceService.WORKSPACE_DATE_FORMATS.join(", ")}` });
  }

  if (!workspaceService.isWorkspaceWeekStart(weekStart)) {
    return res
      .status(400)
      .json({ error: `weekStart must be one of ${workspaceService.WORKSPACE_WEEK_STARTS.join(", ")}` });
  }

  try {
    const workspace = await workspaceService.updateWorkspace(req.params.id as string, {
      name: name.trim(),
      slug,
      timezone,
      dateFormat,
      weekStart,
    });
    return res.status(200).json(workspace);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteWorkspace = async (req: Request, res: Response) => {
  try {
    await workspaceService.deleteWorkspace(req.params.id as string);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const listMembers = async (req: Request, res: Response) => {
  try {
    const members = await workspaceService.listMembers(req.params.id as string);
    return res.status(200).json(members);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const addMember = async (req: Request, res: Response) => {
  const { userId, email, role } = req.body;

  let resolvedUserId: string;

  if (userId && typeof userId === "string") {
    resolvedUserId = userId;
  } else if (email && typeof email === "string") {
    // Stage 1 (Real Team Roster): the only way the UI can identify an
    // invitee is by the email they'd sign in with — reuses the same
    // lookup auth.controller.ts's login already does, doesn't add a new
    // route or model. Same 404 as an unresolvable userId below, so a
    // caller can't tell "no such id" from "no such email" (nothing to
    // enumerate either way).
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    resolvedUserId = user.id;
  } else {
    return res.status(400).json({ error: "userId or email is required" });
  }

  const resolvedRole = role ?? "MEMBER";
  if (!workspaceService.isWorkspaceRole(resolvedRole)) {
    return res.status(400).json({ error: "role must be one of OWNER, ADMIN, MEMBER" });
  }

  // Granting OWNER at add-time would otherwise let an ADMIN mint a new OWNER,
  // bypassing the "only an OWNER can change OWNER roles" rule.
  if (resolvedRole === "OWNER" && req.workspaceRole !== "OWNER") {
    return res.status(403).json({ error: "Only an OWNER can add another OWNER" });
  }

  try {
    const member = await workspaceService.addMember(req.params.id as string, resolvedUserId, resolvedRole);
    return res.status(201).json(member);
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof Error && error.message === "User is already a member of this workspace") {
      return res.status(409).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateMemberRole = async (req: Request, res: Response) => {
  const { role } = req.body;

  if (!workspaceService.isWorkspaceRole(role)) {
    return res.status(400).json({ error: "role must be one of OWNER, ADMIN, MEMBER" });
  }

  try {
    const member = await workspaceService.updateMemberRole(
      req.params.id as string,
      req.params.memberId as string,
      role,
      req.workspaceRole!,
    );
    return res.status(200).json(member);
  } catch (error) {
    if (error instanceof Error && error.message === "Member not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof Error && error.message === "Only an OWNER can change OWNER roles") {
      return res.status(403).json({ error: error.message });
    }
    if (error instanceof Error && error.message === "Cannot demote the last OWNER of a workspace") {
      return res.status(409).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const removeMember = async (req: Request, res: Response) => {
  try {
    await workspaceService.removeMember(
      req.params.id as string,
      req.params.memberId as string,
      req.workspaceRole!,
    );
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === "Member not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error instanceof Error && error.message === "Only an OWNER can remove another OWNER") {
      return res.status(403).json({ error: error.message });
    }
    if (error instanceof Error && error.message === "Cannot remove the last OWNER of a workspace") {
      return res.status(409).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};
