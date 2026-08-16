import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspaceMembership, requireWorkspaceRole } from "../middleware/workspace.middleware";
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
} from "../controllers/task.controller";

// Mounted at /api/workspaces/:id/projects/:projectId/tasks — `:id` is the
// workspace id (matched by requireWorkspaceMembership), `:projectId` is
// verified against it inside the controller, same as project.routes.ts.
const router = Router({ mergeParams: true });

router.get("/", authMiddleware, requireWorkspaceMembership, listTasks);
router.post(
  "/",
  authMiddleware,
  requireWorkspaceMembership,
  requireWorkspaceRole("OWNER", "ADMIN"),
  createTask,
);

router.get("/:taskId", authMiddleware, requireWorkspaceMembership, getTask);
router.patch(
  "/:taskId",
  authMiddleware,
  requireWorkspaceMembership,
  requireWorkspaceRole("OWNER", "ADMIN"),
  updateTask,
);
router.delete(
  "/:taskId",
  authMiddleware,
  requireWorkspaceMembership,
  requireWorkspaceRole("OWNER", "ADMIN"),
  deleteTask,
);

export default router;
