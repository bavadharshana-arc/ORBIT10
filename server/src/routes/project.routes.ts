import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspaceMembership, requireWorkspaceRole } from "../middleware/workspace.middleware";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from "../controllers/project.controller";

// Mounted at /api/workspaces/:id/projects — `:id` is the workspace id, matched
// by requireWorkspaceMembership the same way workspace.routes.ts does.
const router = Router({ mergeParams: true });

router.get("/", authMiddleware, requireWorkspaceMembership, listProjects);
router.post(
  "/",
  authMiddleware,
  requireWorkspaceMembership,
  requireWorkspaceRole("OWNER", "ADMIN"),
  createProject,
);

router.get("/:projectId", authMiddleware, requireWorkspaceMembership, getProject);
router.patch(
  "/:projectId",
  authMiddleware,
  requireWorkspaceMembership,
  requireWorkspaceRole("OWNER", "ADMIN"),
  updateProject,
);
router.delete(
  "/:projectId",
  authMiddleware,
  requireWorkspaceMembership,
  requireWorkspaceRole("OWNER", "ADMIN"),
  deleteProject,
);

export default router;
