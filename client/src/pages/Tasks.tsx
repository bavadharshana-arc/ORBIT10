import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSearchParams } from "react-router-dom";

import {
  Plus,
  CalendarDays,
  Circle,
  X,
} from "lucide-react";

import type {
  TeamMember,
} from "../types/dashboard";

import {
  getDueGroup,
  type Priority,
  type Status,
  type Task,
} from "../data/taskData";

import { loadMembers } from "../data/teamData";
import { resolveCurrentActor } from "../data/workspaceData";
import { useAuth } from "../context/AuthContext";
import { useWorkspaceRole, isWorkspaceManager } from "../hooks/useWorkspaceRole";

import {
  notifyTaskAssigned,
  notifyTaskCompleted,
} from "../data/systemNotifications";

import { useTaskContext } from "../context/taskContextValue";
import { useProjectContext } from "../context/projectContextValue";
import { useWorkspace } from "../context/workspaceContextValue";
import { useNotificationContext } from "../context/notificationContextValue";
import { useTaskCommentHandlers } from "../hooks/useTaskCommentHandlers";
import { ApiError } from "../lib/api";
import { createTask as createTaskRequest } from "../lib/taskApi";

import {
  CreateTaskDrawer,
  type CreateTaskValues,
} from "../components/CreateTaskDrawer";

import {
  TaskDetailsDrawer,
  buildWorkspaceAssigneeOptions,
  generateId,
  getMembersForKeys,
  describeChanges,
} from "../components/TaskDetailsDrawer";

import { InProgressCard } from "../components/tasks/InProgressCard";
import { TaskSummaryCard } from "../components/tasks/TaskSummaryCard";
import { UpcomingDeadlinesCard } from "../components/tasks/UpcomingDeadlinesCard";
import { TaskGroup, getTaskAssignees } from "../components/tasks/TaskRow";
import { TaskStatusTabs, type TaskStatusTab } from "../components/tasks/TaskStatusTabs";
import { TaskFilters, type SortMode } from "../components/tasks/TaskFilters";

/* ============================================================
   TYPES
============================================================ */

type StatusFilter =
  | "All"
  | Status;

type PriorityFilter =
  | "All"
  | Priority;

type DueFilter =
  | "All"
  | "Today"
  | "Upcoming"
  | "Overdue";

/* ============================================================
   CONSTANTS
============================================================ */

const STATUS_OPTIONS: Status[] = [
  "To Do",
  "In Progress",
  "Completed",
];

// Order tabs are rendered in — "All" first so the page's existing
// default (view every status at once) stays the landing state.
const STATUS_FILTERS: StatusFilter[] = [
  "All",
  "To Do",
  "In Progress",
  "Completed",
];

const PRIORITY_FILTERS: PriorityFilter[] = [
  "All",
  "High",
  "Medium",
  "Low",
];

const DUE_FILTERS: DueFilter[] = [
  "All",
  "Today",
  "Upcoming",
  "Overdue",
];

const PRIORITY_RANK: Record<Priority, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

/* ============================================================
   HELPERS
============================================================ */

function parseDueFilter(
  value: string | null
): DueFilter | null {
  return DUE_FILTERS.find(
    (option) => option === value
  ) ?? null;
}

/*
 * Deep-links from the Dashboard/Project MiniCalendar pass an exact
 * ?date=YYYY-MM-DD (a single due date), distinct from the ?due= group
 * filter above (Today/Upcoming/Overdue). Only accept a well-formed
 * date so a malformed param can't silently filter out every task.
 */
function parseDateFilter(
  value: string | null
): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function formatDateFilterLabel(
  dateFilter: string
): string {
  const date = new Date(`${dateFilter}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateFilter;
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function matchesDueFilter(
  task: Task,
  filter: DueFilter
): boolean {
  if (filter === "All") {
    return true;
  }

  const group =
    getDueGroup(
      task.dueDate
    );

  if (
    filter === "Today"
  ) {
    return group === "Today";
  }

  if (
    filter === "Overdue"
  ) {
    return group === "Overdue";
  }

  if (
    filter === "Upcoming"
  ) {
    return (
      group === "Tomorrow" ||
      group === "This Week" ||
      group === "Later"
    );
  }

  return true;
}

/* ============================================================
   MAIN TASKS PAGE
============================================================ */

export default function Tasks() {
  const {
    tasks,
    setTasks,
    updateTask,
    deleteTask,
    workspaceMembers,
  } = useTaskContext();

  const { projects } = useProjectContext();
  const { currentWorkspaceId } = useWorkspace();

  // Stage 2 (Real Task Assignees) — real workspace roster, replacing
  // the old mock-team-based ASSIGNEE_OPTIONS module constant. `key` on
  // each option is now a real userId (see buildWorkspaceAssigneeOptions),
  // so a selection here is directly usable as Task.assigneeId.
  const ASSIGNEE_OPTIONS = useMemo(
    () => buildWorkspaceAssigneeOptions(workspaceMembers),
    [workspaceMembers]
  );

  const { addNotification } = useNotificationContext();

  // Phase 32: surfaces a failed create-task request — same convention
  // ProjectWorkspace.tsx's own create-task flow already uses, rather
  // than a silent fallback to a task that only exists locally.
  const [mutationError, setMutationError] = useState<string | null>(null);

  const members = useMemo(() => loadMembers(), []);
  const { user } = useAuth();
  const currentActor = useMemo(() => resolveCurrentActor(members, user), [members, user]);
  // Stage 6 (Permissions Alignment): real WorkspaceRole. Task
  // create/update/delete are gated on the backend by workspace role
  // alone (requireWorkspaceRole("OWNER", "ADMIN"), task.routes.ts) —
  // not by any per-project role — so editing/creating here no longer
  // also requires the mock per-project canEditProjectContent check,
  // which never reflected a real boundary for this action. Comments
  // have no role restriction at all beyond workspace membership
  // (comment.routes.ts only requires requireWorkspaceMembership),
  // which is already guaranteed by being able to see this page's data.
  const workspaceRole = useWorkspaceRole();
  const hasTasksAccess = isWorkspaceManager(workspaceRole);

  /*
    Every real project in the workspace is a valid destination for a
    new task (task creation isn't project-role-gated on the backend) —
    the picker just lists them all, same as any other project-scoped
    dropdown in this app once it's backed by real data.
  */
  const editableProjectNames = useMemo(() => projects.map((project) => project.name), [projects]);
  const canCreateTask = editableProjectNames.length > 0 && hasTasksAccess;

  function canEditTask(task: Task): boolean {
    void task;
    return hasTasksAccess;
  }

  function canCommentOnTask(task: Task): boolean {
    void task;
    return true;
  }

  const projectOptions = editableProjectNames;

  const [searchParams, setSearchParams] = useSearchParams();

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "All"
    );

  const [
    priorityFilter,
    setPriorityFilter,
  ] =
    useState<PriorityFilter>(
      "All"
    );

  const [
    dueFilter,
    setDueFilter,
  ] =
    useState<DueFilter>(
      () =>
        parseDueFilter(
          searchParams.get("due")
        ) ?? "All"
    );

  const [
    dateFilter,
    setDateFilter,
  ] = useState<string | null>(
    () =>
      parseDateFilter(
        searchParams.get("date")
      )
  );

  const [sortMode, setSortMode] = useState<SortMode>("default");

  /*
    Deep-links like the Dashboard's "View today's tasks" button pass
    ?due=Today in the URL, and the MiniCalendar's day cells pass an
    exact ?date=YYYY-MM-DD. Keep both filters in sync if those query
    params change while this page is already mounted (e.g. clicking a
    different calendar day), not just on first render.
  */
  useEffect(() => {
    const nextDueFilter =
      parseDueFilter(
        searchParams.get("due")
      );

    if (nextDueFilter) {
      setDueFilter(nextDueFilter);
    }

    setDateFilter(
      parseDateFilter(
        searchParams.get("date")
      )
    );
  }, [searchParams]);

  function clearDateFilter() {
    setDateFilter(null);

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("date");
        return next;
      },
      { replace: true }
    );
  }

  // A notification's actionHref may include `?task=<id>` (see
  // systemNotifications.ts's withTaskParam) — hydrated once as the
  // initial selection so the drawer opens on arrival. Deliberately a
  // lazy useState initializer, not an effect: `selectedTask` below is a
  // plain `.find()` re-evaluated every render, so it naturally resolves
  // to the real task (and the drawer pops open) the moment `tasks`
  // finishes loading, with no separate sync/retry logic needed.
  const [
    selectedTaskId,
    setSelectedTaskId,
  ] = useState<
    string | null
  >(() => searchParams.get("task"));

  const [
    isCreateDrawerOpen,
    setIsCreateDrawerOpen,
  ] = useState(false);

  /* ==========================================================
     SELECTED TASK
  ========================================================== */

  const selectedTask =
    tasks.find(
      (task) =>
        task.id ===
        selectedTaskId
    ) ?? null;

  const canEditSelectedTask =
    selectedTask ? canEditTask(selectedTask) : false;

  const canCommentOnSelectedTask =
    selectedTask ? canCommentOnTask(selectedTask) : false;

  const {
    handleAddComment,
    handleEditComment,
    handleDeleteComment,
    commentsLoading,
    commentsError,
  } = useTaskCommentHandlers({
    setTasks,
    selectedTask,
    currentActor,
    canComment: canCommentOnSelectedTask,
    canEdit: canEditSelectedTask,
    addNotification,
    notificationHref: "/tasks",
  });

  /* ==========================================================
     FILTER TASKS

     Two variants of the same predicate: `matchesNonStatusFilters` (used
     for the tab counts, so a tab's count reflects the current
     search/priority/date filters — e.g. searching "auth" shows how many
     matching tasks are in each status) and `filteredTasks` (that plus
     the active status tab, used for what's actually rendered). Neither
     duplicates the other's logic — filteredTasks is just
     matchesNonStatusFilters && matchesStatus.
  ========================================================== */

  const matchesNonStatusFilters = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return (task: Task) => {
      const matchesQuery =
        normalizedQuery === "" ||
        task.title.toLowerCase().includes(normalizedQuery) ||
        task.project.toLowerCase().includes(normalizedQuery);

      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;

      const matchesDue = matchesDueFilter(task, dueFilter);

      const matchesDate = !dateFilter || task.dueDate === dateFilter;

      return matchesQuery && matchesPriority && matchesDue && matchesDate;
    };
  }, [query, priorityFilter, dueFilter, dateFilter]);

  const tasksMatchingFilters = useMemo(
    () => tasks.filter(matchesNonStatusFilters),
    [tasks, matchesNonStatusFilters]
  );

  const filteredTasks =
    useMemo(() => {
      return tasksMatchingFilters.filter(
        (task) =>
          statusFilter === "All" || task.status === statusFilter
      );
    }, [
      tasksMatchingFilters,
      statusFilter,
    ]);

  /* ==========================================================
     SORT (display order only — never persisted, never re-fetched)
  ========================================================== */

  const sortedTasks = useMemo(() => {
    if (sortMode === "default") {
      return filteredTasks;
    }

    const copy = [...filteredTasks];

    if (sortMode === "dueDate") {
      copy.sort((a, b) => (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99"));
    } else if (sortMode === "priority") {
      copy.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    } else if (sortMode === "title") {
      copy.sort((a, b) => a.title.localeCompare(b.title));
    }

    return copy;
  }, [filteredTasks, sortMode]);

  /* ==========================================================
     STATUS TABS — counts respect search/priority/date filters,
     same convention GitHub-style status tabs use.
  ========================================================== */

  const statusTabs = useMemo<TaskStatusTab<StatusFilter>[]>(() => {
    return STATUS_FILTERS.map((status) => ({
      key: status,
      label: status,
      count:
        status === "All"
          ? tasksMatchingFilters.length
          : tasksMatchingFilters.filter((task) => task.status === status).length,
    }));
  }, [tasksMatchingFilters]);

  /* ==========================================================
     GROUP TASKS
  ========================================================== */

  const taskGroups =
    useMemo(() => {
      return [
        {
          title: "To Do",
          tasks:
            sortedTasks.filter(
              (task) =>
                task.status ===
                "To Do"
            ),
        },
        {
          title:
            "In Progress",
          tasks:
            sortedTasks.filter(
              (task) =>
                task.status ===
                "In Progress"
            ),
        },
        {
          title:
            "Completed",
          tasks:
            sortedTasks.filter(
              (task) =>
                task.status ===
                "Completed"
            ),
        },
      ];
    }, [
      sortedTasks,
    ]);

  /* ==========================================================
     CREATE TASK
  ========================================================== */

  async function handleCreateTask(
    values: CreateTaskValues
  ) {
    if (!editableProjectNames.includes(values.project) || !currentWorkspaceId) return;

    const project = projects.find((candidate) => candidate.name === values.project);
    if (!project) return;

    const selectedAssignees =
      getMembersForKeys(
        ASSIGNEE_OPTIONS,
        values.assigneeKeys
      );

    const due =
      values.due.trim() ||
      "No due date";

    setMutationError(null);

    try {
      // Real create (Phase 32) — same endpoint/shape ProjectWorkspace.tsx's
      // "New Task" already uses. Stage 2 (Real Task Assignees): the
      // picker's keys are now real userIds (buildWorkspaceAssigneeOptions),
      // so the first selection is sent as the real assigneeId — Task only
      // has one real assignee column, so any *additional* local selections
      // beyond the first stay a display-only echo (selectedAssignees below),
      // same as before.
      const record = await createTaskRequest(currentWorkspaceId, project.id, {
        title: values.title,
        description: values.description || undefined,
        status: values.status,
        priority: values.priority,
        dueDate: values.dueDate || null,
        assigneeId: values.assigneeKeys[0] ?? null,
      });

      const newTask: Task = {
        id: record.id,

        title:
          values.title,

        description:
          values.description,

        project:
          values.project,

        due,

        dueDate:
          values.dueDate ||
          undefined,

        dueGroup:
          getDueGroup(
            values.dueDate
          ),

        priority:
          values.priority,

        status:
          values.status,

        assignee:
          selectedAssignees[0],

        assignees:
          selectedAssignees,

        comments: [],

        activity: [
          {
            id: generateId(
              "activity"
            ),

            text:
              "Task created",

            timestamp:
              "Just now",
          },
        ],
      };

      setTasks(
        (currentTasks) => [
          newTask,
          ...currentTasks,
        ]
      );

      setIsCreateDrawerOpen(
        false
      );
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : "Couldn't create the task. Try again.");
    }
  }

  /* ==========================================================
     SAVE TASK
  ========================================================== */

  function handleSaveTask(
    values: {
      title: string;
      description: string;
      status: Status;
      priority: Priority;
      due: string;
      dueDate?: string;
      assigneeKeys: string[];
    }
  ) {
    if (!selectedTask || !canEditTask(selectedTask)) {
      return;
    }

    const before = {
      status:
        selectedTask.status,

      priority:
        selectedTask.priority,

      assigneeKeys:
        getTaskAssignees(
          selectedTask
        )
          .map(
            (member: TeamMember) =>
              ASSIGNEE_OPTIONS.find(
                (option) =>
                  option.member
                    .initials ===
                  member.initials
              )?.key
          )
          .filter(
            (
              key
            ): key is string =>
              Boolean(key)
          ),
    };

    const changes =
      describeChanges(
        before,
        {
          status:
            values.status,

          priority:
            values.priority,

          assigneeKeys:
            values.assigneeKeys,
        },
        (key) =>
          ASSIGNEE_OPTIONS.find(
            (option) =>
              option.key ===
              key
          )?.label ??
          key
      );

    const selectedAssignees =
      getMembersForKeys(
        ASSIGNEE_OPTIONS,
        values.assigneeKeys
      );

    setTasks(
      (currentTasks) =>
        currentTasks.map(
          (task) => {
            if (
              task.id !==
              selectedTask.id
            ) {
              return task;
            }

            return {
              ...task,

              title:
                values.title,

              description:
                values.description,

              status:
                values.status,

              priority:
                values.priority,

              due:
                values.due ||
                "No due date",

              dueDate:
                values.dueDate,

              dueGroup:
                getDueGroup(
                  values.dueDate
                ),

              assignee:
                selectedAssignees[0],

              assignees:
                selectedAssignees,

              activity:
                changes.messages.length >
                0
                  ? [
                      ...(task.activity ??
                        []),

                      ...changes.messages.map(
                        (
                          change
                        ) => ({
                          id:
                            generateId(
                              "activity"
                            ),

                          text:
                            change,

                          timestamp:
                            "Just now",
                        })
                      ),
                    ]
                  : task.activity,
            };
          }
        )
    );

    // Persists title/description/status/priority/dueDate/assigneeId for
    // real (Phase 32; assigneeId Stage 2) — the block above is the
    // existing instant local echo (also covering activity, which has no
    // backend column). Only the first selected assignee is real — see
    // handleCreateTask's comment above.
    void updateTask(selectedTask.id, {
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      dueDate: values.dueDate ?? null,
      assigneeId: values.assigneeKeys[0] ?? null,
    });

    notifyTaskAssigned(
      addNotification,
      {
        taskTitle: selectedTask.title,
        taskId: selectedTask.id,
        projectName: selectedTask.project,
        assigneeId: values.assigneeKeys[0],
        actorId: user?.id,
        actor: currentActor,
        actionHref: "/tasks",
      }
    );

    if (changes.justCompleted) {
      notifyTaskCompleted(
        addNotification,
        {
          taskTitle: selectedTask.title,
          taskId: selectedTask.id,
          projectName: selectedTask.project,
          assigneeId: values.assigneeKeys[0],
          actorId: user?.id,
          actor: currentActor,
          actionHref: "/tasks",
        }
      );
    }
  }

  /* ==========================================================
     DELETE TASK
  ========================================================== */

  function handleDeleteTask(
    taskId: string
  ) {
    const target = tasks.find((task) => task.id === taskId);
    if (!target || !canEditTask(target)) return;

    setSelectedTaskId(null);

    // Real delete (Phase 32) — removes the task from shared TaskContext
    // state once the DELETE actually succeeds (see TaskContext.tsx).
    void deleteTask(taskId);
  }

  /* ==========================================================
     TOGGLE STATUS
  ========================================================== */

  function handleToggleStatus(
    taskId: string
  ) {
    const target = tasks.find((task) => task.id === taskId);
    if (!target || !canEditTask(target)) return;

    const newStatus: Status =
      target.status ===
      "Completed"
        ? "To Do"
        : "Completed";

    setTasks(
      (currentTasks) =>
        currentTasks.map(
          (task) => {
            if (
              task.id !==
              taskId
            ) {
              return task;
            }

            return {
              ...task,

              status:
                newStatus,

              activity: [
                ...(task.activity ??
                  []),

                {
                  id: generateId(
                    "activity"
                  ),

                  text: `Status changed to ${newStatus}`,

                  timestamp:
                    "Just now",
                },
              ],
            };
          }
        )
    );

    void updateTask(taskId, { status: newStatus });
  }

  /* ==========================================================
     UI
  ========================================================== */

  // When a single status tab is active, filteredTasks/taskGroups already
  // only contains that one status — repeating its name as a section
  // header right under the (already-labeled) active tab is redundant, so
  // only the "All" tab renders per-group headers.
  const showGroupHeaders = statusFilter === "All";

  return (
    <div
      className="fade-in"
      style={{
        width: "100%",
      }}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">

      {/* ======================================================
          MAIN (left)
      ====================================================== */}

      <div className="min-w-0 flex-1">

      {mutationError && (
        <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#B3564B" }}>{mutationError}</p>
      )}

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        className="flex flex-wrap items-start justify-between"
        style={{
          gap: 20,
          marginBottom: 22,
        }}
      >
        <div>
          <h1
            className="font-display"
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            Tasks
          </h1>

          <p
            style={{
              margin: "6px 0 0",
              fontSize: 12.5,
              color: "var(--text-2)",
            }}
          >
            Manage and track all
            your workspace tasks.
          </p>
        </div>

        {canCreateTask && (
          <button
            type="button"
            onClick={() =>
              setIsCreateDrawerOpen(
                true
              )
            }
            className="flex items-center hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-dark)]"
            style={{
              background: "var(--text)",
              color: "var(--surface)",
              border: "none",
              borderRadius: 12,
              padding: "10px 16px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              gap: 7,
              transition: "opacity 200ms ease",
            }}
          >
            <Plus size={14} />
            New Task
          </button>
        )}
      </div>

      {/* ======================================================
          STATUS TABS
      ====================================================== */}

      <TaskStatusTabs
        tabs={statusTabs}
        active={statusFilter}
        onChange={setStatusFilter}
      />

      {/* ======================================================
          FILTERS TOOLBAR
      ====================================================== */}

      <TaskFilters
        query={query}
        onQueryChange={setQuery}
        priorityFilter={priorityFilter}
        priorityOptions={PRIORITY_FILTERS.map((option) => ({
          value: option,
          label: option === "All" ? "All priorities" : option,
        }))}
        onPriorityChange={(value) => setPriorityFilter(value as PriorityFilter)}
        dueFilter={dueFilter}
        dueOptions={DUE_FILTERS.map((option) => ({
          value: option,
          label: option === "All" ? "All dates" : option,
        }))}
        onDueChange={(value) => setDueFilter(value as DueFilter)}
        sortMode={sortMode}
        onSortChange={setSortMode}
      />

      {/* ======================================================
          ACTIVE DATE FILTER
          (deep-linked from the MiniCalendar — a specific due date
          rather than one of the Due dropdown's groups)
      ====================================================== */}

      {dateFilter && (
        <div
          className="flex items-center"
          style={{
            gap: 8,
            marginBottom: 16,
          }}
        >
          <div
            className="flex items-center"
            style={{
              gap: 6,
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              borderRadius: 999,
              padding: "6px 6px 6px 12px",
              fontSize: 11.5,
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            <CalendarDays
              size={13}
              color="var(--text-3)"
            />

            Due {formatDateFilterLabel(dateFilter)}

            <button
              type="button"
              onClick={clearDateFilter}
              aria-label="Clear date filter"
              className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--blue-dark)]"
              style={{
                border: "none",
                background: "var(--card)",
                borderRadius: "50%",
                width: 18,
                height: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <X
                size={11}
                color="var(--text-2)"
              />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================
          TASK LIST
      ====================================================== */}

      {filteredTasks.length ===
      0 ? (
        <div
          className="bg-card border-soft"
          style={{
            minHeight: 240,
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <Circle
            size={28}
            color="var(--text-3)"
          />

          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-2)",
            }}
          >
            No tasks found
          </span>

          <span
            style={{
              fontSize: 11.5,
              color: "var(--text-3)",
            }}
          >
            Try changing your
            filters or search.
          </span>
        </div>
      ) : (
        taskGroups.map(
          (group) => (
            <TaskGroup
              key={group.title}
              title={
                group.title
              }
              tasks={
                group.tasks
              }
              showHeader={showGroupHeaders}
              canEditTask={canEditTask}
              onTaskClick={(
                task
              ) =>
                setSelectedTaskId(
                  task.id
                )
              }
              onToggleStatus={(
                task
              ) =>
                handleToggleStatus(
                  task.id
                )
              }
              onDeleteTask={(task) => handleDeleteTask(task.id)}
            />
          )
        )
      )}

      </div>

      {/* ======================================================
          TASK ANALYTICS (right sidebar)
      ====================================================== */}

      <div className="w-full lg:w-70 lg:shrink-0">
        <InProgressCard />
        <TaskSummaryCard />
        {/* TaskSummaryCard/InProgressCard self-space via their own
            marginTop, not a wrapper gap — matching that convention here
            rather than introducing a second spacing mechanism. */}
        <div style={{ marginTop: 16 }}>
          <UpcomingDeadlinesCard />
        </div>
      </div>

      </div>

      {/* ======================================================
          CREATE TASK DRAWER
      ====================================================== */}

      <CreateTaskDrawer
        isOpen={
          isCreateDrawerOpen
        }
        statusOptions={
          STATUS_OPTIONS
        }
        projectOptions={
          projectOptions
        }
        assigneeOptions={
          ASSIGNEE_OPTIONS
        }
        allowMultipleAssignees
        onClose={() =>
          setIsCreateDrawerOpen(
            false
          )
        }
        onCreate={
          handleCreateTask
        }
      />

      {/* ======================================================
          TASK DETAILS DRAWER
      ====================================================== */}

      <TaskDetailsDrawer
        task={selectedTask}
        isOpen={
          selectedTask !== null
        }
        statusOptions={
          STATUS_OPTIONS
        }
        assigneeOptions={
          ASSIGNEE_OPTIONS
        }
        allowMultipleAssignees
        canEdit={canEditSelectedTask}
        canComment={canCommentOnSelectedTask}
        currentActor={currentActor}
        onClose={() =>
          setSelectedTaskId(
            null
          )
        }
        onSave={
          handleSaveTask
        }
        onAddComment={
          handleAddComment
        }
        onEditComment={
          handleEditComment
        }
        onDeleteComment={
          handleDeleteComment
        }
        commentsLoading={commentsLoading}
        commentsError={commentsError}
        onDelete={() => {
          if (selectedTask) {
            handleDeleteTask(
              selectedTask.id
            );
          }
        }}
      />
    </div>
  );
}
