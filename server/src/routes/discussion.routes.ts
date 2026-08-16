import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspaceMembership } from "../middleware/workspace.middleware";
import { requireProjectMembership, requireProjectRole } from "../middleware/project.middleware";
import {
  addReaction,
  addReply,
  createDiscussion,
  listDiscussions,
  removeReaction,
  updateDiscussion,
} from "../controllers/discussion.controller";

// Mounted at /api/workspaces/:id/projects/:projectId/discussions. Listing
// only requires workspace membership; posting/replying/reacting requires
// project Commenter and above (canCommentOnProject on the frontend);
// pin/unpin requires project Editor and above (canEditProjectContent) —
// both via Phase 10's requireProjectMembership/requireProjectRole, reused
// unmodified, same as objective.routes.ts/milestone.routes.ts.
const router = Router({ mergeParams: true });

router.get("/", authMiddleware, requireWorkspaceMembership, listDiscussions);

router.post(
  "/",
  authMiddleware,
  requireWorkspaceMembership,
  requireProjectMembership,
  requireProjectRole("Owner", "Editor", "Commenter"),
  createDiscussion,
);

router.patch(
  "/:discussionId",
  authMiddleware,
  requireWorkspaceMembership,
  requireProjectMembership,
  requireProjectRole("Owner", "Editor"),
  updateDiscussion,
);

router.post(
  "/:discussionId/replies",
  authMiddleware,
  requireWorkspaceMembership,
  requireProjectMembership,
  requireProjectRole("Owner", "Editor", "Commenter"),
  addReply,
);

router.post(
  "/:discussionId/reactions",
  authMiddleware,
  requireWorkspaceMembership,
  requireProjectMembership,
  requireProjectRole("Owner", "Editor", "Commenter"),
  addReaction,
);

router.delete(
  "/:discussionId/reactions/:emoji",
  authMiddleware,
  requireWorkspaceMembership,
  requireProjectMembership,
  requireProjectRole("Owner", "Editor", "Commenter"),
  removeReaction,
);

export default router;
