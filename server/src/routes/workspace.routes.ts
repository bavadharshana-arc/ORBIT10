import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspaceMembership, requireWorkspaceRole } from "../middleware/workspace.middleware";
import {
  addMember,
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  listMembers,
  listWorkspaces,
  removeMember,
  updateMemberRole,
  updateWorkspace,
} from "../controllers/workspace.controller";

const router = Router();

router.post("/", authMiddleware, createWorkspace);
router.get("/", authMiddleware, listWorkspaces);

router.get("/:id", authMiddleware, requireWorkspaceMembership, getWorkspace);
router.patch(
  "/:id",
  authMiddleware,
  requireWorkspaceMembership,
  requireWorkspaceRole("OWNER", "ADMIN"),
  updateWorkspace,
);
router.delete(
  "/:id",
  authMiddleware,
  requireWorkspaceMembership,
  requireWorkspaceRole("OWNER"),
  deleteWorkspace,
);

router.get("/:id/members", authMiddleware, requireWorkspaceMembership, listMembers);
router.post(
  "/:id/members",
  authMiddleware,
  requireWorkspaceMembership,
  requireWorkspaceRole("OWNER", "ADMIN"),
  addMember,
);
router.patch(
  "/:id/members/:memberId",
  authMiddleware,
  requireWorkspaceMembership,
  requireWorkspaceRole("OWNER", "ADMIN"),
  updateMemberRole,
);
router.delete(
  "/:id/members/:memberId",
  authMiddleware,
  requireWorkspaceMembership,
  requireWorkspaceRole("OWNER", "ADMIN"),
  removeMember,
);

export default router;
