import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspaceMembership } from "../middleware/workspace.middleware";
import { requireProjectMembership } from "../middleware/project.middleware";
import { createActivityEvent, listActivity } from "../controllers/activity.controller";

// Mounted at /api/workspaces/:id/projects/:projectId/activity.
// GET: any workspace member. POST: any project member — Owner, Editor,
// Commenter, or Viewer — deliberately no requireProjectRole restriction,
// since this is a passive log of actions already permission-checked by
// their own endpoints, not a gated mutation itself (approved Phase 13
// decision — the one place this API doesn't reuse a specific role subset).
const router = Router({ mergeParams: true });

router.get("/", authMiddleware, requireWorkspaceMembership, listActivity);
router.post(
  "/",
  authMiddleware,
  requireWorkspaceMembership,
  requireProjectMembership,
  createActivityEvent,
);

export default router;
