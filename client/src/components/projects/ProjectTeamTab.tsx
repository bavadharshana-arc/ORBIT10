import { useEffect, useMemo, useState } from "react";
import { Users, Crown, Gauge, ChevronDown, X } from "lucide-react";

import { mapWorkspaceMemberToMember, getInitials, type Member } from "../../data/teamData";
import { useProjectWorkspace } from "../../context/projectWorkspaceContext";
import { useTaskContext } from "../../context/taskContextValue";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/workspaceContextValue";
import { getMemberWorkload, PROJECT_PERMISSIONS, canManageProject } from "../../data/workspaceData";
import { ApiError } from "../../lib/api";
import {
  listProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
  type ProjectMemberRecord,
  type ProjectMemberRole,
} from "../../lib/projectMemberApi";
import { createActivityEvent } from "../../lib/activityApi";
import { StatCard } from "../dashboard/StatCard";
import { Avatar } from "../ui/Avatar";
import { ProjectAddMemberMenu } from "./ProjectAddMemberMenu";

/* ============================================================
   PROJECT TEAM TAB (Stage 6 — Permissions Alignment)

   Add/remove/role-change now call the real ProjectMember CRUD API
   (projectMember.routes.ts — the write endpoints always existed on
   the backend, just unwired on the frontend until now; see
   lib/projectMemberApi.ts's doc comment). This roster is also what
   ProjectWorkspace.tsx's real `permission` is derived from — without
   a real way to add someone here, only each project's original
   creator would ever have any project-level access.
============================================================ */

function MemberCard({
  record,
  canManage,
  workload,
  onPermissionChange,
  onRemove,
}: {
  record: ProjectMemberRecord;
  canManage: boolean;
  workload: { active: number; completed: number; total: number };
  onPermissionChange: (role: ProjectMemberRole) => void;
  onRemove: () => void;
}) {
  const name = record.user.name ?? record.user.email;
  const initials = getInitials(name);
  const activeShare = workload.total > 0 ? Math.round((workload.active / workload.total) * 100) : 0;

  return (
    <div className="bg-card border-soft shadow-float lift fade-in" style={{ borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center" style={{ gap: 11 }}>
          <Avatar initials={initials} bg={record.user.avatarBg ?? undefined} fg={record.user.avatarFg ?? undefined} size={40} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 650, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
            <div className="text-ink-3" style={{ fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{record.user.jobTitle ?? record.user.email}</div>
          </div>
        </div>
        {canManage && (
          <button type="button" aria-label={`Remove ${name} from project`} onClick={onRemove} style={{ border: "none", background: "var(--surface-2)", borderRadius: 8, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-3)", flexShrink: 0 }}>
            <X size={13} />
          </button>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between" style={{ marginBottom: 5 }}>
          <span className="text-ink-3" style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>Workload</span>
          <span className="text-ink-3" style={{ fontSize: 11 }}>{workload.active} active &middot; {workload.completed} done</span>
        </div>
        <div style={{ height: 5, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${activeShare}%`, height: "100%", background: "var(--blue-dark)" }} />
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <select
          value={record.role}
          onChange={(event) => onPermissionChange(event.target.value as ProjectMemberRole)}
          disabled={!canManage}
          style={{
            width: "100%",
            appearance: "none",
            border: "1px solid var(--border)",
            borderRadius: 10,
            background: "var(--surface-2)",
            padding: "8px 30px 8px 12px",
            fontSize: 11.5,
            fontWeight: 600,
            color: "var(--text)",
            outline: "none",
            cursor: canManage ? "pointer" : "default",
          }}
        >
          {PROJECT_PERMISSIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <ChevronDown size={13} strokeWidth={2} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-3)" }} />
      </div>
    </div>
  );
}

export function ProjectTeamTab() {
  const { project, projectTasks, permission } = useProjectWorkspace();
  // Owner only — matches POST/PATCH/DELETE .../members's real gate
  // (requireProjectRole("Owner"), projectMember.routes.ts).
  const canManage = canManageProject(permission);
  const { currentWorkspaceId } = useWorkspace();
  const { workspaceMembers } = useTaskContext();
  const { user } = useAuth();

  const [memberRecords, setMemberRecords] = useState<ProjectMemberRecord[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled || !currentWorkspaceId) return null;
        setMembersLoading(true);
        setMembersError(null);
        return listProjectMembers(currentWorkspaceId, project.id);
      })
      .then((fetched) => {
        if (cancelled) return;
        if (!currentWorkspaceId || !fetched) {
          setMemberRecords([]);
          return;
        }
        setMemberRecords(fetched);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMemberRecords([]);
        setMembersError(err instanceof ApiError ? err.message : "Couldn't load project members. Try again in a moment.");
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentWorkspaceId, project.id]);

  // Real workspace members not already on this project — offered as
  // add-candidates. mapWorkspaceMemberToMember reused unchanged so
  // ProjectAddMemberMenu (its existing Member[] prop shape) needs no
  // changes of its own.
  const candidates = useMemo<Member[]>(() => {
    const onProjectUserIds = new Set(memberRecords.map((record) => record.userId));
    return workspaceMembers.filter((member) => !onProjectUserIds.has(member.userId)).map(mapWorkspaceMemberToMember);
  }, [workspaceMembers, memberRecords]);

  function logActivity(type: "member_added" | "member_removed", text: string) {
    if (!currentWorkspaceId) return;
    // Best-effort — the membership change already succeeded by the time
    // this is called, so a logging failure shouldn't surface as if it
    // failed too.
    createActivityEvent(currentWorkspaceId, project.id, { type, text, actorId: user?.id }).catch((err: unknown) =>
      console.error("Couldn't log project activity:", err),
    );
  }

  async function handleAdd(candidate: Member) {
    if (!canManage || !currentWorkspaceId) return;
    // candidate.id is the WorkspaceMember row id (mapWorkspaceMemberToMember)
    // — resolve it back to the real userId addProjectMember needs.
    const workspaceMember = workspaceMembers.find((member) => member.id === candidate.id);
    if (!workspaceMember) return;

    setMutationError(null);
    try {
      const record = await addProjectMember(currentWorkspaceId, project.id, workspaceMember.userId, "Viewer");
      setMemberRecords((current) => [...current, record]);
      logActivity("member_added", `${candidate.name} was added to the project`);
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : "Couldn't add that member. Try again.");
    }
  }

  async function handleRemove(record: ProjectMemberRecord) {
    if (!canManage || !currentWorkspaceId) return;

    setMutationError(null);
    try {
      await removeProjectMember(currentWorkspaceId, project.id, record.id);
      setMemberRecords((current) => current.filter((candidate) => candidate.id !== record.id));
      logActivity("member_removed", `${record.user.name ?? record.user.email} was removed from the project`);
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : "Couldn't remove that member. Try again.");
    }
  }

  async function handlePermissionChange(record: ProjectMemberRecord, role: ProjectMemberRole) {
    if (!canManage || !currentWorkspaceId) return;

    setMutationError(null);
    try {
      const updated = await updateProjectMemberRole(currentWorkspaceId, project.id, record.id, role);
      setMemberRecords((current) => current.map((candidate) => (candidate.id === record.id ? updated : candidate)));
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : "Couldn't update that member's role. Try again.");
    }
  }

  const ownerCount = memberRecords.filter((record) => record.role === "Owner").length;
  const workloads = memberRecords.map((record) => getMemberWorkload(getInitials(record.user.name ?? record.user.email), projectTasks));
  const overloaded = workloads.filter((workload) => workload.active > 5).length;

  return (
    <div className="fade-in flex flex-col" style={{ gap: 16 }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display" style={{ fontSize: 17, fontWeight: 560, color: "var(--text)", marginBottom: 4 }}>Team</h2>
          <p className="text-ink-2" style={{ fontSize: 12.5 }}>{memberRecords.length} member{memberRecords.length === 1 ? "" : "s"} on this project.</p>
        </div>
        {canManage && <ProjectAddMemberMenu candidates={candidates} onAdd={handleAdd} />}
      </div>

      {mutationError && <p style={{ margin: 0, fontSize: 12.5, color: "#B3564B" }}>{mutationError}</p>}

      <div className="grid grid-cols-2 xl:grid-cols-4" style={{ gap: 12 }}>
        <StatCard label="Members" value={String(memberRecords.length)} icon={Users} compact />
        <StatCard label="Owners" value={String(ownerCount)} icon={Crown} compact />
        <StatCard label="Avg. workload" value={memberRecords.length > 0 ? String(Math.round(workloads.reduce((s, w) => s + w.active, 0) / memberRecords.length)) : "0"} icon={Gauge} compact />
        <StatCard label="Overloaded" value={String(overloaded)} icon={Gauge} compact />
      </div>

      {membersLoading ? (
        <div className="bg-card border-soft shadow-float fade-in flex flex-col items-center" style={{ borderRadius: 20, padding: "48px 24px", textAlign: "center", gap: 10 }}>
          <p className="text-ink-3" style={{ fontSize: 12.5 }}>Loading project members…</p>
        </div>
      ) : membersError ? (
        <div className="bg-card border-soft shadow-float fade-in flex flex-col items-center" style={{ borderRadius: 20, padding: "48px 24px", textAlign: "center", gap: 10 }}>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: "#B3564B" }}>Couldn't load project members</p>
          <p className="text-ink-3" style={{ fontSize: 12, maxWidth: 300 }}>{membersError}</p>
        </div>
      ) : memberRecords.length === 0 ? (
        <div className="bg-card border-soft shadow-float fade-in flex flex-col items-center" style={{ borderRadius: 20, padding: "48px 24px", textAlign: "center", gap: 10 }}>
          <Users size={22} strokeWidth={1.6} color="var(--text-3)" />
          <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>No members yet</p>
          <p className="text-ink-3" style={{ fontSize: 12, maxWidth: 280 }}>Add people from your workspace to start collaborating on this project.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" style={{ gap: 14 }}>
          {memberRecords.map((record, index) => (
            <MemberCard
              key={record.id}
              record={record}
              canManage={canManage}
              workload={workloads[index]}
              onPermissionChange={(role) => handlePermissionChange(record, role)}
              onRemove={() => handleRemove(record)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
