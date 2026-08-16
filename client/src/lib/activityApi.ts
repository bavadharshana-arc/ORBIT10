import { apiGet, apiPost } from "./api";
import type { ActivityEventType } from "../types/workspace";

/* ============================================================
   PROJECT ACTIVITY API (Stage 5 — Real Activity)

   Mirrors server/src/services/activity.service.ts's shape. `actor` is
   embedded directly by the backend (id/name/email — no avatarBg/Fg,
   same select shape workspace.service.ts uses elsewhere), so a real
   avatar color still needs a cross-reference against the already-
   fetched workspace roster, same pattern as every other real-actor
   resolution this session.
============================================================ */

export interface ActivityActorRef {
  id: string;
  name: string | null;
  email: string;
}

export interface ActivityEventRecord {
  id: string;
  projectId: string;
  type: ActivityEventType;
  text: string;
  createdAt: string;
  actor: ActivityActorRef | null;
}

export interface CreateActivityEventInput {
  type: ActivityEventType;
  text: string;
  /** Real userId of who caused this — must be a member of the workspace. Omit for a system/unattributed event. */
  actorId?: string | null;
}

const activityPath = (workspaceId: string, projectId: string) => `/workspaces/${workspaceId}/projects/${projectId}/activity`;

export function listActivity(workspaceId: string, projectId: string): Promise<ActivityEventRecord[]> {
  return apiGet<ActivityEventRecord[]>(activityPath(workspaceId, projectId));
}

export function createActivityEvent(
  workspaceId: string,
  projectId: string,
  input: CreateActivityEventInput,
): Promise<ActivityEventRecord> {
  return apiPost<ActivityEventRecord>(activityPath(workspaceId, projectId), input);
}
