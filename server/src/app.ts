import express from "express";
import cors from "cors";
import healthRoutes from "./routes/healthRoutes";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import workspaceRoutes from "./routes/workspace.routes";
import projectRoutes from "./routes/project.routes";
import taskRoutes from "./routes/task.routes";
import commentRoutes from "./routes/comment.routes";
import projectMemberRoutes from "./routes/projectMember.routes";
import objectiveRoutes from "./routes/objective.routes";
import milestoneRoutes from "./routes/milestone.routes";
import discussionRoutes from "./routes/discussion.routes";
import activityRoutes from "./routes/activity.routes";
import workspaceActivityRoutes from "./routes/workspaceActivity.routes";
import projectFileRoutes from "./routes/projectFile.routes";
import discussionAttachmentRoutes from "./routes/discussionAttachment.routes";
import notificationRoutes from "./routes/notification.routes";

/**
 * The configured Express app, with every route/middleware wired up but
 * nothing listening on a port yet. Split out from index.ts (Phase 19
 * Frontend Integration follow-up — Add Automated Tests) so tests can
 * import and exercise the real app over HTTP (via a test-owned
 * `app.listen(0)`) without needing index.ts's own fixed-port listener,
 * which would collide with a real running dev server.
 */
export function createApp() {
  const app = express();

  // Phase 18: the frontend now makes real cross-origin requests (Vite dev
  // server on a different port than this API) for the first time — no
  // route before this needed a browser to actually reach it. No cookies
  // are involved anywhere (auth is a Bearer JWT the client attaches
  // itself), so an open CORS policy doesn't expose credentials; it only
  // lets the browser read responses it could already get via curl.
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      message: "ORBIT backend is healthy",
    });
  });

  app.use("/api", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/workspaces", workspaceRoutes);
  app.use("/api/workspaces/:id/projects", projectRoutes);
  app.use("/api/workspaces/:id/projects/:projectId/tasks", taskRoutes);
  app.use("/api/workspaces/:id/projects/:projectId/tasks/:taskId/comments", commentRoutes);
  app.use("/api/workspaces/:id/projects/:projectId/members", projectMemberRoutes);
  app.use("/api/workspaces/:id/projects/:projectId/objectives", objectiveRoutes);
  app.use("/api/workspaces/:id/projects/:projectId/milestones", milestoneRoutes);
  app.use("/api/workspaces/:id/projects/:projectId/discussions", discussionRoutes);
  app.use("/api/workspaces/:id/projects/:projectId/activity", activityRoutes);
  app.use("/api/workspaces/:id/activity", workspaceActivityRoutes);
  app.use("/api/workspaces/:id/projects/:projectId/files", projectFileRoutes);
  app.use(
    "/api/workspaces/:id/projects/:projectId/discussions/:discussionId/attachments",
    discussionAttachmentRoutes,
  );
  app.use("/api/users/me/notifications", notificationRoutes);

  return app;
}
