import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSearchParams } from "react-router-dom";

import {
  Search,
  Plus,
  MoreHorizontal,
  CalendarDays,
  MessageSquare,
  CheckCircle2,
  Circle,
  Clock3,
  X,
} from "lucide-react";

import type {
  PillTone,
  TeamMember,
} from "../types/dashboard";

import {
  getDueGroup,
  type Priority,
  type Status,
  type Task,
} from "../data/taskData";

import { team } from "../data/dashboardData";
import { loadMembers } from "../data/teamData";
import {
  resolveCurrentActor,
  getProjectPermission,
  getPermissionForProjectName,
  canEditProjectContent,
  canCommentOnProject,
} from "../data/workspaceData";
import { useAuth } from "../context/AuthContext";
import { canManageTasks, canComment as canCommentGlobally, resolveEffectiveRole } from "../lib/permissions";

import {
  notifyTaskAssigned,
  notifyTaskCompleted,
} from "../data/systemNotifications";

import { Pill } from "../components/ui/Pill";
import { AvatarStack } from "../components/ui/AvatarStack";

import { useTaskContext } from "../context/taskContextValue";
import { useProjectContext } from "../context/projectContextValue";
import { useNotificationContext } from "../context/notificationContextValue";
import { useTaskCommentHandlers } from "../hooks/useTaskCommentHandlers";

import {
  CreateTaskDrawer,
  type CreateTaskValues,
} from "../components/CreateTaskDrawer";

import {
  TaskDetailsDrawer,
  buildAssigneeOptions,
  generateId,
  getMembersForKeys,
  describeChanges,
} from "../components/TaskDetailsDrawer";

import { InProgressCard } from "../components/tasks/InProgressCard";
import { TaskSummaryCard } from "../components/tasks/TaskSummaryCard";

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

interface TaskRowProps {
  task: Task;
  /** Editor+ on the task's project — gates the status-toggle button only; opening the row to view details stays available to everyone. */
  canEdit: boolean;
  onClick: () => void;
  onToggleStatus: () => void;
}

/* ============================================================
   CONSTANTS
============================================================ */

const STATUS_OPTIONS: Status[] = [
  "To Do",
  "In Progress",
  "Completed",
];

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

const PRIORITY_TONE: Record<
  Priority,
  PillTone
> = {
  Low: "surface",
  Medium: "blue",
  High: "dark",
};

const ASSIGNEE_OPTIONS =
  buildAssigneeOptions(team);

/* ============================================================
   HELPERS
============================================================ */

function getTaskAssignees(
  task: Task
): TeamMember[] {
  if (
    task.assignees &&
    task.assignees.length > 0
  ) {
    return task.assignees;
  }

  if (task.assignee) {
    return [task.assignee];
  }

  return [];
}

function getDueTone(
  task: Task
): PillTone {
  const group =
    getDueGroup(
      task.dueDate
    );

  if (group === "Overdue") {
    return "dark";
  }

  if (group === "Today") {
    return "blue";
  }

  return "surface";
}

function getDueLabel(
  task: Task
): string {
  if (task.dueDate) {
    const date =
      new Date(
        `${task.dueDate}T00:00:00`
      );

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      return date.toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
        }
      );
    }
  }

  return task.due || "No due date";
}

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
   TASK ROW
============================================================ */

function TaskRow({
  task,
  canEdit,
  onClick,
  onToggleStatus,
}: TaskRowProps) {
  const assignees =
    getTaskAssignees(task);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (
          event.key ===
            "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          onClick();
        }
      }}
      className="bg-card border-soft"
      style={{
        width: "100%",
        borderRadius: 14,
        border:
          "1px solid #E4E8ED",
        padding:
          "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        cursor: "pointer",
        textAlign: "left",
        transition:
          "box-shadow 160ms ease, transform 160ms ease",
      }}
    >
      {/* STATUS ICON */}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleStatus();
        }}
        disabled={!canEdit}
        aria-label={
          task.status ===
          "Completed"
            ? "Mark as not completed"
            : "Mark as completed"
        }
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          border: "none",
          padding: 0,
          background:
            task.status ===
            "Completed"
              ? "#EEF2F6"
              : "#F7F8FA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          cursor: canEdit ? "pointer" : "default",
        }}
      >
        {task.status ===
        "Completed" ? (
          <CheckCircle2
            size={16}
            color="#20242B"
          />
        ) : task.status ===
          "In Progress" ? (
          <Clock3
            size={16}
            color="#667085"
          />
        ) : (
          <Circle
            size={16}
            color="#98A2B3"
          />
        )}
      </button>

      {/* MAIN */}

      <div
        style={{
          minWidth: 0,
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 5,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 650,
              color:
                "#20242B",
              overflow:
                "hidden",
              textOverflow:
                "ellipsis",
              whiteSpace:
                "nowrap",
            }}
          >
            {task.title}
          </span>

          <Pill
            tone={
              PRIORITY_TONE[
                task.priority
              ]
            }
          >
            {task.priority}
          </Pill>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color:
                "#667085",
              fontWeight: 600,
            }}
          >
            {task.project}
          </span>

          <span
            style={{
              fontSize: 11,
              color:
                "#98A2B3",
            }}
          >
            {task.description ||
              "No description"}
          </span>
        </div>
      </div>

      {/* DUE */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          minWidth: 85,
        }}
      >
        <CalendarDays
          size={13}
          color="#98A2B3"
        />

        <Pill
          tone={getDueTone(task)}
        >
          {getDueLabel(task)}
        </Pill>
      </div>

      {/* COMMENTS */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          color: "#98A2B3",
          fontSize: 11,
          minWidth: 40,
        }}
      >
        <MessageSquare
          size={13}
        />

        {task.comments?.length ??
          0}
      </div>

      {/* ASSIGNEES */}

      <AvatarStack
        people={assignees}
      />

      <MoreHorizontal
        size={17}
        color="#98A2B3"
      />
    </div>
  );
}

/* ============================================================
   TASK GROUP
============================================================ */

interface TaskGroupProps {
  title: string;
  tasks: Task[];
  canEditTask: (task: Task) => boolean;
  onTaskClick: (
    task: Task
  ) => void;
  onToggleStatus: (
    task: Task
  ) => void;
}

function TaskGroup({
  title,
  tasks,
  canEditTask,
  onTaskClick,
  onToggleStatus,
}: TaskGroupProps) {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <section
      style={{
        marginBottom: 26,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 650,
            color:
              "#20242B",
          }}
        >
          {title}
        </h2>

        <span
          style={{
            minWidth: 22,
            height: 22,
            padding:
              "0 6px",
            borderRadius: 999,
            background:
              "#EEF2F6",
            color:
              "#667085",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            fontSize: 10.5,
            fontWeight: 650,
          }}
        >
          {tasks.length}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection:
            "column",
          gap: 8,
        }}
      >
        {tasks.map(
          (task) => (
            <TaskRow
              key={task.id}
              task={task}
              canEdit={canEditTask(task)}
              onClick={() =>
                onTaskClick(task)
              }
              onToggleStatus={() =>
                onToggleStatus(
                  task
                )
              }
            />
          )
        )}
      </div>
    </section>
  );
}

/* ============================================================
   MAIN TASKS PAGE
============================================================ */

export default function Tasks() {
  const {
    tasks,
    setTasks,
  } = useTaskContext();

  const { projects } = useProjectContext();

  const { addNotification } = useNotificationContext();

  const members = useMemo(() => loadMembers(), []);
  const { user, role: authRole } = useAuth();
  const currentActor = useMemo(() => resolveCurrentActor(members, user), [members, user]);
  const effectiveAuthRole = resolveEffectiveRole(authRole);
  const hasTasksAccess = canManageTasks(effectiveAuthRole);
  const hasCommentsAccess = canCommentGlobally(effectiveAuthRole);

  /*
    Only projects the current user has Editor+ access to are offered
    as a destination for new tasks — the same restriction the
    project-scoped "New Task" button already enforces, just resolved
    per-project here since this page isn't nested under any single
    project's context.
  */
  const editableProjectNames = useMemo(
    () =>
      projects
        .filter((project) => canEditProjectContent(getProjectPermission(project, currentActor.initials)))
        .map((project) => project.name),
    [projects, currentActor]
  );
  const canCreateTask = editableProjectNames.length > 0 && hasTasksAccess;

  function canEditTask(task: Task): boolean {
    return (
      canEditProjectContent(getPermissionForProjectName(task.project, projects, currentActor.initials)) &&
      hasTasksAccess
    );
  }

  function canCommentOnTask(task: Task): boolean {
    return (
      canCommentOnProject(getPermissionForProjectName(task.project, projects, currentActor.initials)) &&
      hasCommentsAccess
    );
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

  const [
    selectedTaskId,
    setSelectedTaskId,
  ] = useState<
    string | null
  >(null);

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
  ========================================================== */

  const filteredTasks =
    useMemo(() => {
      const normalizedQuery =
        query
          .trim()
          .toLowerCase();

      return tasks.filter(
        (task) => {
          const matchesQuery =
            normalizedQuery ===
              "" ||
            task.title
              .toLowerCase()
              .includes(
                normalizedQuery
              ) ||
            task.project
              .toLowerCase()
              .includes(
                normalizedQuery
              );

          const matchesStatus =
            statusFilter ===
              "All" ||
            task.status ===
              statusFilter;

          const matchesPriority =
            priorityFilter ===
              "All" ||
            task.priority ===
              priorityFilter;

          const matchesDue =
            matchesDueFilter(
              task,
              dueFilter
            );

          const matchesDate =
            !dateFilter ||
            task.dueDate ===
              dateFilter;

          return (
            matchesQuery &&
            matchesStatus &&
            matchesPriority &&
            matchesDue &&
            matchesDate
          );
        }
      );
    }, [
      tasks,
      query,
      statusFilter,
      priorityFilter,
      dueFilter,
      dateFilter,
    ]);

  /* ==========================================================
     GROUP TASKS
  ========================================================== */

  const taskGroups =
    useMemo(() => {
      return [
        {
          title: "To Do",
          tasks:
            filteredTasks.filter(
              (task) =>
                task.status ===
                "To Do"
            ),
        },
        {
          title:
            "In Progress",
          tasks:
            filteredTasks.filter(
              (task) =>
                task.status ===
                "In Progress"
            ),
        },
        {
          title:
            "Completed",
          tasks:
            filteredTasks.filter(
              (task) =>
                task.status ===
                "Completed"
            ),
        },
      ];
    }, [
      filteredTasks,
    ]);

  /* ==========================================================
     CREATE TASK
  ========================================================== */

  function handleCreateTask(
    values: CreateTaskValues
  ) {
    if (!editableProjectNames.includes(values.project)) return;

    const selectedAssignees =
      getMembersForKeys(
        ASSIGNEE_OPTIONS,
        values.assigneeKeys
      );

    const due =
      values.due.trim() ||
      "No due date";

    const newTask: Task = {
      id: generateId(
        "task"
      ),

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
            (member) =>
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

    notifyTaskAssigned(
      addNotification,
      {
        taskTitle: selectedTask.title,
        projectName: selectedTask.project,
        assignedNames: changes.newlyAssigned,
        actor: currentActor,
        actionHref: "/tasks",
      }
    );

    if (changes.justCompleted) {
      notifyTaskCompleted(
        addNotification,
        {
          taskTitle: selectedTask.title,
          projectName: selectedTask.project,
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

    setTasks(
      (currentTasks) =>
        currentTasks.filter(
          (task) =>
            task.id !== taskId
        )
    );

    setSelectedTaskId(null);
  }

  /* ==========================================================
     TOGGLE STATUS
  ========================================================== */

  function handleToggleStatus(
    taskId: string
  ) {
    const target = tasks.find((task) => task.id === taskId);
    if (!target || !canEditTask(target)) return;

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

            const newStatus: Status =
              task.status ===
              "Completed"
                ? "To Do"
                : "Completed";

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
  }

  /* ==========================================================
     UI
  ========================================================== */

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

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent:
            "space-between",
          gap: 20,
          marginBottom: 24,
          flexWrap:
            "wrap",
        }}
      >
        <div>
          <h1
            className="font-display"
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 600,
              color:
                "#20242B",
            }}
          >
            Tasks
          </h1>

          <p
            style={{
              margin:
                "6px 0 0",
              fontSize: 12.5,
              color:
                "#667085",
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
            style={{
              background:
                "#20242B",
              color:
                "#F7F8FA",
              border: "none",
              borderRadius: 12,
              padding:
                "10px 15px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor:
                "pointer",
              display: "flex",
              alignItems:
                "center",
              gap: 7,
            }}
          >
            <Plus size={14} />
            New Task
          </button>
        )}
      </div>

      {/* ======================================================
          TOOLBAR
      ====================================================== */}

      <div
        className="bg-card border-soft"
        style={{
          display: "flex",
          alignItems:
            "center",
          gap: 10,
          padding: 10,
          borderRadius: 14,
          marginBottom: 22,
          flexWrap:
            "wrap",
        }}
      >
        {/* SEARCH */}

        <div
          style={{
            display: "flex",
            alignItems:
              "center",
            gap: 8,
            flex: 1,
            minWidth: 180,
            padding:
              "8px 10px",
          }}
        >
          <Search
            size={15}
            color="#98A2B3"
          />

          <input
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value
              )
            }
            placeholder="Search tasks..."
            style={{
              border: "none",
              outline: "none",
              background:
                "transparent",
              fontSize: 12.5,
              color:
                "#20242B",
              width: "100%",
            }}
          />
        </div>

        {/* STATUS */}

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target
                .value as StatusFilter
            )
          }
          style={filterStyle}
        >
          {STATUS_FILTERS.map(
            (option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            )
          )}
        </select>

        {/* PRIORITY */}

        <select
          value={priorityFilter}
          onChange={(event) =>
            setPriorityFilter(
              event.target
                .value as PriorityFilter
            )
          }
          style={filterStyle}
        >
          {PRIORITY_FILTERS.map(
            (option) => (
              <option
                key={option}
                value={option}
              >
                {option ===
                "All"
                  ? "All priorities"
                  : option}
              </option>
            )
          )}
        </select>

        {/* DUE */}

        <select
          value={dueFilter}
          onChange={(event) =>
            setDueFilter(
              event.target
                .value as DueFilter
            )
          }
          style={filterStyle}
        >
          {DUE_FILTERS.map(
            (option) => (
              <option
                key={option}
                value={option}
              >
                {option ===
                "All"
                  ? "All dates"
                  : option}
              </option>
            )
          )}
        </select>
      </div>

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
              border: "1px solid #E4E8ED",
              background: "#F7F8FA",
              borderRadius: 999,
              padding: "6px 6px 6px 12px",
              fontSize: 11.5,
              fontWeight: 600,
              color: "#20242B",
            }}
          >
            <CalendarDays
              size={13}
              color="#98A2B3"
            />

            Due {formatDateFilterLabel(dateFilter)}

            <button
              type="button"
              onClick={clearDateFilter}
              aria-label="Clear date filter"
              style={{
                border: "none",
                background: "#EEF2F6",
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
                color="#667085"
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
            flexDirection:
              "column",
            alignItems:
              "center",
            justifyContent:
              "center",
            gap: 10,
          }}
        >
          <Circle
            size={28}
            color="#98A2B3"
          />

          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color:
                "#667085",
            }}
          >
            No tasks found
          </span>

          <span
            style={{
              fontSize: 11.5,
              color:
                "#98A2B3",
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
            />
          )
        )
      )}

      </div>

      {/* ======================================================
          PRODUCTIVITY WIDGETS (right sidebar)
      ====================================================== */}

      <div className="w-full lg:w-70 lg:shrink-0">
        <InProgressCard />
        <TaskSummaryCard />
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

/* ============================================================
   STYLES
============================================================ */

const filterStyle = {
  appearance:
    "none" as const,
  border:
    "1px solid #E4E8ED",
  borderRadius: 10,
  background:
    "#F7F8FA",
  padding:
    "8px 12px",
  fontSize: 11.5,
  fontWeight: 600,
  color:
    "#20242B",
  outline: "none",
  cursor:
    "pointer",
};
