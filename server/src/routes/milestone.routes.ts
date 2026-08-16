import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspaceMembership } from "../middleware/workspace.middleware";
import { requireProjectMembership, requireProjectRole } from "../middleware/project.middleware";
import {
  createMilestone,
  deleteMilestone,
  listMilestones,
  updateMilestone,
} from "../controllers/milestone.controller";

// Mounted at /api/workspaces/:id/projects/:projectId/milestones. Same
// authorization shape as objective.routes.ts: any workspace member reads,
// project Owner/Editor mutates.
const router = Router({ mergeParams: true });

router.get("/", authMiddleware, requireWorkspaceMembership, listMilestones);
router.post(
  "/",
  authMiddleware,
  requireWorkspaceMembership,
  requireProjectMembership,
  requireProjectRole("Owner", "Editor"),
  createMilestone,
);
router.patch(
  "/:milestoneId",
  authMiddleware,
  requireWorkspaceMembership,
  requireProjectMembership,
  requireProjectRole("Owner", "Editor"),
  updateMilestone,
);
router.delete(
  "/:milestoneId",
  authMiddleware,
  requireWorkspaceMembership,
  requireProjectMembership,
  requireProjectRole("Owner", "Editor"),
  deleteMilestone,
);

export default router;
