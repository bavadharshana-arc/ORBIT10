import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspaceMembership } from "../middleware/workspace.middleware";
import { requireProjectMembership, requireProjectRole } from "../middleware/project.middleware";
import { createFile, deleteFile, listFiles } from "../controllers/projectFile.controller";

// Mounted at /api/workspaces/:id/projects/:projectId/files. Listing only
// requires workspace membership (same read-breadth as Task/Discussion/
// Objective/Milestone lists); create/delete require project Owner or
// Editor — the frontend's canEditProjectContent() gate — via Phase 10's
// requireProjectMembership/requireProjectRole, reused unmodified. Metadata
// only — no byte storage, no upload/download handling (Phase 15 approved
// scope).
const router = Router({ mergeParams: true });

router.get("/", authMiddleware, requireWorkspaceMembership, listFiles);
router.post(
  "/",
  authMiddleware,
  requireWorkspaceMembership,
  requireProjectMembership,
  requireProjectRole("Owner", "Editor"),
  createFile,
);
router.delete(
  "/:fileId",
  authMiddleware,
  requireWorkspaceMembership,
  requireProjectMembership,
  requireProjectRole("Owner", "Editor"),
  deleteFile,
);

export default router;
