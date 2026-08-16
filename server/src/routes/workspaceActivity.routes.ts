import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspaceMembership, requireWorkspaceRole } from "../middleware/workspace.middleware";
import { createActivityEvent, listActivity } from "../controllers/workspaceActivity.controller";

// Mounted at /api/workspaces/:id/activity. GET: any workspace member.
// POST: OWNER or ADMIN only — every real trigger of this log on the
// frontend (invite/edit/remove member) is already Admin-and-above gated,
// unlike Phase 13's ActivityEvent where a broader set of project roles
// legitimately trigger events. Reuses workspace.middleware.ts (Phase 7)
// unmodified — no project-scoping involved here.
const router = Router({ mergeParams: true });

router.get("/", authMiddleware, requireWorkspaceMembership, listActivity);
router.post(
  "/",
  authMiddleware,
  requireWorkspaceMembership,
  requireWorkspaceRole("OWNER", "ADMIN"),
  createActivityEvent,
);

export default router;
