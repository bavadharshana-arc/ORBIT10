import { apiGet, apiPost } from "./api";

/* ============================================================
   WORKSPACE ACTIVITY API (Stage 5 — Real Activity)

   Mirrors server/src/services/workspaceActivity.service.ts's shape —
   backs Team.tsx's ActivityFeed (member added/role changed/removed).
   `member` here is the workspace member the event is *about*
   (WorkspaceActivityEvent.memberId -> User.id), not who performed it
   — matches Team.tsx's existing persistActivity({ memberId, text })
   call shape, just real now.
============================================================ */

export interface WorkspaceActivityMemberRef {
  id: string;
  name: string | null;
  email: string;
}

export interface WorkspaceActivityEventRecord {
  id: string;
  workspaceId: string;
  text: string;
  createdAt: string;
  member: WorkspaceActivityMemberRef | null;
}

export interface CreateWorkspaceActivityInput {
  text: string;
  /** Real userId this event is about — must be a member of the workspace. Omit for a system/unattributed event. */
  memberId?: string | null;
}

const activityPath = (workspaceId: string) => `/workspaces/${workspaceId}/activity`;

export function listWorkspaceActivity(workspaceId: string): Promise<WorkspaceActivityEventRecord[]> {
  return apiGet<WorkspaceActivityEventRecord[]>(activityPath(workspaceId));
}

export function createWorkspaceActivity(
  workspaceId: string,
  input: CreateWorkspaceActivityInput,
): Promise<WorkspaceActivityEventRecord> {
  return apiPost<WorkspaceActivityEventRecord>(activityPath(workspaceId), input);
}
