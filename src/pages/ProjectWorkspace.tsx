import { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, TrendingUp, ListChecks, Users, CalendarClock, Plus } from "lucide-react";

import type { Project, TeamMember } from "../types/dashboard";
import { getDueGroup, type Status, type Task } from "../data/taskData";
import { useTaskContext } from "../context/taskContextValue";
import { useProjectContext } from "../context/projectContextValue";
import { getProjectStatus, PROJECT_STATUS_META, formatProjectDue, generateProjectId } from "../data/projectData";
import { loadMembers } from "../data/teamData";
import {
  buildProjectAssigneeOptions,
  resolveCurrentActor,
  getProjectPermission,
  canEditProjectContent,
  canManageProject,
} from "../data/workspaceData";
import type { ProjectWorkspaceContextValue } from "../context/projectWorkspaceContext";
import { useAuth } from "../context/AuthContext";

import { Pill } from "../components/ui/Pill";
import { ProgressRing } from "../components/ui/ProgressRing";
import { StatCard } from "../components/dashboard/StatCard";
import { CreateProjectDrawer, type CreateProjectValues } from "../components/CreateProjectDrawer";
import { CreateTaskDrawer, type CreateTaskValues } from "../components/CreateTaskDrawer";
import { generateId } from "../components/TaskDetailsDrawer";
import { ConfirmDangerModal } from "../components/settings/ConfirmDangerModal";
import { ProjectActionsMenu } from "../components/projects/ProjectActionsMenu";

const TASK_STATUS_OPTIONS: Status[] = ["To Do", "In Progress", "Completed"];

const TABS: { path: string; label: string }[] = [
  { path: "overview", label: "Overview" },
  { path: "board", label: "Board" },
  { path: "list", label: "List" },
  { path: "timeline", label: "Timeline" },
  { path: "calendar", label: "Calendar" },
  { path: "files", label: "Files" },
  { path: "discussions", label: "Discussions" },
  { path: "activity", label: "Activity" },
  { path: "team", label: "Team" },
  { path: "analytics", label: "Analytics" },
  { path: "settings", label: "Settings" },
];

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="bg-card border-soft fade-in flex flex-col items-center" style={{ borderRadius: 22, padding: "64px 24px", textAlign: "center", gap: 10 }}>
      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Project not found</p>
      <p className="text-ink-3" style={{ fontSize: 12.5, maxWidth: 280 }}>
        It may have been deleted, or the link is incorrect.
      </p>
      <button
        type="button"
        onClick={onBack}
        style={{
          marginTop: 6,
          background: "var(--text)",
          color: "var(--surface)",
          border: "none",
          borderRadius: 12,
          padding: "9px 16px",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Back to Projects
      </button>
    </div>
  );
}

export default function ProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { tasks, setTasks } = useTaskContext();
  const { projects, setProjects } = useProjectContext();
  const members = useMemo(() => loadMembers(), []);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  const project = projects.find((p) => p.id === projectId) ?? null;

  const projectTasks = useMemo(
    () => (project ? tasks.filter((task) => task.project === project.name) : []),
    [tasks, project]
  );

  const assigneeOptions = useMemo(() => (project ? buildProjectAssigneeOptions(project, members) : []), [project, members]);

  if (!project) {
    return <NotFound onBack={() => navigate("/projects")} />;
  }

  // Narrowed, stable binding — TS doesn't carry the `!project` guard's
  // narrowing into the function declarations below, since it can't
  // prove `project` (captured from context) stays non-null by the time
  // those closures actually run.
  const currentProject: Project = project;

  // Memoized so CreateTaskDrawer's "reset form when opened" effect
  // (keyed on this array by reference) only fires on a real open/close
  // or project-name change — a fresh array literal here would re-run
  // that reset on every unrelated re-render while the drawer is open,
  // silently wiping whatever the user had already typed.
  const createTaskProjectOptions = useMemo(() => [currentProject.name], [currentProject.name]);

  const { user } = useAuth();
  const currentActor = resolveCurrentActor(members, user);
  const permission = getProjectPermission(currentProject, currentActor.initials);
  const canEdit = canEditProjectContent(permission);
  const canManage = canManageProject(permission);

  const status = getProjectStatus(currentProject);
  const statusMeta = PROJECT_STATUS_META[status];
  const completedCount = projectTasks.filter((task) => task.status === "Completed").length;
  const dueSoonCount = projectTasks.filter((task) => {
    if (task.status === "Completed") return false;
    const group = getDueGroup(task.dueDate);
    return group === "Today" || group === "Tomorrow" || group === "This Week";
  }).length;

  function handleUpdate(values: CreateProjectValues) {
    if (!canManage) return;
    setProjects((current) =>
      current.map((p) =>
        p.id === currentProject.id
          ? {
              ...p,
              name: values.name,
              tag: values.tag,
              description: values.description || undefined,
              color: values.color,
              startDate: values.startDate || undefined,
              dueDate: values.dueDate || undefined,
              due: values.dueDate ? formatProjectDue(values.dueDate) : "No due date",
              people: values.people,
            }
          : p
      )
    );
    setIsEditOpen(false);
  }

  function handleDuplicate() {
    if (!canManage) return;
    const duplicate: Project = {
      ...currentProject,
      id: generateProjectId(),
      name: `${currentProject.name} (Copy)`,
      progress: 0,
      tasks: "0 / 0 tasks",
      status: undefined,
      createdAt: new Date().toISOString(),
    };
    setProjects((current) => [duplicate, ...current]);
    setIsMenuOpen(false);
    navigate(`/projects/${duplicate.id}`);
  }

  function handleArchive() {
    if (!canManage) return;
    setProjects((current) => current.map((p) => (p.id === currentProject.id ? { ...p, status: "archived" } : p)));
    setIsMenuOpen(false);
    navigate("/projects");
  }

  function handleDelete() {
    if (!canManage) return;
    setProjects((current) => current.filter((p) => p.id !== currentProject.id));
    navigate("/projects");
  }

  function handleCreateTask(values: CreateTaskValues) {
    if (!canEdit) return;
    const selectedAssignees = values.assigneeKeys
      .map((key) => assigneeOptions.find((option) => option.key === key)?.member)
      .filter((member): member is TeamMember => Boolean(member));

    const due = values.due.trim() || "No due date";

    const newTask: Task = {
      id: generateId("task"),
      title: values.title,
      description: values.description,
      project: currentProject.name,
      due,
      dueDate: values.dueDate || undefined,
      dueGroup: getDueGroup(values.dueDate),
      priority: values.priority,
      status: values.status,
      assignee: selectedAssignees[0],
      assignees: selectedAssignees,
      comments: [],
      activity: [{ id: generateId("activity"), text: "Task created", timestamp: "Just now" }],
    };

    setTasks((current) => [newTask, ...current]);
    setIsCreateTaskOpen(false);
  }

  const outletValue: ProjectWorkspaceContextValue = {
    project: currentProject,
    projectTasks,
    isArchived: status === "archived",
    permission,
    openNewTaskDrawer: () => setIsCreateTaskOpen(true),
    openEditDrawer: () => setIsEditOpen(true),
    openDeleteModal: () => setIsDeleteOpen(true),
    duplicateProject: handleDuplicate,
    archiveProject: handleArchive,
  };

  return (
    <>
      <button
        type="button"
        onClick={() => navigate("/projects")}
        className="nav-item flex items-center fade-in"
        style={{
          gap: 6,
          border: "none",
          background: "transparent",
          padding: "6px 4px",
          borderRadius: 8,
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--text-2)",
          cursor: "pointer",
          marginBottom: 14,
        }}
      >
        <ArrowLeft size={14} />
        Back to Projects
      </button>

      {/* HEADER */}
      <div className="bg-card border-soft shadow-float fade-in" style={{ borderRadius: 22, padding: 24, marginBottom: 18 }}>
        <div className="flex items-start justify-between" style={{ gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="flex items-center" style={{ gap: 9, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: project.color ?? "var(--blue-dark)", flexShrink: 0 }} />
              <h1 className="font-display" style={{ fontSize: 24, fontWeight: 600, color: "var(--text)", margin: 0 }}>
                {project.name}
              </h1>
              <Pill tone="surface">{project.tag}</Pill>
              <span style={{ fontSize: 11, fontWeight: 700, color: statusMeta.color }}>{statusMeta.label}</span>
            </div>
            {project.description && (
              <p className="text-ink-2" style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 560, margin: 0 }}>
                {project.description}
              </p>
            )}
          </div>

          <div className="flex items-center" style={{ gap: 10, flexShrink: 0 }}>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsCreateTaskOpen(true)}
                className="lift flex items-center"
                style={{
                  gap: 7,
                  background: "var(--text)",
                  color: "var(--surface)",
                  border: "none",
                  borderRadius: 12,
                  padding: "9px 15px",
                  fontSize: 12.5,
                  fontWeight: 650,
                  cursor: "pointer",
                }}
              >
                <Plus size={14} strokeWidth={2.2} />
                New Task
              </button>
            )}
            <ProgressRing value={project.progress} size={52} stroke={5} />
            {canManage && (
              <ProjectActionsMenu
                isOpen={isMenuOpen}
                onToggle={() => setIsMenuOpen((current) => !current)}
                onEdit={() => {
                  setIsEditOpen(true);
                  setIsMenuOpen(false);
                }}
                onDuplicate={handleDuplicate}
                onArchive={handleArchive}
                onDelete={() => {
                  setIsDeleteOpen(true);
                  setIsMenuOpen(false);
                }}
                isArchived={status === "archived"}
              />
            )}
          </div>
        </div>
      </div>

      {/* SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" style={{ gap: 14, marginBottom: 18 }}>
        <StatCard label="Progress" value={`${project.progress}%`} icon={TrendingUp} compact />
        <StatCard label="Tasks" value={`${completedCount} / ${projectTasks.length}`} icon={ListChecks} compact />
        <StatCard label="Members" value={`${project.people.length}`} icon={Users} compact />
        <StatCard label="Due soon" value={`${dueSoonCount}`} icon={CalendarClock} compact />
      </div>

      {/* TABS */}
      <div
        className="flex items-center fade-in"
        style={{ gap: 4, marginBottom: 18, background: "var(--surface-2)", borderRadius: 12, padding: 4, width: "fit-content", flexWrap: "wrap" }}
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={`/projects/${currentProject.id}/${tab.path}`}
            style={({ isActive }) => ({
              border: "none",
              borderRadius: 9,
              padding: "7px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "none",
              background: isActive ? "var(--card)" : "transparent",
              color: isActive ? "var(--text)" : "var(--text-2)",
              boxShadow: isActive ? "0 1px 2px rgba(32,36,43,0.08)" : "none",
              transition: "background 160ms ease, color 160ms ease",
            })}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      {/* TAB CONTENT — each nested route reads `project`/`projectTasks` back out via useProjectWorkspace(), so there's exactly one source of truth (TaskContext/ProjectContext) for the whole workspace. Keyed on the project id so switching projects remounts the tab tree instead of leaving stale per-project state (e.g. the Files tab's usePersistedState) mounted under the wrong id. */}
      <Outlet context={outletValue} key={currentProject.id} />

      <CreateProjectDrawer isOpen={isEditOpen} project={project} onClose={() => setIsEditOpen(false)} onUpdate={handleUpdate} />

      <CreateTaskDrawer
        isOpen={isCreateTaskOpen}
        statusOptions={TASK_STATUS_OPTIONS}
        projectOptions={createTaskProjectOptions}
        assigneeOptions={assigneeOptions}
        allowMultipleAssignees
        onClose={() => setIsCreateTaskOpen(false)}
        onCreate={handleCreateTask}
      />

      <ConfirmDangerModal
        isOpen={isDeleteOpen}
        title="Delete project"
        description={`This permanently deletes "${project.name}". This can't be undone — tasks already assigned to it will stay, but the project itself will disappear from every list.`}
        confirmWord={project.name}
        confirmLabel="Delete project"
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}
