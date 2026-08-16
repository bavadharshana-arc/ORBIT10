import {
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { createPortal } from "react-dom";

import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";

import {
  Search,
  Plus,
  MoreHorizontal,
  ChevronDown,
  Clock,
  MessageSquare,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";

import type {
  PillTone,
  TeamMember,
} from "../types/dashboard";

import { Pill } from "../components/ui/Pill";
import { AvatarStack } from "../components/ui/AvatarStack";

import { team } from "../data/dashboardData";
import { loadMembers } from "../data/teamData";
import {
  resolveCurrentActor,
  getProjectPermission,
  getPermissionForProjectName,
  canEditProjectContent,
} from "../data/workspaceData";
import { useProjectContext } from "../context/projectContextValue";
import { useAuth } from "../context/AuthContext";
import { useWorkspaceRole, isWorkspaceManager } from "../hooks/useWorkspaceRole";

import {
  getDueGroup,
  type Priority,
  type Status,
  type Task,
} from "../data/taskData";

import { useTaskContext } from "../context/taskContextValue";
import { useWorkspace } from "../context/workspaceContextValue";
import { ApiError } from "../lib/api";
import { createTask as createTaskRequest } from "../lib/taskApi";

import {
  CreateTaskDrawer,
  type CreateTaskValues,
} from "../components/CreateTaskDrawer";

import {
  buildWorkspaceAssigneeOptions,
  generateId,
  getMembersForKeys,
} from "../components/TaskDetailsDrawer";

/* ============================================================
   TYPES
============================================================ */

type ColumnStatus =
  | "To Do"
  | "In Progress"
  | "Done";

type PriorityFilter =
  | "All"
  | Priority;

type SortMode =
  | "default"
  | "priority";

type TeamFilter =
  | "Product Team"
  | "Engineering Team"
  | "Design Team"
  | "Marketing Team";

interface KanbanTask {
  id: string;
  title: string;
  description: string;
  project: string;
  priority: Priority;
  status: ColumnStatus;
  due: string;
  comments: number;
  assignees: TeamMember[];
  /** Editor+ on the task's project — resolved once when the column task list is built. */
  canEdit: boolean;
}

/* ============================================================
   CONSTANTS
============================================================ */

const COLUMNS: {
  key: ColumnStatus;
  label: string;
}[] = [
  {
    key: "To Do",
    label: "To Do",
  },
  {
    key: "In Progress",
    label: "In Progress",
  },
  {
    key: "Done",
    label: "Done",
  },
];

const PRIORITY_TONE: Record<
  Priority,
  PillTone
> = {
  Low: "surface",
  Medium: "blue",
  High: "dark",
};

const PRIORITY_RANK: Record<
  Priority,
  number
> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

const PRIORITY_FILTERS: PriorityFilter[] = [
  "All",
  "High",
  "Medium",
  "Low",
];

const STATUS_OPTIONS: Status[] = [
  "To Do",
  "In Progress",
  "Completed",
];

/*
  IMPORTANT:
  This uses the AssigneeOption type from
  TaskDetailsDrawer.

  AssigneeOption structure:

  {
    key: string;
    label: string;
    member: TeamMember;
  }
*/

/* ============================================================
   TEAM MEMBERS
============================================================ */

const TEAM_MEMBERS: Record<
  TeamFilter,
  TeamMember[]
> = {
  "Product Team": [
    team.maya,
    team.jonah,
    team.rhea,
    team.aidan,
    team.talia,
  ],

  "Engineering Team": [
    team.jonah,
    team.rhea,
  ],

  "Design Team": [
    team.maya,
    team.aidan,
  ],

  "Marketing Team": [
    team.talia,
    team.maya,
  ],
};

/* ============================================================
   STATUS HELPERS
============================================================ */

const getTaskAssignees = (
  task: Task
): TeamMember[] => {
  return task.assignees ?? [];
};

const getKanbanStatus = (
  status: Status
): ColumnStatus => {
  if (status === "Completed") {
    return "Done";
  }

  return status;
};

const getTaskStatus = (
  status: ColumnStatus
): Status => {
  if (status === "Done") {
    return "Completed";
  }

  return status;
};

/* ============================================================
   PILL SELECT
============================================================ */

interface PillSelectProps {
  value: string;
  options: string[];
  onChange: (
    value: string
  ) => void;
  icon?: ReactNode;
}

function PillSelect({
  value,
  options,
  onChange,
  icon,
}: PillSelectProps) {
  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {icon && (
        <span
          style={{
            position: "absolute",
            left: 11,
            display: "flex",
            pointerEvents: "none",
          }}
        >
          {icon}
        </span>
      )}

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          background: "#EEF2F6",
          border: "1px solid #E4E8ED",
          borderRadius: 12,
          padding: icon
            ? "9px 32px 9px 32px"
            : "9px 32px 9px 14px",
          fontSize: 12.5,
          fontWeight: 600,
          color: "#20242B",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {options.map(
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

      <ChevronDown
        size={13}
        color="#667085"
        style={{
          position: "absolute",
          right: 10,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

/* ============================================================
   ICON BUTTON
============================================================ */

const iconButtonStyle: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "none",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#98A2B3",
  flexShrink: 0,
};

/* ============================================================
   KANBAN CARD
============================================================ */

interface KanbanCardProps {
  task: KanbanTask;
  index: number;
}

function KanbanCard({
  task,
  index,
}: KanbanCardProps) {
  return (
    <Draggable
      draggableId={task.id}
      index={index}
      isDragDisabled={!task.canEdit}
    >
      {(
        provided,
        snapshot
      ) => {
        const card = (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className="bg-card flex flex-col"
            style={{
              borderRadius: 16,
              padding: 15,
              gap: 11,

              cursor: !task.canEdit
                ? "default"
                : snapshot.isDragging
                  ? "grabbing"
                  : "grab",

              background: "#FFFFFF",

              border:
                snapshot.isDragging
                  ? "1px solid #8EA7BF"
                  : "1px solid #E4E8ED",

              boxShadow:
                snapshot.isDragging
                  ? "0 18px 40px rgba(32,36,43,0.20)"
                  : "0 4px 18px rgba(32,36,43,0.07)",

              transform:
                snapshot.isDragging
                  ? "scale(1.02)"
                  : "scale(1)",

              transition:
                "box-shadow 160ms ease, transform 160ms ease",

              ...provided.draggableProps.style,

              /*
               * @hello-pangea/dnd already puts the dragging clone at
               * position: fixed with zIndex: 5000 (see getDraggingStyle
               * in the library) so it can float freely above the page.
               * That z-index is only ever compared against elements that
               * share its stacking context, though — and every
               * KanbanColumn below is `.fade-in-static`, whose opacity
               * animation makes each column its own stacking context
               * (animating opacity/transform/filter creates one even
               * once the animation has finished, see globals.css).
               * Nested inside its origin column's context, the card's
               * z-index can never outrank a column that comes later in
               * the DOM, no matter how high we set it right here — so it
               * renders under whichever column it's dragged over.
               *
               * Rendering the dragging clone through a portal straight
               * onto <body> (below) sidesteps every ancestor stacking
               * context and overflow container in one move. These two
               * properties are just a defensive floor for that portaled
               * clone, restated explicitly rather than trusting they
               * survived the style spread above.
               */
              position: snapshot.isDragging
                ? "fixed"
                : "static",

              zIndex: snapshot.isDragging
                ? 9999
                : "auto",
            }}
          >
            {/* PRIORITY */}

            <Pill
              tone={
                PRIORITY_TONE[
                  task.priority
                ]
              }
            >
              {task.priority}
            </Pill>

            {/* TITLE + DESCRIPTION */}

            <div>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 650,
                  color: "#20242B",
                  marginBottom: 5,
                  lineHeight: 1.4,
                }}
              >
                {task.title}
              </div>

              <div
                className="text-ink-3"
                style={{
                  fontSize: 11.5,
                  lineHeight: 1.5,
                }}
              >
                {task.description}
              </div>
            </div>

            {/* PROJECT */}

            <div
              style={{
                fontSize: 11,
                color: "#667085",
                fontWeight: 600,
                paddingTop: 2,
              }}
            >
              {task.project}
            </div>

            {/* FOOTER */}

            <div
              className="flex items-center justify-between"
              style={{
                paddingTop: 5,
                borderTop:
                  "1px solid #F0F2F5",
              }}
            >
              <div
                className="flex items-center text-ink-3"
                style={{
                  gap: 10,
                  fontSize: 11,
                }}
              >
                <span
                  className="flex items-center"
                  style={{
                    gap: 4,
                  }}
                >
                  <Clock size={11} />
                  {task.due}
                </span>

                <span
                  className="flex items-center"
                  style={{
                    gap: 4,
                  }}
                >
                  <MessageSquare
                    size={11}
                  />

                  {task.comments}
                </span>
              </div>

              <AvatarStack
                people={
                  task.assignees
                }
              />
            </div>
          </div>
        );

        /*
         * Portal the dragging clone directly onto <body> — this is what
         * actually escapes the .fade-in-static stacking context trap
         * described above. The library's fixed positioning is already
         * computed relative to the viewport, so it lands in exactly the
         * right spot with no extra offset math required.
         */
        if (snapshot.isDragging) {
          return createPortal(
            card,
            document.body
          );
        }

        return card;
      }}
    </Draggable>
  );
}

/* ============================================================
   KANBAN COLUMN
============================================================ */

interface KanbanColumnProps {
  status: ColumnStatus;
  label: string;
  tasks: KanbanTask[];
  canCreateTask: boolean;
  onNewTask: () => void;
}

function KanbanColumn({
  status,
  label,
  tasks,
  canCreateTask,
  onNewTask,
}: KanbanColumnProps) {
  return (
    <div
      className="fade-in-static"
      style={{
        minWidth: 290,
        width: 290,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "#F7F8FA",
        border:
          "1px solid #E4E8ED",
        borderRadius: 18,
        padding: 14,
        minHeight: 520,
      }}
    >
      {/* HEADER */}

      <div
        className="flex items-center justify-between"
        style={{
          marginBottom: 14,
          padding:
            "4px 4px 10px",
          borderBottom:
            "1px solid #E4E8ED",
        }}
      >
        <div
          className="flex items-center"
          style={{
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 650,
              color: "#20242B",
            }}
          >
            {label}
          </span>

          <span
            style={{
              minWidth: 22,
              height: 22,
              padding: "0 6px",
              borderRadius: 999,
              background:
                "#EEF2F6",
              color:
                "#667085",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 650,
            }}
          >
            {tasks.length}
          </span>
        </div>

        <div
          className="flex items-center"
          style={{
            gap: 2,
          }}
        >
          {canCreateTask && (
            <button
              className="nav-item"
              style={
                iconButtonStyle
              }
              aria-label={`Add task to ${label}`}
              onClick={onNewTask}
              type="button"
            >
              <Plus size={14} />
            </button>
          )}

          <button
            className="nav-item"
            style={
              iconButtonStyle
            }
            aria-label={`${label} column options`}
            type="button"
          >
            <MoreHorizontal
              size={14}
            />
          </button>
        </div>
      </div>

      {/* DROP AREA */}

      <Droppable
        droppableId={status}
      >
        {(
          provided,
          snapshot
        ) => (
          <div
            ref={
              provided.innerRef
            }
            {...provided.droppableProps}
            className="flex flex-col"
            style={{
              gap: 12,
              minHeight: 80,
              flex: 1,
              borderRadius: 12,
              padding: 4,
              background:
                snapshot.isDraggingOver
                  ? "#EEF2F6"
                  : "transparent",
              transition:
                "background 160ms ease",
            }}
          >
            {tasks.map(
              (
                task,
                index
              ) => (
                <KanbanCard
                  key={
                    task.id
                  }
                  task={task}
                  index={index}
                />
              )
            )}

            {provided.placeholder}

            {tasks.length ===
              0 &&
              !snapshot.isDraggingOver && (
                <div
                  style={{
                    minHeight: 90,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#98A2B3",
                    fontSize: 12,
                    border:
                      "1px dashed #D9DEE5",
                    borderRadius: 12,
                    marginTop: 4,
                  }}
                >
                  No tasks
                </div>
              )}
          </div>
        )}
      </Droppable>

      {/* NEW TASK */}

      {canCreateTask && (
        <button
          className="nav-item"
          style={{
            marginTop: 12,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding:
              "9px 6px",
            fontSize: 12.5,
            fontWeight: 600,
            color: "#667085",
            borderRadius: 10,
          }}
          onClick={onNewTask}
          type="button"
        >
          <Plus size={13} />
          New
        </button>
      )}
    </div>
  );
}

/* ============================================================
   MAIN KANBAN
============================================================ */

export default function Kanban() {
  const {
    tasks,
    setTasks,
    updateTask,
    workspaceMembers,
  } = useTaskContext();

  const { projects } = useProjectContext();
  const { currentWorkspaceId } = useWorkspace();

  // Stage 2 (Real Task Assignees) — real workspace roster; see
  // Tasks.tsx's identical constant for the full reasoning. Distinct
  // from TEAM_MEMBERS/team above, which is this page's own unrelated
  // mock "Product/Engineering/Design/Marketing Team" filter dropdown.
  const ASSIGNEE_OPTIONS = useMemo(
    () => buildWorkspaceAssigneeOptions(workspaceMembers),
    [workspaceMembers]
  );

  // Phase 32: surfaces a failed create-task request — same convention
  // ProjectWorkspace.tsx's own create-task flow already uses, rather
  // than a silent fallback to a task that only exists locally.
  const [mutationError, setMutationError] = useState<string | null>(null);

  const members = useMemo(() => loadMembers(), []);
  const { user } = useAuth();
  const currentActor = useMemo(() => resolveCurrentActor(members, user), [members, user]);

  // Stage 6 (Permissions Alignment): real WorkspaceRole — task create
  // and task update (which a drag-and-drop status change PATCHes) both
  // hit the same real gate on the backend (requireWorkspaceRole("OWNER",
  // "ADMIN"), task.routes.ts), so both checks below resolve to the same
  // real threshold rather than lib/permissions.ts's separate "Project
  // Manager and above" / "Member and above" mock tiers, which the real
  // backend doesn't actually distinguish for tasks.
  const workspaceRole = useWorkspaceRole();
  const hasTaskCreateAccess = isWorkspaceManager(workspaceRole);
  const hasStatusAccess = isWorkspaceManager(workspaceRole);

  /*
    Only projects the current user has Editor+ access to are offered
    as a destination for new tasks, same restriction as Tasks.tsx.
  */
  const editableProjectNames = useMemo(
    () =>
      projects
        .filter((project) => canEditProjectContent(getProjectPermission(project, currentActor.initials)))
        .map((project) => project.name),
    [projects, currentActor]
  );
  const canCreateTask = editableProjectNames.length > 0 && hasTaskCreateAccess;

  const createProjectOptions = editableProjectNames;

  const [
    isCreateDrawerOpen,
    setIsCreateDrawerOpen,
  ] = useState(false);

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    priorityFilter,
    setPriorityFilter,
  ] =
    useState<PriorityFilter>(
      "All"
    );

  const [
    sortMode,
    setSortMode,
  ] =
    useState<SortMode>(
      "default"
    );

  const [
    projectFilter,
    setProjectFilter,
  ] =
    useState(
      "All Projects"
    );

  const [
    teamFilter,
    setTeamFilter,
  ] =
    useState<TeamFilter>(
      "Product Team"
    );

  const [
    moreOpen,
    setMoreOpen,
  ] =
    useState(false);

  /* ==========================================================
     PROJECT OPTIONS
  ========================================================== */

  const projectOptions =
    useMemo(
      () => [
        "All Projects",
        ...projects.map(
          (project) =>
            project.name
        ),
      ],
      [projects]
    );

  /* ==========================================================
     TEAM OPTIONS
  ========================================================== */

  const teamOptions: TeamFilter[] =
    [
      "Product Team",
      "Engineering Team",
      "Design Team",
      "Marketing Team",
    ];

  /* ==========================================================
     FILTER TASKS
  ========================================================== */

  const visibleTasks =
    useMemo(() => {
      const trimmedQuery =
        query
          .trim()
          .toLowerCase();

      return tasks.filter(
        (task) => {
          const matchesQuery =
            trimmedQuery === "" ||
            task.title
              .toLowerCase()
              .includes(
                trimmedQuery
              );

          const matchesPriority =
            priorityFilter ===
              "All" ||
            task.priority ===
              priorityFilter;

          const matchesProject =
            projectFilter ===
              "All Projects" ||
            task.project ===
              projectFilter;

          const matchesTeam =
            teamFilter ===
              "Product Team" ||
            task.assignees.some(
              (assignee) =>
                TEAM_MEMBERS[
                  teamFilter
                ].some(
                  (member) =>
                    member.initials ===
                    assignee.initials
                )
            );

          return (
            matchesQuery &&
            matchesPriority &&
            matchesProject &&
            matchesTeam
          );
        }
      );
    }, [
      tasks,
      query,
      priorityFilter,
      projectFilter,
      teamFilter,
    ]);

  /* ==========================================================
     COLUMN TASKS
  ========================================================== */

  const columnTasks = (
    status: ColumnStatus
  ): KanbanTask[] => {
    const filtered =
      visibleTasks
        .filter(
          (task) =>
            getKanbanStatus(
              task.status
            ) === status
        )
        .map(
          (task) => ({
            id:
              task.id,

            title:
              task.title,

            description:
              task.description,

            project:
              task.project,

            priority:
              task.priority,

            status:
              getKanbanStatus(
                task.status
              ),

            due:
              task.due,

            comments:
              task.comments
                ?.length ?? 0,

            assignees:
              getTaskAssignees(
                task
              ),

            canEdit:
              canEditProjectContent(
                getPermissionForProjectName(
                  task.project,
                  projects,
                  currentActor.initials
                )
              ) && hasStatusAccess,
          })
        );

    if (
      sortMode ===
      "priority"
    ) {
      return [
        ...filtered,
      ].sort(
        (a, b) =>
          PRIORITY_RANK[
            a.priority
          ] -
          PRIORITY_RANK[
            b.priority
          ]
      );
    }

    return filtered;
  };

  /* ==========================================================
     DRAG AND DROP
  ========================================================== */

  const handleDragEnd = (
    result: DropResult
  ) => {
    const {
      destination,
      draggableId,
    } = result;

    if (!destination) {
      return;
    }

    const draggedTask = tasks.find((task) => task.id === draggableId);
    if (
      !draggedTask ||
      !canEditProjectContent(getPermissionForProjectName(draggedTask.project, projects, currentActor.initials)) ||
      !hasStatusAccess
    ) {
      return;
    }

    const destinationStatus =
      destination.droppableId as ColumnStatus;

    const newStatus =
      getTaskStatus(
        destinationStatus
      );

    if (draggedTask.status === newStatus) {
      return;
    }

    setTasks(
      (
        currentTasks
      ) =>
        currentTasks.map(
          (task) => {
            if (
              task.id !==
              draggableId
            ) {
              return task;
            }

            if (
              task.status ===
              newStatus
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
                  id:
                    generateId(
                      "activity"
                    ),

                  text:
                    `Status changed to ${newStatus}`,

                  timestamp:
                    "Just now",
                },
              ],
            };
          }
        )
    );

    // Persists the same status change for real (Phase 32) — the block
    // above is the existing instant local echo (plus its Activity-tab
    // log entry, which has no backend column to persist itself).
    void updateTask(draggableId, { status: newStatus });
  };

  /* ==========================================================
     CREATE TASK
  ========================================================== */

  const handleCreateTask = async (
    values: CreateTaskValues
  ) => {
    if (!editableProjectNames.includes(values.project) || !hasTaskCreateAccess || !currentWorkspaceId) return;

    const project = projects.find((candidate) => candidate.name === values.project);
    if (!project) return;

    /*
      IMPORTANT:

      ASSIGNEE_OPTIONS comes from
      TaskDetailsDrawer's shared
      AssigneeOption structure.

      getMembersForKeys returns
      TeamMember[].
    */

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
      // "New Task" already uses. Stage 2 (Real Task Assignees): the first
      // selected assignee (a real userId — see ASSIGNEE_OPTIONS above) is
      // sent as the real assigneeId; Task only has one real assignee
      // column, so any additional local selections stay a display-only
      // echo (selectedAssignees below), same as before.
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

        assignees:
          selectedAssignees,

        comments: [],

        activity: [
          {
            id:
              generateId(
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
        (
          currentTasks
        ) => [
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
  };

  /* ============================================================
     UI
  ============================================================ */

  return (
    <div
      className="fade-in-static"
      style={{
        width: "100%",
      }}
    >
      {mutationError && (
        <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#B3564B" }}>{mutationError}</p>
      )}

      {/* HEADER */}

      <div
        className="flex flex-col"
        style={{
          marginBottom: 24,
          gap: 16,
        }}
      >
        <div
          className="flex flex-wrap items-center justify-between"
          style={{
            gap: 14,
          }}
        >
          {/* LEFT */}

          <div
            className="flex flex-wrap items-center"
            style={{
              gap: 12,
            }}
          >
            <h1
              className="font-display"
              style={{
                fontSize: 26,
                fontWeight: 600,
                color:
                  "#20242B",
                margin: 0,
              }}
            >
              Kanban
            </h1>

            <PillSelect
              value={
                projectFilter
              }
              options={
                projectOptions
              }
              onChange={
                setProjectFilter
              }
            />

            <PillSelect
              value={
                teamFilter
              }
              options={
                teamOptions
              }
              onChange={(
                value
              ) =>
                setTeamFilter(
                  value as TeamFilter
                )
              }
            />
          </div>

          {/* RIGHT */}

          <div
            className="flex flex-wrap items-center"
            style={{
              gap: 10,
            }}
          >
            {/* SEARCH */}

            <div
              className="bg-card border-soft"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding:
                  "9px 14px",
                borderRadius: 12,
                width: 190,
              }}
            >
              <Search
                size={14}
                strokeWidth={1.8}
                color="#98A2B3"
              />

              <input
                value={
                  query
                }
                onChange={(
                  e
                ) =>
                  setQuery(
                    e.target.value
                  )
                }
                placeholder="Search..."
                style={{
                  border:
                    "none",
                  outline:
                    "none",
                  background:
                    "transparent",
                  fontSize:
                    12.5,
                  flex: 1,
                  color:
                    "#20242B",
                  minWidth: 0,
                }}
              />
            </div>

            {/* NEW TASK */}

            {canCreateTask && (
              <button
                className="lift"
                style={{
                  background:
                    "#20242B",
                  color:
                    "#F7F8FA",
                  border:
                    "none",
                  borderRadius:
                    12,
                  padding:
                    "9px 15px",
                  fontSize:
                    12.5,
                  fontWeight:
                    600,
                  cursor:
                    "pointer",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: 6,
                  whiteSpace:
                    "nowrap",
                }}
                onClick={() =>
                  setIsCreateDrawerOpen(
                    true
                  )
                }
                type="button"
              >
                <Plus size={14} />
                New Task
              </button>
            )}

            {/* PRIORITY */}

            <PillSelect
              value={
                priorityFilter
              }
              options={
                PRIORITY_FILTERS
              }
              onChange={(
                value
              ) =>
                setPriorityFilter(
                  value as PriorityFilter
                )
              }
              icon={
                <SlidersHorizontal
                  size={12}
                  color="#667085"
                />
              }
            />

            {/* SORT */}

            <PillSelect
              value={
                sortMode ===
                "default"
                  ? "Sort: Default"
                  : "Sort: Priority"
              }
              options={[
                "Sort: Default",
                "Sort: Priority",
              ]}
              onChange={(
                value
              ) =>
                setSortMode(
                  value ===
                    "Sort: Priority"
                    ? "priority"
                    : "default"
                )
              }
              icon={
                <ArrowUpDown
                  size={12}
                  color="#667085"
                />
              }
            />

            {/* MORE */}

            <div
              style={{
                position:
                  "relative",
              }}
            >
              <button
                className="nav-item"
                style={{
                  ...iconButtonStyle,
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                }}
                onClick={() =>
                  setMoreOpen(
                    (value) =>
                      !value
                  )
                }
                aria-label="More board options"
                type="button"
              >
                <MoreHorizontal
                  size={17}
                />
              </button>

              {moreOpen && (
                <div
                  className="bg-card border-soft shadow-float-lg fade-in"
                  style={{
                    position:
                      "absolute",
                    right: 0,
                    top:
                      "calc(100% + 6px)",
                    borderRadius:
                      14,
                    padding: 6,
                    width: 168,
                    zIndex: 20,
                  }}
                >
                  <button
                    className="nav-item"
                    style={{
                      width:
                        "100%",
                      textAlign:
                        "left",
                      background:
                        "transparent",
                      border:
                        "none",
                      borderRadius:
                        10,
                      padding:
                        "8px 10px",
                      fontSize:
                        12.5,
                      fontWeight:
                        500,
                      color:
                        "#20242B",
                      cursor:
                        "pointer",
                    }}
                    type="button"
                  >
                    Archive board
                  </button>

                  <button
                    className="nav-item"
                    style={{
                      width:
                        "100%",
                      textAlign:
                        "left",
                      background:
                        "transparent",
                      border:
                        "none",
                      borderRadius:
                        10,
                      padding:
                        "8px 10px",
                      fontSize:
                        12.5,
                      fontWeight:
                        500,
                      color:
                        "#20242B",
                      cursor:
                        "pointer",
                    }}
                    type="button"
                  >
                    Export board
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KANBAN BOARD */}

      <DragDropContext
        onDragEnd={
          handleDragEnd
        }
      >
        <div
          style={{
            display:
              "flex",
            gap: 16,
            overflowX:
              "auto",
            paddingBottom: 20,
            alignItems:
              "flex-start",
            width: "100%",
          }}
        >
          {COLUMNS.map(
            (column) => (
              <KanbanColumn
                key={
                  column.key
                }
                status={
                  column.key
                }
                label={
                  column.label
                }
                tasks={columnTasks(
                  column.key
                )}
                canCreateTask={canCreateTask}
                onNewTask={() =>
                  setIsCreateDrawerOpen(
                    true
                  )
                }
              />
            )
          )}
        </div>
      </DragDropContext>

      {/* CREATE TASK DRAWER */}

      <CreateTaskDrawer
        isOpen={
          isCreateDrawerOpen
        }
        statusOptions={
          STATUS_OPTIONS
        }
        projectOptions={
          createProjectOptions
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
    </div>
  );
}