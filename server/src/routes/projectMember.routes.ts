import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspaceMembership } from "../middleware/workspace.middleware";
import { requireProjectMembership, requireProjectRole } from "../middleware/project.middleware";
import {
  addMember,
  listMembers,
  removeMember,
  updateMemberRole,
} from "../controllers/projectMember.controller";

// Mounted at /api/workspaces/:id/projects/:projectId/members. Listing only
// requires workspace membership (any workspace member can see who's on a
// project, same read-breadth as Task/Comment lists) — mutations require the
// caller to already be an Owner *of this project specifically*, independent
// of their workspace role, so they go through requireProjectMembership +
// requireProjectRole("Owner") on top of the workspace-level gate.
const router = Router({ mergeParams: true });

router.get("/", authMiddleware, requireWorkspaceMembership, listMembers);
router.post(
  "/",
  authMiddleware,
  requireWorkspaceMembership,
  requireProjectMembership,
  requireProjectRole("Owner"),
  addMember,
);
router.patch(
  "/:memberId",
  authMiddleware,
  requireWorkspaceMembership,
  requireProjectMembership,
  requireProjectRole("Owner"),
  updateMemberRole,
);
router.delete(
  "/:memberId",
  authMiddleware,
  requireWorkspaceMembership,
  requireProjectMembership,
  requireProjectRole("Owner"),
  removeMember,
);

export default router;
