import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, TrendingUp, ListChecks, Users, CalendarClock, Plus } from "lucide-react";

import type { Project, ProjectMilestone, ProjectObjective, TeamMember } from "../types/dashboard";
import { getDueGroup, type Status, type Task } from "../data/taskData";
import { useTaskContext } from "../context/taskContextValue";
import { useProjectContext } from "../context/projectContextValue";
import { useWorkspace } from "../context/workspaceContextValue";
import { getProjectStatus, PROJECT_STATUS_META, formatProjectDue, generateProjectId } from "../data/projectData";
import { canEditProjectContent } from "../data/workspaceData";
import type { ProjectWorkspaceContextValue } from "../context/projectWorkspaceContext";
import { useAuth } from "../context/AuthContext";
import { useWorkspaceRole, isWorkspaceManager } from "../hooks/useWorkspaceRole";
import { ApiError } from "../lib/api";
import type { ProjectPermission } from "../types/dashboard";
import { updateProject as updateProjectRequest, deleteProject as deleteProjectRequest } from "../lib/projectApi";
import { createTask as createTaskRequest } from "../lib/taskApi";
import {
  listObjectives as listObjectivesRequest,
  createObjective as createObjectiveRequest,
  updateObjective as updateObjectiveRequest,
  deleteObjective as deleteObjectiveRequest,
  type ObjectiveRecord,
} from "../lib/objectiveApi";
import {
  listMilestones as listMilestonesRequest,
  createMilestone as createMilestoneRequest,
  updateMilestone as updateMilestoneRequest,
  deleteMilestone as deleteMilestoneRequest,
  type MilestoneRecord,
} from "../lib/milestoneApi";

import { Pill } from "../components/ui/Pill";
import { ProgressRing } from "../components/ui/ProgressRing";
import { StatCard } from "../components/dashboard/StatCard";
import { CreateProjectDrawer, type CreateProjectValues } from "../components/CreateProjectDrawer";
import { CreateTaskDrawer, type CreateTaskValues } from "../components/CreateTaskDrawer";
import { generateId, buildWorkspaceAssigneeOptions } from "../components/TaskDetailsDrawer";
import { ConfirmDangerModal } from "../components/settings/ConfirmDangerModal";
import { ProjectActionsMenu } from "../components/projects/ProjectActionsMenu";

const TASK_STATUS_OPTIONS: Status[] = ["To Do", "In Progress", "Completed"];

/**
 * Phase 36 — real Objective/Milestone records map 1:1 onto the frontend's
 * existing ProjectObjective/ProjectMilestone shapes (types/dashboard.ts),
 * unlike Task's status/priority vocabulary mismatch — no clamping needed.
 * Milestone.dueDate mirrors task.controller.ts's convention: a full ISO
 * timestamp (UTC midnight) on the wire, a plain "YYYY-MM-DD" here.
 */
function mapObjectiveRecord(record: ObjectiveRecord): ProjectObjective {
  return { id: record.id, text: record.text, done: record.done };
}

function mapMilestoneRecord(record: MilestoneRecord): ProjectMilestone {
  return {
    id: record.id,
    title: record.title,
    done: record.done,
    dueDate: record.dueDate ? record.dueDate.slice(0, 10) : undefined,
  };
}

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

  const { tasks, setTasks, workspaceMembers } = useTaskContext();
  const {
    projects,
    setProjects,
    isLoading: projectsLoading,
    projectMembersByProjectId,
    projectMembersLoading,
    projectMembersError,
    addProjectMember: addProjectMemberToContext,
    removeProjectMember: removeProjectMemberFromContext,
    updateProjectMemberRole: updateProjectMemberRoleInContext,
  } = useProjectContext();
  const { currentWorkspaceId } = useWorkspace();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  // Phase 25/26: surfaces a failed update/delete/create-task request —
  // never a silent fallback to mock data (see the Phase 25/26 report).
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Every hook below must run unconditionally on every render — Phase
  // 25 made the `!project` case (below) a routine, frequent state
  // (async loading, not just an invalid id), so a hook declared after
  // that early return would now violate Rules of Hooks on essentially
  // every visit to this page instead of only in a rare edge case. All
  // hooks this component needs are therefore declared before it.
  const { user } = useAuth();

  const project = projects.find((p) => p.id === projectId) ?? null;

  // Phase 19 Frontend Integration follow-up (Persist Project people):
  // this project's real roster, straight from ProjectContext's single
  // shared fetch — no separate fetch of its own (see ProjectContext.tsx's
  // doc comment).
  const projectMembers = useMemo(
    () => (projectId ? (projectMembersByProjectId[projectId] ?? []) : []),
    [projectMembersByProjectId, projectId],
  );

  const projectTasks = useMemo(
    () => (project ? tasks.filter((task) => task.project === project.name) : []),
    [tasks, project]
  );

  // Stage 2 (Real Task Assignees) — real workspace roster, replacing
  // the old project.people ∩ mock-roster scoping; the backend's own
  // assigneeId validation only ever checks workspace membership
  // (task.controller.ts), so this matches exactly what the API accepts.
  const assigneeOptions = useMemo(() => buildWorkspaceAssigneeOptions(workspaceMembers), [workspaceMembers]);

  // Memoized so CreateTaskDrawer's "reset form when opened" effect
  // (keyed on this array by reference) only fires on a real open/close
  // or project-name change — a fresh array literal here would re-run
  // that reset on every unrelated re-render while the drawer is open,
  // silently wiping whatever the user had already typed.
  const createTaskProjectOptions = useMemo(() => (project ? [project.name] : []), [project]);

  // Phase 36: real objectives/milestones, fetched once per opened project
  // — the single source of truth ProjectOverviewTab's cards render, and
  // (merged onto `outletProject` below) what ProjectActivityTab/
  // ProjectAnalyticsTab/ProjectTimelineTab already read via
  // `project.objectives`/`.milestones`.
  const [objectives, setObjectives] = useState<ProjectObjective[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [objectivesLoading, setObjectivesLoading] = useState(false);
  const [objectivesError, setObjectivesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Every setState below runs inside this chain, not synchronously in
    // the effect body — same reasoning as every other Phase 24–29 fetch
    // effect in this codebase.
    Promise.resolve()
      .then(() => {
        if (cancelled || !currentWorkspaceId || !projectId) {
          return null;
        }
        setObjectivesLoading(true);
        setObjectivesError(null);
        return Promise.all([
          listObjectivesRequest(currentWorkspaceId, projectId),
          listMilestonesRequest(currentWorkspaceId, projectId),
        ]);
      })
      .then((result) => {
        if (cancelled) return;

        if (!currentWorkspaceId || !projectId || !result) {
          // No current workspace, or no project id yet — reset so a
          // previous project's objectives/milestones never linger.
          setObjectives([]);
          setMilestones([]);
          return;
        }

        const [objectiveRecords, milestoneRecords] = result;
        setObjectives(objectiveRecords.map(mapObjectiveRecord));
        setMilestones(milestoneRecords.map(mapMilestoneRecord));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setObjectives([]);
        setMilestones([]);
        setObjectivesError(
          error instanceof ApiError ? error.message : "Couldn't load objectives and milestones. Try again in a moment.",
        );
      })
      .finally(() => {
        if (!cancelled) setObjectivesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentWorkspaceId, projectId]);

  // Stage 6 (Permissions Alignment): the signed-in user's real
  // ProjectRole for this project — derived from the shared projectMembers
  // above (Phase 19 follow-up) rather than this component's own separate
  // fetch, since ProjectContext already loads every project's roster once.
  const myProjectRoleRecord = projectMembers.find((record) => record.userId === user?.id)?.role ?? null;

  // Real WorkspaceRole — governs the project *entity* itself
  // (edit/duplicate/archive/delete) and task creation, both gated on
  // the backend by requireWorkspaceRole("OWNER", "ADMIN")
  // (project.routes.ts, task.routes.ts), not by any per-project role.
  const workspaceRole = useWorkspaceRole();
  const canManageProjectEntity = isWorkspaceManager(workspaceRole);

  if (!project) {
    // Real projects load asynchronously now — on first render (or right
    // after a workspace switch) `projects` may just not have arrived yet,
    // which isn't the same as this id genuinely not existing. Only show
    // "Project not found" once the fetch has actually finished.
    if (projectsLoading) {
      return (
        <p style={{ fontSize: 13, color: "var(--text-2)", padding: "24px 0" }}>Loading project…</p>
      );
    }
    return <NotFound onBack={() => navigate("/projects")} />;
  }

  // Narrowed, stable binding — TS doesn't carry the `!project` guard's
  // narrowing into the function declarations below, since it can't
  // prove `project` (captured from context) stays non-null by the time
  // those closures actually run.
  const currentProject: Project = project;

  // Real ProjectRole when the user has an explicit ProjectMember row;
  // otherwise a workspace OWNER/ADMIN is treated as an Owner of every
  // project in their workspace (matches how those roles already manage
  // everything else workspace-wide), and a plain Member with no row
  // falls back to Viewer — matching the real backend's own hard 403 for
  // a project-membership-gated action with no ProjectMember row
  // (requireProjectMembership, project.middleware.ts), not an invented
  // default.
  const permission: ProjectPermission =
    (myProjectRoleRecord as ProjectPermission | null) ?? (canManageProjectEntity ? "Owner" : "Viewer");
  const canEdit = canEditProjectContent(permission);

  const status = getProjectStatus(currentProject);
  const statusMeta = PROJECT_STATUS_META[status];
  const completedCount = projectTasks.filter((task) => task.status === "Completed").length;
  const dueSoonCount = projectTasks.filter((task) => {
    if (task.status === "Completed") return false;
    const group = getDueGroup(task.dueDate);
    return group === "Today" || group === "Tomorrow" || group === "This Week";
  }).length;

  async function handleUpdate(values: CreateProjectValues) {
    if (!canManageProjectEntity || !currentWorkspaceId) return;

    setMutationError(null);

    try {
      // Every field below is a real, persisted column (Phase 19 audit fix,
      // Priority 8; see Projects.tsx's handleUpdateProject, same pattern).
      // Membership isn't edited here — an existing project's roster is
      // managed for real on its Team tab (see CreateProjectDrawer.tsx's
      // doc comment on memberUserIds).
      const record = await updateProjectRequest(currentWorkspaceId, currentProject.id, {
        name: values.name,
        description: values.description || undefined,
        tag: values.tag,
        color: values.color,
        startDate: values.startDate || null,
        dueDate: values.dueDate || null,
      });

      const dueDate = record.dueDate?.slice(0, 10);

      setProjects((current) =>
        current.map((p) =>
          p.id === currentProject.id
            ? {
                ...p,
                name: record.name,
                tag: record.tag ?? "",
                description: record.description ?? undefined,
                color: record.color ?? undefined,
                startDate: record.startDate?.slice(0, 10),
                dueDate,
                due: dueDate ? formatProjectDue(dueDate) : "No due date",
              }
            : p
        )
      );

      // Stabilization audit fix: same reasoning as Projects.tsx's
      // handleUpdateProject — keep already-loaded tasks' name-based
      // project join in sync with a rename, so they don't silently
      // disappear from this project's own tabs.
      if (record.name !== currentProject.name) {
        const oldName = currentProject.name;
        const newName = record.name;
        setTasks((current) => current.map((task) => (task.project === oldName ? { ...task, project: newName } : task)));
      }

      setIsEditOpen(false);
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : "Couldn't save the project. Try again.");
    }
  }

  // Duplicate/Archive stay local-only — same reasoning as Projects.tsx's
  // handleDuplicateProject/handleArchiveProject (no backend equivalent).
  function handleDuplicate() {
    if (!canManageProjectEntity) return;
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
    if (!canManageProjectEntity) return;
    setProjects((current) => current.map((p) => (p.id === currentProject.id ? { ...p, status: "archived" } : p)));
    setIsMenuOpen(false);
    navigate("/projects");
  }

  async function handleDelete() {
    if (!canManageProjectEntity || !currentWorkspaceId) return;

    setMutationError(null);

    try {
      await deleteProjectRequest(currentWorkspaceId, currentProject.id);
      setProjects((current) => current.filter((p) => p.id !== currentProject.id));
      navigate("/projects");
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : "Couldn't delete the project. Try again.");
    }
  }

  async function handleCreateTask(values: CreateTaskValues) {
    // Task creation is workspace-role-gated (requireWorkspaceRole
    // ("OWNER", "ADMIN"), task.routes.ts), not project-role-gated.
    if (!canManageProjectEntity || !currentWorkspaceId) return;

    const selectedAssignees = values.assigneeKeys
      .map((key) => assigneeOptions.find((option) => option.key === key)?.member)
      .filter((member): member is TeamMember => Boolean(member));

    const due = values.due.trim() || "No due date";

    setMutationError(null);

    try {
      // Stage 2 (Real Task Assignees): the picker now resolves against
      // the real workspace roster, so the first selection is a real
      // userId, sent as the real assigneeId. Task only has one real
      // assignee column, so any additional local selections beyond the
      // first stay a display-only echo (selectedAssignees below).
      const record = await createTaskRequest(currentWorkspaceId, currentProject.id, {
        title: values.title,
        description: values.description || undefined,
        status: values.status,
        priority: values.priority,
        dueDate: values.dueDate || null,
        assigneeId: values.assigneeKeys[0] ?? null,
      });

      const newTask: Task = {
        id: record.id,
        title: record.title,
        description: record.description ?? "",
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
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : "Couldn't create the task. Try again.");
    }
  }

  /* ==========================================================
     OBJECTIVES / MILESTONES (Phase 36)
     Real create/toggle/delete, each updating local state from the
     successful response rather than optimistically — ObjectivesCard/
     MilestonesCard (ProjectOverviewTab.tsx) are unchanged; they just
     receive real data and real mutators through context now instead
     of a local-only project.objectives/.milestones splice.
  ========================================================== */

  async function addObjective(text: string) {
    if (!canEdit || !currentWorkspaceId) return;

    setObjectivesError(null);

    try {
      const record = await createObjectiveRequest(currentWorkspaceId, currentProject.id, text);
      setObjectives((current) => [...current, mapObjectiveRecord(record)]);
    } catch (error) {
      setObjectivesError(error instanceof ApiError ? error.message : "Couldn't add the objective. Try again.");
    }
  }

  async function toggleObjective(id: string) {
    if (!canEdit || !currentWorkspaceId) return;

    const target = objectives.find((objective) => objective.id === id);
    if (!target) return;

    setObjectivesError(null);

    try {
      const record = await updateObjectiveRequest(currentWorkspaceId, currentProject.id, id, { done: !target.done });
      setObjectives((current) => current.map((objective) => (objective.id === id ? mapObjectiveRecord(record) : objective)));
    } catch (error) {
      setObjectivesError(error instanceof ApiError ? error.message : "Couldn't update the objective. Try again.");
    }
  }

  async function removeObjective(id: string) {
    if (!canEdit || !currentWorkspaceId) return;

    setObjectivesError(null);

    try {
      await deleteObjectiveRequest(currentWorkspaceId, currentProject.id, id);
      setObjectives((current) => current.filter((objective) => objective.id !== id));
    } catch (error) {
      setObjectivesError(error instanceof ApiError ? error.message : "Couldn't remove the objective. Try again.");
    }
  }

  async function addMilestone(title: string) {
    if (!canEdit || !currentWorkspaceId) return;

    setObjectivesError(null);

    try {
      const record = await createMilestoneRequest(currentWorkspaceId, currentProject.id, title);
      setMilestones((current) => [...current, mapMilestoneRecord(record)]);
    } catch (error) {
      setObjectivesError(error instanceof ApiError ? error.message : "Couldn't add the milestone. Try again.");
    }
  }

  async function toggleMilestone(id: string) {
    if (!canEdit || !currentWorkspaceId) return;

    const target = milestones.find((milestone) => milestone.id === id);
    if (!target) return;

    setObjectivesError(null);

    try {
      const record = await updateMilestoneRequest(currentWorkspaceId, currentProject.id, id, { done: !target.done });
      setMilestones((current) => current.map((milestone) => (milestone.id === id ? mapMilestoneRecord(record) : milestone)));
    } catch (error) {
      setObjectivesError(error instanceof ApiError ? error.message : "Couldn't update the milestone. Try again.");
    }
  }

  async function removeMilestone(id: string) {
    if (!canEdit || !currentWorkspaceId) return;

    setObjectivesError(null);

    try {
      await deleteMilestoneRequest(currentWorkspaceId, currentProject.id, id);
      setMilestones((current) => current.filter((milestone) => milestone.id !== id));
    } catch (error) {
      setObjectivesError(error instanceof ApiError ? error.message : "Couldn't remove the milestone. Try again.");
    }
  }

  // Merged onto the project object handed to every tab via Outlet
  // context — ProjectActivityTab/ProjectAnalyticsTab/ProjectTimelineTab
  // already read `project.objectives`/`.milestones` and need no changes
  // of their own to start showing this real data.
  const outletProject: Project = { ...currentProject, objectives, milestones };

  const outletValue: ProjectWorkspaceContextValue = {
    project: outletProject,
    projectTasks,
    isArchived: status === "archived",
    permission,
    canManageProjectEntity,
    openNewTaskDrawer: () => setIsCreateTaskOpen(true),
    openEditDrawer: () => setIsEditOpen(true),
    openDeleteModal: () => setIsDeleteOpen(true),
    duplicateProject: handleDuplicate,
    archiveProject: handleArchive,
    objectives,
    milestones,
    objectivesLoading,
    objectivesError,
    addObjective,
    toggleObjective,
    removeObjective,
    addMilestone,
    toggleMilestone,
    removeMilestone,
    projectMembers,
    projectMembersLoading,
    projectMembersError,
    addProjectMember: (userId, role) => addProjectMemberToContext(currentProject.id, userId, role),
    removeProjectMember: (memberId) => removeProjectMemberFromContext(currentProject.id, memberId),
    updateProjectMemberRole: (memberId, role) => updateProjectMemberRoleInContext(currentProject.id, memberId, role),
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

      {mutationError && (
        <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#B3564B" }}>{mutationError}</p>
      )}

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
            {canManageProjectEntity && (
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
            {canManageProjectEntity && (
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
        <StatCard label="Members" value={`${projectMembers.length}`} icon={Users} compact />
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
