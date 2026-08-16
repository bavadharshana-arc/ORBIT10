import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspaceMembership } from "../middleware/workspace.middleware";
import {
  createComment,
  deleteComment,
  listComments,
  updateComment,
} from "../controllers/comment.controller";

// Mounted at /api/workspaces/:id/projects/:projectId/tasks/:taskId/comments.
// `:id` is the workspace id (matched by requireWorkspaceMembership);
// `:projectId`/`:taskId` are verified against it inside the controller,
// same two-level scoping task.routes.ts uses for project/task.
//
// Unlike Project/Task, comment mutations aren't role-gated at the route
// level — edit is author-only and delete is author-or-OWNER/ADMIN, both
// resource-ownership checks the controller/service enforce, since
// requireWorkspaceRole can only express a fixed role set, not "role OR
// resource ownership".
const router = Router({ mergeParams: true });

router.get("/", authMiddleware, requireWorkspaceMembership, listComments);
router.post("/", authMiddleware, requireWorkspaceMembership, createComment);
router.patch("/:commentId", authMiddleware, requireWorkspaceMembership, updateComment);
router.delete("/:commentId", authMiddleware, requireWorkspaceMembership, deleteComment);

export default router;
