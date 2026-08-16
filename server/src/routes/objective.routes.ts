import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspaceMembership } from "../middleware/workspace.middleware";
import { requireProjectMembership, requireProjectRole } from "../middleware/project.middleware";
import {
  createObjective,
  deleteObjective,
  listObjectives,
  updateObjective,
} from "../controllers/objective.controller";

// Mounted at /api/workspaces/:id/projects/:projectId/objectives. Listing
// only requires workspace membership (same read-breadth as Task/Comment
// lists); mutations require the caller to be a project Owner or Editor —
// the frontend's canEditProjectContent() gate — via the Phase 10
// requireProjectMembership/requireProjectRole middleware, reused unchanged.
const router = Router({ mergeParams: true });

router.get("/", authMiddleware, requireWorkspaceMembership, listObjectives);
router.post(
  "/",
  authMiddleware,
  requireWorkspaceMembership,
  requireProjectMembership,
  requireProjectRole("Owner", "Editor"),
  createObjective,
);
router.patch(
  "/:objectiveId",
  authMiddleware,
  requireWorkspaceMembership,
  requireProjectMembership,
  requireProjectRole("Owner", "Editor"),
  updateObjective,
);
router.delete(
  "/:objectiveId",
  authMiddleware,
  requireWorkspaceMembership,
  requireProjectMembership,
  requireProjectRole("Owner", "Editor"),
  deleteObjective,
);

export default router;
