import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, FolderOpen } from "lucide-react";

import type { Project, TeamMember } from "../types/dashboard";
import { getDueGroup, getUpcomingTasks } from "../data/taskData";
import { AvatarStack } from "../components/ui/AvatarStack";
import { useProjectContext } from "../context/projectContextValue";
import { useWorkspace } from "../context/workspaceContextValue";
import {
  formatProjectDue,
  generateProjectId,
  getProjectStatus,
  getUpcomingProjects,
  PROJECT_STATUS_META,
} from "../data/projectData";
import { useTaskContext } from "../context/taskContextValue";
import { ApiError } from "../lib/api";
import {
  createProject as createProjectRequest,
  updateProject as updateProjectRequest,
  deleteProject as deleteProjectRequest,
} from "../lib/projectApi";
import { CreateProjectDrawer, type CreateProjectValues } from "../components/CreateProjectDrawer";
import { ProjectActionsMenu } from "../components/projects/ProjectActionsMenu";
import { resolveProjectIcon, softTint } from "../components/projects/projectCardMeta";
import { ProjectOverviewCard } from "../components/projects/ProjectOverviewCard";
import { UpcomingDeadlinesCard, type DeadlineItem } from "../components/projects/UpcomingDeadlinesCard";
import { TasksByStatusCard } from "../components/projects/TasksByStatusCard";
import { ConfirmDangerModal } from "../components/settings/ConfirmDangerModal";
import { loadMembers, mapProjectMemberToTeamMember } from "../data/teamData";
import { resolveCurrentActor } from "../data/workspaceData";
import { notifyProjectCreated } from "../data/systemNotifications";
import { useNotificationContext } from "../context/notificationContextValue";
import { useAuth } from "../context/AuthContext";
import { useWorkspaceRole, isWorkspaceManager } from "../hooks/useWorkspaceRole";

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
  /** This project's real roster (ProjectContext's projectMembersByProjectId), mapped to display avatars — replaces the old local-only Project.people field. */
  people: TeamMember[];
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

function ProjectCard({ project, people, taskCounts, canManage, onSelect, isMenuOpen, onToggleMenu, onEdit, onDuplicate, onArchive, onDelete }: ProjectCardProps) {
  const status = getProjectStatus(project);
  const statusMeta = PROJECT_STATUS_META[status];
  const { icon: Icon } = resolveProjectIcon(project.tag);

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
      style={{ borderRadius: 22, padding: 24, gap: 16, cursor: "pointer" }}
    >
      <div className="flex items-start justify-between" style={{ gap: 12 }}>
        <div className="flex items-start" style={{ gap: 12, minWidth: 0 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              background: softTint(project.color),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={18} strokeWidth={2} color={project.color ?? "var(--blue-dark)"} />
          </div>

          <div style={{ minWidth: 0, paddingTop: 1 }}>
            <h3
              style={{
                fontSize: 15.5,
                fontWeight: 600,
                lineHeight: 1.3,
                color: "var(--text)",
                marginBottom: 6,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {project.name}
            </h3>
            <div className="flex items-center" style={{ gap: 6, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-2)",
                  background: "var(--surface-2)",
                  padding: "3px 10px",
                  borderRadius: 999,
                }}
              >
                {project.tag}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: statusMeta.color,
                  background: "var(--surface-2)",
                  padding: "3px 10px",
                  borderRadius: 999,
                }}
              >
                {statusMeta.label}
              </span>
            </div>
          </div>
        </div>

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

      <div style={{ height: 7, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
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
        <AvatarStack people={people} />
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
      <FolderOpen size={26} strokeWidth={1.6} color="var(--text-3)" />
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
  // Phase 25: surfaces a failed create/update/delete request — never a
  // silent fallback to mock data (see the Phase 25/26 report).
  const [mutationError, setMutationError] = useState<string | null>(null);

  const navigate = useNavigate();

  const { tasks, setTasks, workspaceMembers } = useTaskContext();
  const {
    projects,
    setProjects,
    isLoading: projectsLoading,
    error: projectsError,
    projectMembersByProjectId,
    addProjectMember,
  } = useProjectContext();
  const { currentWorkspaceId } = useWorkspace();
  const { addNotification } = useNotificationContext();
  const members = useMemo(() => loadMembers(), []);
  const { user } = useAuth();
  const currentActor = useMemo(() => resolveCurrentActor(members, user), [members, user]);

  // Stage 6 (Permissions Alignment): real WorkspaceRole — matches
  // project create/update/delete's actual gate (requireWorkspaceRole
  // ("OWNER", "ADMIN"), project.routes.ts). Project entity CRUD is
  // workspace-role-gated on the backend, not per-project-role-gated —
  // both the create button and each project's own manage controls use
  // the same single check, not a per-project mock permission lookup.
  const workspaceRole = useWorkspaceRole();
  const canCreate = isWorkspaceManager(workspaceRole);
  const canManageProjectCard = (project: Project) => {
    void project;
    return canCreate;
  };

  // Phase 25: creates the real backend Project. Phase 19 Frontend
  // Integration audit fix (Priority 8): tag/color/startDate/dueDate are
  // real, persisted columns (sent straight through). Phase 19 follow-up
  // (Persist Project people): membership is real too — the backend
  // auto-adds the creator as Owner, and each other selected workspace
  // member is added for real via the same ProjectMember API
  // ProjectTeamTab.tsx uses (default role "Viewer", same as that tab's
  // own add-member default), through ProjectContext's addProjectMember
  // so its shared projectMembersByProjectId map picks the new project up
  // immediately — no separate local `people` field to keep in sync.
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
      setIsCreateDrawerOpen(false);

      // Best-effort — the project itself already exists by this point;
      // one failed add shouldn't roll back project creation or block the
      // others. A failed add just means that person isn't on the project
      // yet, same recoverable state as if the creator forgot to select
      // them (they can still be added from the Team tab).
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
        // Broadcast to the rest of the workspace roster — the caller
        // already knows they created it, so they're excluded.
        recipientIds: workspaceMembers.map((member) => member.userId).filter((id) => id !== user?.id),
      });
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : "Couldn't create the project. Try again.");
    }
  }

  async function handleUpdateProject(values: CreateProjectValues) {
    if (!editingProject || !canManageProjectCard(editingProject) || !currentWorkspaceId) return;

    setMutationError(null);

    try {
      // Every field below is a real, persisted column (Phase 19 audit fix,
      // Priority 8). Membership isn't edited here — see
      // CreateProjectDrawer.tsx's doc comment on memberUserIds.
      const record = await updateProjectRequest(currentWorkspaceId, editingProject.id, {
        name: values.name,
        description: values.description || undefined,
        tag: values.tag,
        color: values.color,
        startDate: values.startDate || null,
        dueDate: values.dueDate || null,
      });

      const dueDate = record.dueDate?.slice(0, 10);

      setProjects((current) =>
        current.map((project) =>
          project.id === editingProject.id
            ? {
                ...project,
                name: record.name,
                tag: record.tag ?? "",
                description: record.description ?? undefined,
                color: record.color ?? undefined,
                startDate: record.startDate?.slice(0, 10),
                dueDate,
                due: dueDate ? formatProjectDue(dueDate) : "No due date",
              }
            : project
        )
      );

      // Stabilization audit fix: Task.project stores the project *name*
      // (Phase 26's join key, preserved across ~10 consumers on purpose —
      // see TaskContext.tsx). A rename here would otherwise silently
      // orphan that project's already-loaded tasks from every view that
      // joins by name (Kanban, Tasks, Timeline, this page's own task
      // counts) until a full reload. Keep them in sync locally, the same
      // way the project rename itself is applied locally above.
      if (record.name !== editingProject.name) {
        const oldName = editingProject.name;
        const newName = record.name;
        setTasks((current) => current.map((task) => (task.project === oldName ? { ...task, project: newName } : task)));
      }

      setEditingProject(null);
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : "Couldn't save the project. Try again.");
    }
  }

  // Duplicate/Archive stay local-only — neither has a backend equivalent
  // (Project has no `status` column, and there's no duplicate endpoint),
  // same as before Phase 25. A duplicated project's id is client-
  // generated and won't resolve against the real API, which is an
  // existing, unchanged limitation, not a new one.
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

  async function handleConfirmDelete() {
    if (!deletingProject || !canManageProjectCard(deletingProject) || !currentWorkspaceId) return;

    setMutationError(null);

    try {
      await deleteProjectRequest(currentWorkspaceId, deletingProject.id);
      setProjects((current) => current.filter((p) => p.id !== deletingProject.id));
      setDeletingProject(null);
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : "Couldn't delete the project. Try again.");
    }
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

  /* ==========================================================
     INFO CARDS (below the project grid) — every number below is
     derived from the same `projects`/`tasks` this page already loads
     from ProjectContext/TaskContext (unaffected by the search box or
     the Active/Completed/Archived filter above, same as Dashboard's
     own stat cards), reusing the exact status/due-date helpers the
     rest of the app already relies on. No new data source, no
     fabricated numbers.
  ========================================================== */

  const overviewCounts = {
    total: projects.length,
    active: counts.active,
    completed: counts.completed,
    archived: counts.archived,
  };

  const tasksByStatusCounts = useMemo(
    () => ({
      notStarted: tasks.filter((task) => task.status === "To Do").length,
      inProgress: tasks.filter((task) => task.status === "In Progress").length,
      completed: tasks.filter((task) => task.status === "Completed").length,
    }),
    [tasks]
  );

  // Same task/project deadline merge Dashboard.tsx's own Upcoming widget
  // uses (getUpcomingTasks + getUpcomingProjects, sorted by due date) —
  // kept page-local rather than shared, matching how Dashboard's version
  // is page-local too.
  const upcomingDeadlines = useMemo<DeadlineItem[]>(() => {
    const upcomingTasks = getUpcomingTasks(tasks, 3);
    const upcomingProjects = getUpcomingProjects(projects, 2);

    const items: { item: DeadlineItem; sortKey: string }[] = [];

    upcomingTasks.forEach((task) => {
      items.push({
        sortKey: task.dueDate ?? "",
        // Task.due (TaskContext.tsx) is the raw "YYYY-MM-DD" string, not a
        // relative label — unlike Project.due, which is already run
        // through this same formatProjectDue() at load time. Reused here
        // rather than duplicated: the function only ever looks at a plain
        // "YYYY-MM-DD" string, so it works for a task's due date too.
        item: { name: task.title, projectName: task.project, relative: task.dueDate ? formatProjectDue(task.dueDate) : "No due date" },
      });
    });

    upcomingProjects.forEach((project) => {
      items.push({
        sortKey: project.dueDate ?? "",
        item: { name: project.name, projectName: `${project.tag} project`, relative: project.due },
      });
    });

    return items
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(0, 4)
      .map((entry) => entry.item);
  }, [tasks, projects]);

  const trimmedQuery = query.trim().toLowerCase();

  const filteredProjects = projects.filter((p) => {
    const matchesQuery = p.name.toLowerCase().includes(trimmedQuery);
    const status = getProjectStatus(p);
    const matchesFilter = filter === "all" ? status !== "archived" : status === filter;
    return matchesQuery && matchesFilter;
  });

  let emptyTitle = "No projects found";
  let emptyMessage = "Try a different search term.";
  if (projectsLoading) {
    emptyTitle = "Loading projects…";
    emptyMessage = "Fetching your workspace's projects.";
  } else if (projectsError) {
    emptyTitle = "Couldn't load projects";
    emptyMessage = projectsError;
  } else if (!currentWorkspaceId) {
    emptyTitle = "No workspace found";
    emptyMessage = "This account isn't a member of any workspace yet.";
  } else if (trimmedQuery === "" && filter === "completed" && filteredProjects.length === 0) {
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
              background: "var(--text)",
              color: "var(--surface)",
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

      {mutationError && (
        <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "#B3564B" }}>{mutationError}</p>
      )}

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
          <Search size={16} strokeWidth={1.8} color="var(--text-3)" />
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
              color: "var(--text)",
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
                  background: isActive ? "var(--text)" : "var(--surface-2)",
                  color: isActive ? "var(--surface)" : "var(--text-2)",
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
              people={(projectMembersByProjectId[project.id] ?? []).map(mapProjectMemberToTeamMember)}
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

      {!projectsLoading && !projectsError && currentWorkspaceId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 fade-in" style={{ gap: 20, marginTop: 32 }}>
          <ProjectOverviewCard
            total={overviewCounts.total}
            active={overviewCounts.active}
            completed={overviewCounts.completed}
            archived={overviewCounts.archived}
          />
          <UpcomingDeadlinesCard items={upcomingDeadlines} />
          <TasksByStatusCard
            notStarted={tasksByStatusCounts.notStarted}
            inProgress={tasksByStatusCounts.inProgress}
            completed={tasksByStatusCounts.completed}
          />
        </div>
      )}

      <CreateProjectDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onCreate={handleCreateProject}
        workspaceMembers={workspaceMembers.filter((member) => member.userId !== user?.id)}
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
