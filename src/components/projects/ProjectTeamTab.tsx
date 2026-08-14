import { useMemo, useState } from "react";
import { Users, Crown, Gauge, ChevronDown, X } from "lucide-react";

import type { Project, ProjectPermission, TeamMember } from "../../types/dashboard";
import { loadMembers, type Member } from "../../data/teamData";
import { useProjectWorkspace } from "../../context/projectWorkspaceContext";
import { useProjectContext } from "../../context/projectContextValue";
import { matchMember, getProjectPermission, getMemberWorkload, PROJECT_PERMISSIONS, appendProjectActivity, canManageProject } from "../../data/workspaceData";
import { StatCard } from "../dashboard/StatCard";
import { Avatar } from "../ui/Avatar";
import { Pill } from "../ui/Pill";
import { ProjectAddMemberMenu } from "./ProjectAddMemberMenu";

interface ResolvedTeamMember {
  person: TeamMember;
  matched?: Member;
  name: string;
  jobTitle: string;
  department: string;
  status: Member["status"];
}

const STATUS_DOT: Record<Member["status"], string> = {
  Active: "var(--blue-dark)",
  Away: "#D8A657",
  Offline: "var(--text-3)",
  Invited: "var(--text-3)",
};

function MemberCard({
  resolved,
  permission,
  workload,
  canManage,
  onPermissionChange,
  onRemove,
}: {
  resolved: ResolvedTeamMember;
  permission: ProjectPermission;
  workload: { active: number; completed: number; total: number };
  canManage: boolean;
  onPermissionChange: (permission: ProjectPermission) => void;
  onRemove: () => void;
}) {
  const { person, name, jobTitle, department, status } = resolved;
  const activeShare = workload.total > 0 ? Math.round((workload.active / workload.total) * 100) : 0;

  return (
    <div className="bg-card border-soft shadow-float lift fade-in" style={{ borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center" style={{ gap: 11 }}>
          <div style={{ position: "relative" }}>
            <Avatar initials={person.initials} bg={person.bg} fg={person.fg} size={40} />
            <span style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: STATUS_DOT[status], boxShadow: "0 0 0 2px var(--card)" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 650, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
            <div className="text-ink-3" style={{ fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{jobTitle}</div>
          </div>
        </div>
        {canManage && (
          <button type="button" aria-label={`Remove ${name} from project`} onClick={onRemove} style={{ border: "none", background: "var(--surface-2)", borderRadius: 8, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-3)", flexShrink: 0 }}>
            <X size={13} />
          </button>
        )}
      </div>

      <Pill tone="surface">{department}</Pill>

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
          value={permission}
          onChange={(event) => onPermissionChange(event.target.value as ProjectPermission)}
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
  const canManage = canManageProject(permission);
  const { setProjects } = useProjectContext();
  const [allMembers] = useState<Member[]>(() => loadMembers());

  const resolved = useMemo<ResolvedTeamMember[]>(
    () =>
      project.people.map((person) => {
        const matched = matchMember(person, allMembers);
        return {
          person,
          matched,
          name: matched?.name ?? person.initials,
          jobTitle: matched?.jobTitle ?? "Team member",
          department: matched?.department ?? "—",
          status: matched?.status ?? "Active",
        };
      }),
    [project.people, allMembers]
  );

  const candidates = useMemo(
    () => allMembers.filter((member) => !project.people.some((person) => person.initials === member.initials && person.bg === member.bg)),
    [allMembers, project.people]
  );

  function persist(updater: (current: Project) => Partial<Project>) {
    setProjects((current) => current.map((p) => (p.id === project.id ? { ...p, ...updater(p) } : p)));
  }

  function handleAdd(member: Member) {
    if (!canManage) return;
    persist((p) => ({ people: [...p.people, { initials: member.initials, bg: member.bg, fg: member.fg }] }));
    appendProjectActivity(project.id, { type: "member_added", text: `${member.name} was added to the project` });
  }

  function handleRemove(target: ResolvedTeamMember) {
    if (!canManage) return;
    persist((p) => {
      const memberRoles = { ...p.memberRoles };
      delete memberRoles[target.person.initials];
      return { people: p.people.filter((person) => person !== target.person), memberRoles };
    });
    appendProjectActivity(project.id, { type: "member_removed", text: `${target.name} was removed from the project` });
  }

  function handlePermissionChange(initials: string, newPermission: ProjectPermission) {
    if (!canManage) return;
    persist((p) => ({ memberRoles: { ...p.memberRoles, [initials]: newPermission } }));
  }

  const ownerCount = resolved.filter((r) => getProjectPermission(project, r.person.initials) === "Owner").length;
  const workloads = resolved.map((r) => getMemberWorkload(r.person.initials, projectTasks));
  const overloaded = workloads.filter((w) => w.active > 5).length;

  return (
    <div className="fade-in flex flex-col" style={{ gap: 16 }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display" style={{ fontSize: 17, fontWeight: 560, color: "var(--text)", marginBottom: 4 }}>Team</h2>
          <p className="text-ink-2" style={{ fontSize: 12.5 }}>{resolved.length} member{resolved.length === 1 ? "" : "s"} on this project.</p>
        </div>
        {canManage && <ProjectAddMemberMenu candidates={candidates} onAdd={handleAdd} />}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4" style={{ gap: 12 }}>
        <StatCard label="Members" value={String(resolved.length)} icon={Users} compact />
        <StatCard label="Owners" value={String(ownerCount)} icon={Crown} compact />
        <StatCard label="Avg. workload" value={resolved.length > 0 ? String(Math.round(workloads.reduce((s, w) => s + w.active, 0) / resolved.length)) : "0"} icon={Gauge} compact />
        <StatCard label="Overloaded" value={String(overloaded)} icon={Gauge} compact />
      </div>

      {resolved.length === 0 ? (
        <div className="bg-card border-soft shadow-float fade-in flex flex-col items-center" style={{ borderRadius: 20, padding: "48px 24px", textAlign: "center", gap: 10 }}>
          <Users size={22} strokeWidth={1.6} color="var(--text-3)" />
          <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>No members yet</p>
          <p className="text-ink-3" style={{ fontSize: 12, maxWidth: 280 }}>Add people from your workspace to start collaborating on this project.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" style={{ gap: 14 }}>
          {resolved.map((item, index) => (
            <MemberCard
              key={`${item.person.initials}-${index}`}
              resolved={item}
              permission={getProjectPermission(project, item.person.initials)}
              workload={workloads[index]}
              canManage={canManage}
              onPermissionChange={(newPermission) => handlePermissionChange(item.person.initials, newPermission)}
              onRemove={() => handleRemove(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
