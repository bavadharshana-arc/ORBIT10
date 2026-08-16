import { Fragment, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";
import type { Project, TeamMember } from "../../types/dashboard";
import { Pill } from "../ui/Pill";
import { AvatarStack } from "../ui/AvatarStack";
import { useProjectContext } from "../../context/projectContextValue";
import { useTaskContext } from "../../context/taskContextValue";
import { useWorkspace } from "../../context/workspaceContextValue";
import { useNotificationContext } from "../../context/notificationContextValue";
import { loadMembers, mapProjectMemberToTeamMember } from "../../data/teamData";
import { formatProjectDue } from "../../data/projectData";
import { resolveCurrentActor } from "../../data/workspaceData";
import { notifyProjectCreated } from "../../data/systemNotifications";
import { ApiError } from "../../lib/api";
import { createProject as createProjectRequest } from "../../lib/projectApi";
import { CreateProjectDrawer, type CreateProjectValues } from "../CreateProjectDrawer";
import { useAuth } from "../../context/AuthContext";
import { useWorkspaceRole, isWorkspaceManager } from "../../hooks/useWorkspaceRole";

interface ProjectRowProps {
  project: Project;
  /** This project's real roster, mapped to display avatars — see ProjectContext.tsx's projectMembersByProjectId. */
  people: TeamMember[];
  onSelect: () => void;
}

function getStatusColor(progress: number): string {
  if (progress < 40) return "var(--text)";
  if (progress < 80) return "var(--blue-dark)";
  return "var(--blue)";
}


function ProjectRow({ project, people, onSelect }: ProjectRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className="lift flex items-center gap-2 sm:gap-3 lg:gap-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: "13px 10px",
        borderRadius: 14,
        cursor: "pointer",
        background: isHovered ? "var(--surface-2)" : "transparent",
        transition: "background 160ms ease",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center" style={{ gap: 8, marginBottom: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: project.color ?? "var(--blue-dark)", flexShrink: 0 }} />
          <span style={{ fontSize: 15, fontWeight: 650, color: "var(--text)" }}>{project.name}</span>
          <Pill tone="surface">{project.tag}</Pill>
        </div>
        <div className="flex items-center text-ink-3" style={{ gap: 14, fontSize: 12 }}>
          <span>{project.tasks}</span>
          <span>&middot;</span>
          <span>{project.due}</span>
        </div>
      </div>

      <AvatarStack people={people} />

      <div className="w-16 sm:w-20 lg:w-[92px]">
        <div style={{ height: 5, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
          <div
            style={{
              width: `${project.progress}%`,
              height: "100%",
              background: project.progress > 80 ? "var(--blue-dark)" : "var(--blue)",
              borderRadius: 999,
              transition: "width 400ms ease",
            }}
          />
        </div>
        <div className="flex items-center" style={{ gap: 5, marginTop: 5, justifyContent: "flex-end" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: getStatusColor(project.progress), flexShrink: 0 }} />
          <span className="text-ink-3" style={{ fontSize: 11 }}>
            {project.progress}%
          </span>
        </div>
      </div>

      <ChevronRight
        size={16}
        style={{ color: "var(--text-3)", flexShrink: 0, transform: isHovered ? "translateX(2px)" : "none", transition: "transform 160ms ease" }}
      />
    </div>
  );
}

export function ProjectsWidget() {
  const { projects, setProjects, projectMembersByProjectId, addProjectMember } = useProjectContext();
  const { workspaceMembers } = useTaskContext();
  const { currentWorkspaceId } = useWorkspace();
  const { addNotification } = useNotificationContext();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const navigate = useNavigate();

  const members = useMemo(() => loadMembers(), []);
  const { user } = useAuth();
  const currentActor = useMemo(() => resolveCurrentActor(members, user), [members, user]);
  // Stage 6 (Permissions Alignment): real WorkspaceRole — matches
  // POST /projects's actual gate (requireWorkspaceRole("OWNER", "ADMIN"),
  // project.routes.ts), same as Projects.tsx's own create gate.
  const workspaceRole = useWorkspaceRole();
  const canCreate = isWorkspaceManager(workspaceRole);

  // Stage 4 (Real Notifications) discovery: this widget used to build its
  // new project entirely locally (buildNewProject + generateProjectId) —
  // never persisted to the backend, gone on refresh, unlike Projects.tsx's
  // real creation flow. A "project created" notification would be lying
  // to real recipients about a project that doesn't exist, so this now
  // calls the same real API Projects.tsx already uses.
  async function handleCreateProject(values: CreateProjectValues) {
    if (!canCreate || !currentWorkspaceId) return;

    setMutationError(null);

    try {
      const record = await createProjectRequest(currentWorkspaceId, {
        name: values.name,
        description: values.description || undefined,
        tag: values.tag,
        color: values.color,
        startDate: values.startDate || null,
        dueDate: values.dueDate || null,
      });

      const dueDate = record.dueDate?.slice(0, 10);

      const newProject: Project = {
        id: record.id,
        name: record.name,
        tag: record.tag ?? "",
        progress: 0,
        tasks: "0 / 0 tasks",
        due: dueDate ? formatProjectDue(dueDate) : "No due date",
        description: record.description ?? undefined,
        color: record.color ?? undefined,
        startDate: record.startDate?.slice(0, 10),
        dueDate,
        createdAt: record.createdAt,
        memberRoles: { [currentActor.initials]: "Owner" },
      };

      setProjects((current) => [newProject, ...current]);
      setIsDrawerOpen(false);

      // See Projects.tsx's handleCreateProject — same real, best-effort
      // ProjectMember adds, kept in sync via the same shared
      // ProjectContext this widget also renders from.
      const otherMemberIds = values.memberUserIds.filter((id) => id !== user?.id);
      await Promise.all(
        otherMemberIds.map((userId) =>
          addProjectMember(newProject.id, userId, "Viewer").catch((error: unknown) =>
            console.error("Couldn't add project member:", error),
          ),
        ),
      );

      notifyProjectCreated(addNotification, {
        projectName: newProject.name,
        actor: currentActor,
        actionHref: `/projects/${newProject.id}/overview`,
        recipientIds: workspaceMembers.map((member) => member.userId).filter((id) => id !== user?.id),
      });
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : "Couldn't create the project. Try again.");
    }
  }

  return (
    <div className="bg-card border-soft shadow-float fade-in p-4 sm:p-5 lg:p-[22px]" style={{ borderRadius: 22 }}>
      <div className="flex items-center" style={{ justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 560, color: "var(--text)" }}>
            Your projects
          </h2>
          <span className="text-ink-3" style={{ fontSize: 12.5 }}>
            {projects.length} active project{projects.length === 1 ? "" : "s"}
          </span>
        </div>
        {canCreate && (
          <button
            type="button"
            className="nav-item"
            onClick={() => setIsDrawerOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              border: "none",
              background: "var(--surface-2)",
              borderRadius: 12,
              padding: "8px 12px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              color: "var(--text)",
            }}
          >
            <Plus size={14} />
            New project
          </button>
        )}
      </div>

      {mutationError && (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#B3564B" }}>{mutationError}</p>
      )}

      <div style={{ marginTop: 6 }}>
        {projects.map((project, i) => (
          <Fragment key={project.id}>
            <ProjectRow
              project={project}
              people={(projectMembersByProjectId[project.id] ?? []).map(mapProjectMemberToTeamMember)}
              onSelect={() => navigate(`/projects/${project.id}`)}
            />
            {i < projects.length - 1 && <div className="border-soft-t" />}
          </Fragment>
        ))}
      </div>

      <CreateProjectDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCreate={handleCreateProject}
        workspaceMembers={workspaceMembers.filter((member) => member.userId !== user?.id)}
      />
    </div>
  );
}
