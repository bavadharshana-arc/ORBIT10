import { Fragment, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";
import type { Project } from "../../types/dashboard";
import { Pill } from "../ui/Pill";
import { AvatarStack } from "../ui/AvatarStack";
import { useProjectContext } from "../../context/projectContextValue";
import { useNotificationContext } from "../../context/notificationContextValue";
import { buildNewProject } from "../../data/projectData";
import { loadMembers } from "../../data/teamData";
import { resolveCurrentActor } from "../../data/workspaceData";
import { notifyProjectCreated } from "../../data/systemNotifications";
import { CreateProjectDrawer, type CreateProjectValues } from "../CreateProjectDrawer";
import { useAuth } from "../../context/AuthContext";
import { canManageProjects, resolveEffectiveRole } from "../../lib/permissions";

interface ProjectRowProps {
  project: Project;
  onSelect: () => void;
}

function getStatusColor(progress: number): string {
  if (progress < 40) return "var(--text)";
  if (progress < 80) return "var(--blue-dark)";
  return "var(--blue)";
}


function ProjectRow({ project, onSelect }: ProjectRowProps) {
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

      <AvatarStack people={project.people} />

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
  const { projects, setProjects } = useProjectContext();
  const { addNotification } = useNotificationContext();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();

  const members = useMemo(() => loadMembers(), []);
  const { user, role: authRole } = useAuth();
  const currentActor = useMemo(() => resolveCurrentActor(members, user), [members, user]);
  // Project creation is the "projects" resource in lib/permissions.ts —
  // Project Manager and above. Gates both the "New project" button below
  // and handleCreateProject itself, so a hidden button can't be bypassed.
  const canCreate = canManageProjects(resolveEffectiveRole(authRole));

  function handleCreateProject(values: CreateProjectValues) {
    if (!canCreate) return;

    const newProject = buildNewProject(values, currentActor.initials);

    setProjects((current) => [newProject, ...current]);
    setIsDrawerOpen(false);

    notifyProjectCreated(addNotification, {
      projectName: newProject.name,
      actor: currentActor,
      actionHref: `/projects/${newProject.id}/overview`,
    });
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

      <div style={{ marginTop: 6 }}>
        {projects.map((project, i) => (
          <Fragment key={project.id}>
            <ProjectRow project={project} onSelect={() => navigate(`/projects/${project.id}`)} />
            {i < projects.length - 1 && <div className="border-soft-t" />}
          </Fragment>
        ))}
      </div>

      <CreateProjectDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onCreate={handleCreateProject} />
    </div>
  );
}
