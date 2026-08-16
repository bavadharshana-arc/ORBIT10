import { useAuth } from "../context/AuthContext";
import { useTaskContext } from "../context/taskContextValue";
import type { WorkspaceRole } from "../lib/workspaceApi";

/* ============================================================
   REAL WORKSPACE ROLE (Stage 6 — Permissions Alignment)

   The signed-in user's real WorkspaceRole in the current workspace —
   derived from TaskContext's already-fetched workspace roster (the
   same one workspace-wide across the whole app; zero extra network
   calls here), the same source Team.tsx's own real permission gating
   (myRealRole/canManage/canGrantOwner) already uses. This is what the
   backend actually checks (requireWorkspaceRole), so a control gated
   on it never offers an action the API would then reject with a 403.

   Null while the roster hasn't loaded yet, or if the signed-in user
   genuinely has no membership row in the current workspace.
============================================================ */
export function useWorkspaceRole(): WorkspaceRole | null {
  const { user } = useAuth();
  const { workspaceMembers } = useTaskContext();
  const mine = workspaceMembers.find((member) => member.userId === user?.id);
  return (mine?.role as WorkspaceRole | undefined) ?? null;
}

/** OWNER or ADMIN — matches requireWorkspaceRole("OWNER", "ADMIN"), the gate on task create/update/delete (task.routes.ts), workspace member management (workspace.routes.ts), and workspace-activity posting (workspaceActivity.routes.ts). */
export function isWorkspaceManager(role: WorkspaceRole | null): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** OWNER only — matches DELETE /workspaces/:id's gate (workspace.routes.ts): only an Owner may delete the workspace itself. Workspace *settings* updates (PATCH) are OWNER-or-ADMIN — use isWorkspaceManager for those. */
export function isWorkspaceOwner(role: WorkspaceRole | null): boolean {
  return role === "OWNER";
}
