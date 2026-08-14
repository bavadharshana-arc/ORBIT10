import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, FolderOpen } from "lucide-react";

import type { Project } from "../types/dashboard";
import { getDueGroup } from "../data/taskData";
import { Pill } from "../components/ui/Pill";
import { AvatarStack } from "../components/ui/AvatarStack";
import { ProgressRing } from "../components/ui/ProgressRing";
import { useProjectContext } from "../context/projectContextValue";
import { formatProjectDue, generateProjectId, getProjectStatus, PROJECT_STATUS_META, buildNewProject } from "../data/projectData";
import { useTaskContext } from "../context/taskContextValue";
import { CreateProjectDrawer, type CreateProjectValues } from "../components/CreateProjectDrawer";
import { ProjectActionsMenu } from "../components/projects/ProjectActionsMenu";
import { ConfirmDangerModal } from "../components/settings/ConfirmDangerModal";
import { loadMembers } from "../data/teamData";
import { resolveCurrentActor, getProjectPermission, canManageProject } from "../data/workspaceData";
import { notifyProjectCreated } from "../data/systemNotifications";
import { useNotificationContext } from "../context/notificationContextValue";
import { useAuth } from "../context/AuthContext";
import { canManageProjects, resolveEffectiveRole } from "../lib/permissions";

type ProjectFilter = "all" | "active" | "completed" | "archived";

const FILTERS: { key: ProjectFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "archived", label: "Archived" },
];

interface ProjectTaskCounts {
  completed: number;
  total: number;
  dueSoon: number;
}

interface ProjectCardProps {
  project: Project;
  taskCounts: ProjectTaskCounts;
  canManage: boolean;
  onSelect: () => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

function ProjectCard({ project, taskCounts, canManage, onSelect, isMenuOpen, onToggleMenu, onEdit, onDuplicate, onArchive, onDelete }: ProjectCardProps) {
  const status = getProjectStatus(project);
  const statusMeta = PROJECT_STATUS_META[status];

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
      className="bg-card border-soft shadow-float lift fade-in flex flex-col"
      style={{ borderRadius: 22, padding: 22, gap: 14, cursor: "pointer" }}
    >
      <div className="flex items-start justify-between" style={{ gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="flex items-center" style={{ gap: 7, marginBottom: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: project.color ?? "var(--blue-dark)", flexShrink: 0 }} />
            <h3 style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.3, color: "var(--text)" }}>{project.name}</h3>
          </div>
          <div className="flex items-center" style={{ gap: 6 }}>
            <Pill tone="surface">{project.tag}</Pill>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: statusMeta.color }}>{statusMeta.label}</span>
          </div>
        </div>

        <div className="flex items-center" style={{ gap: 6, flexShrink: 0 }}>
          <ProgressRing value={project.progress} size={40} stroke={4} />
          {canManage && (
            <ProjectActionsMenu
              isOpen={isMenuOpen}
              onToggle={onToggleMenu}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onArchive={onArchive}
              onDelete={onDelete}
              isArchived={status === "archived"}
            />
          )}
        </div>
      </div>

      <div className="flex items-center text-ink-3" style={{ gap: 10, fontSize: 12, flexWrap: "wrap" }}>
        <span>{`${taskCounts.completed} / ${taskCounts.total} tasks`}</span>
        <span>&middot;</span>
        <span>{project.due}</span>
        {taskCounts.dueSoon > 0 && (
          <>
            <span>&middot;</span>
            <span style={{ color: "var(--text)", fontWeight: 600 }}>
              {taskCounts.dueSoon} due soon
            </span>
          </>
        )}
      </div>

      <div style={{ height: 6, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
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

      <div className="flex items-center justify-between">
        <AvatarStack people={project.people} />
        <span className="text-ink-3" style={{ fontSize: 11.5, fontWeight: 600 }}>
          {project.progress}%
        </span>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  message: string;
}

function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div
      className="bg-card border-soft fade-in flex flex-col items-center"
      style={{ gridColumn: "1 / -1", borderRadius: 22, padding: "48px 24px", textAlign: "center", gap: 10 }}
    >
      <FolderOpen size={26} strokeWidth={1.6} color="#98A2B3" />
      <p style={{ fontSize: 14, fontWeight: 600 }}>{title}</p>
      <p className="text-ink-3" style={{ fontSize: 12.5, maxWidth: 280 }}>
        {message}
      </p>
    </div>
  );
}

export default function Projects() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const navigate = useNavigate();

  const { tasks } = useTaskContext();
  const { projects, setProjects } = useProjectContext();
  const { addNotification } = useNotificationContext();
  const members = useMemo(() => loadMembers(), []);
  const { user, role: authRole } = useAuth();
  const currentActor = useMemo(() => resolveCurrentActor(members, user), [members, user]);
  const canManageProjectCard = (project: Project) => canManageProject(getProjectPermission(project, currentActor.initials));

  // Project creation is the "projects" resource in lib/permissions.ts —
  // Project Manager and above. Gates both the "New project" button below
  // and handleCreateProject itself, so a hidden button can't be bypassed.
  const canCreate = canManageProjects(resolveEffectiveRole(authRole));

  function handleCreateProject(values: CreateProjectValues) {
    if (!canCreate) return;

    const newProject = buildNewProject(values, currentActor.initials);

    setProjects((current) => [newProject, ...current]);
    setIsCreateDrawerOpen(false);

    notifyProjectCreated(addNotification, {
      projectName: newProject.name,
      actor: currentActor,
      actionHref: `/projects/${newProject.id}/overview`,
    });
  }

  function handleUpdateProject(values: CreateProjectValues) {
    if (!editingProject || !canManageProjectCard(editingProject)) return;

    setProjects((current) =>
      current.map((project) =>
        project.id === editingProject.id
          ? {
              ...project,
              name: values.name,
              tag: values.tag,
              description: values.description || undefined,
              color: values.color,
              startDate: values.startDate || undefined,
              dueDate: values.dueDate || undefined,
              due: values.dueDate ? formatProjectDue(values.dueDate) : "No due date",
              people: values.people,
            }
          : project
      )
    );
    setEditingProject(null);
  }

  function handleDuplicateProject(project: Project) {
    if (!canManageProjectCard(project)) return;
    const duplicate: Project = {
      ...project,
      id: generateProjectId(),
      name: `${project.name} (Copy)`,
      progress: 0,
      tasks: "0 / 0 tasks",
      status: undefined,
     
      
      createdAt: new Date().toISOString(),
    };

    setProjects((current) => [duplicate, ...current]);
    setOpenMenuProjectId(null);
  }

  function handleArchiveProject(project: Project) {
    if (!canManageProjectCard(project)) return;
    setProjects((current) =>
      current.map((p) => (p.id === project.id ? { ...p, status: "archived" } : p))
    );
    setOpenMenuProjectId(null);
  }

  function handleConfirmDelete() {
    if (!deletingProject || !canManageProjectCard(deletingProject)) return;
    setProjects((current) => current.filter((p) => p.id !== deletingProject.id));
    setDeletingProject(null);
  }

  const taskCountsByProject = useMemo(() => {
    const map = new Map<string, ProjectTaskCounts>();

    for (const project of projects) {
      const projectTasks = tasks.filter((task) => task.project === project.name);
      const dueSoon = projectTasks.filter((task) => {
        if (task.status === "Completed") return false;
        const group = getDueGroup(task.dueDate);
        return group === "Today" || group === "Tomorrow" || group === "This Week";
      }).length;

      map.set(project.name, {
        completed: projectTasks.filter((task) => task.status === "Completed").length,
        total: projectTasks.length,
        dueSoon,
      });
    }

    return map;
  }, [tasks, projects]);

  const counts: Record<ProjectFilter, number> = {
    all: projects.filter((p) => getProjectStatus(p) !== "archived").length,
    active: projects.filter((p) => getProjectStatus(p) === "active").length,
    completed: projects.filter((p) => getProjectStatus(p) === "completed").length,
    archived: projects.filter((p) => getProjectStatus(p) === "archived").length,
  };

  const trimmedQuery = query.trim().toLowerCase();

  const filteredProjects = projects.filter((p) => {
    const matchesQuery = p.name.toLowerCase().includes(trimmedQuery);
    const status = getProjectStatus(p);
    const matchesFilter = filter === "all" ? status !== "archived" : status === filter;
    return matchesQuery && matchesFilter;
  });

  let emptyTitle = "No projects found";
  let emptyMessage = "Try a different search term.";
  if (trimmedQuery === "" && filter === "completed" && filteredProjects.length === 0) {
    emptyTitle = "Nothing completed yet";
    emptyMessage = "Projects will land here once they hit 100% progress.";
  } else if (trimmedQuery === "" && filter === "archived" && filteredProjects.length === 0) {
    emptyTitle = "Nothing archived";
    emptyMessage = "Projects you archive will land here.";
  } else if (trimmedQuery !== "") {
    emptyMessage = `No projects match "${query}".`;
  }

  return (
    <>
      <div className="fade-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 28, fontWeight: 560, marginBottom: 6 }}>
            Projects
          </h1>
          <p className="text-ink-2" style={{ fontSize: 13.5 }}>
            Track progress across every active initiative in one place.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            className="lift"
            onClick={() => setIsCreateDrawerOpen(true)}
            style={{
              background: "#20242B",
              color: "#F7F8FA",
              border: "none",
              borderRadius: 14,
              padding: "11px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              alignSelf: "flex-start",
            }}
          >
            <Plus size={15} />
            New project
          </button>
        )}
      </div>

      <div
        className="fade-in flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ marginBottom: 22 }}
      >
        <div
          className="bg-card border-soft"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "11px 16px",
            borderRadius: 16,
            width: "100%",
            maxWidth: 360,
          }}
        >
          <Search size={16} strokeWidth={1.8} color="#98A2B3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 13.5,
              flex: 1,
              color: "#20242B",
            }}
          />
        </div>

        <div className="flex items-center" style={{ gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map((f) => {
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  border: "none",
                  borderRadius: 999,
                  padding: "8px 16px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: isActive ? "#20242B" : "#EEF2F6",
                  color: isActive ? "#F7F8FA" : "#667085",
                  transition: "background 160ms ease, color 160ms ease",
                }}
              >
                {f.label}
                <span style={{ fontSize: 11, opacity: isActive ? 0.75 : 0.7 }}>{counts[f.key]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" style={{ gap: 20 }}>
        {filteredProjects.length === 0 ? (
          <EmptyState title={emptyTitle} message={emptyMessage} />
        ) : (
          filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              taskCounts={
                taskCountsByProject.get(project.name) ?? {
                  completed: 0,
                  total: 0,
                  dueSoon: 0,
                }
              }
              canManage={canManageProjectCard(project)}
              onSelect={() => navigate(`/projects/${project.id}`)}
              isMenuOpen={openMenuProjectId === project.id}
              onToggleMenu={() => setOpenMenuProjectId((current) => (current === project.id ? null : project.id))}
              onEdit={() => {
                setEditingProject(project);
                setOpenMenuProjectId(null);
              }}
              onDuplicate={() => handleDuplicateProject(project)}
              onArchive={() => handleArchiveProject(project)}
              onDelete={() => {
                setDeletingProject(project);
                setOpenMenuProjectId(null);
              }}
            />
          ))
        )}
      </div>

      <CreateProjectDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onCreate={handleCreateProject}
      />

      <CreateProjectDrawer
        isOpen={editingProject !== null}
        project={editingProject}
        onClose={() => setEditingProject(null)}
        onUpdate={handleUpdateProject}
      />

      <ConfirmDangerModal
        isOpen={deletingProject !== null}
        title="Delete project"
        description={`This permanently deletes "${deletingProject?.name ?? ""}". This can't be undone — tasks already assigned to it will stay, but the project itself will disappear from every list.`}
        confirmWord={deletingProject?.name ?? ""}
        confirmLabel="Delete project"
        onCancel={() => setDeletingProject(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
