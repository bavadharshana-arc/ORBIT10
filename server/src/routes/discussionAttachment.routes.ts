import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspaceMembership } from "../middleware/workspace.middleware";
import { requireProjectMembership, requireProjectRole } from "../middleware/project.middleware";
import { addAttachment, removeAttachment } from "../controllers/discussionAttachment.controller";

// Mounted at
// /api/workspaces/:id/projects/:projectId/discussions/:discussionId/attachments.
// Attach/detach require project Commenter and above, matching reply/reaction
// write access on discussion.routes.ts — Phase 16 approved Option B. Reads
// aren't a route here: attachments ride along with the parent Discussion's
// own GET (discussion.service.ts's withRelations), same as replies/reactions.
const router = Router({ mergeParams: true });

router.post(
  "/",
  authMiddleware,
  requireWorkspaceMembership,
  requireProjectMembership,
  requireProjectRole("Owner", "Editor", "Commenter"),
  addAttachment,
);

router.delete(
  "/:attachmentId",
  authMiddleware,
  requireWorkspaceMembership,
  requireProjectMembership,
  requireProjectRole("Owner", "Editor", "Commenter"),
  removeAttachment,
);

export default router;
