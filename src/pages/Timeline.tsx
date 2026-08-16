import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  SlidersHorizontal,
  ListChecks,
  FolderOpen,
} from "lucide-react";

import { useTaskContext } from "../context/taskContextValue";
import { useNotificationContext } from "../context/notificationContextValue";
import { useTaskCommentHandlers } from "../hooks/useTaskCommentHandlers";
import { loadMembers } from "../data/teamData";
import { resolveCurrentActor } from "../data/workspaceData";
import { useAuth } from "../context/AuthContext";
import { useWorkspaceRole, isWorkspaceManager } from "../hooks/useWorkspaceRole";
import { notifyTaskAssigned, notifyTaskCompleted } from "../data/systemNotifications";
import { getDueGroup, type Status, type Task } from "../data/taskData";
import {
  TaskDetailsDrawer,
  buildWorkspaceAssigneeOptions,
  getAssigneeKey,
  getMembersForKeys,
  describeChanges,
  generateId,
  type TaskDetailsSaveValues,
} from "../components/TaskDetailsDrawer";
import {
  LABEL_WIDTH,
  DAY_WIDTH,
  STATUS_BAR_COLOR,
  type ViewMode,
  startOfDay,
  addDays,
  daysBetween,
  resolveTaskDueDate,
  computeDateRange,
  formatRangeLabel,
  GanttRow,
  TimelineDateHeader,
  TaskGanttRow,
  UnscheduledTaskCard,
} from "../components/timeline/GanttTimeline";

/* ============================================================
   CONSTANTS
============================================================ */

type StatusFilter = "All" | Status;

const STATUS_FILTERS: StatusFilter[] = [
  "All",
  "To Do",
  "In Progress",
  "Completed",
];

const STATUS_OPTIONS: Status[] = ["To Do", "In Progress", "Completed"];

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div
      className="bg-card border-soft fade-in flex flex-col items-center"
      style={{
        borderRadius: 22,
        padding: "48px 24px",
        textAlign: "center",
        gap: 10,
      }}
    >
      <FolderOpen size={26} strokeWidth={1.6} color="#98A2B3" />
      <p style={{ fontSize: 14, fontWeight: 600 }}>{title}</p>
      <p className="text-ink-3" style={{ fontSize: 12.5, maxWidth: 280 }}>
        {message}
      </p>
    </div>
  );
}

/* ============================================================
   PROJECT GROUP HEADER ROW
============================================================ */

function ProjectGroupRow({
  project,
  count,
  isCollapsed,
  onToggle,
  totalWidth,
  daysWidth,
}: {
  project: string;
  count: number;
  isCollapsed: boolean;
  onToggle: () => void;
  totalWidth: number;
  daysWidth: number;
}) {
  return (
    <GanttRow
      totalWidth={totalWidth}
      daysWidth={daysWidth}
      labelBackground="#F7F8FA"
      label={
        <button
          type="button"
          onClick={onToggle}
          className="nav-item"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 4px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <ChevronDown
            size={13}
            color="#667085"
            style={{
              transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
              transition: "transform 160ms ease",
              flexShrink: 0,
            }}
          />
          <span
            className="font-display"
            style={{ fontSize: 12.5, fontWeight: 650, color: "#20242B" }}
          >
            {project}
          </span>
          <span className="text-ink-3" style={{ fontSize: 11 }}>
            {count}
          </span>
        </button>
      }
    >
      <div style={{ width: daysWidth, background: "#F7F8FA" }} />
    </GanttRow>
  );
}

/* ============================================================
   LEGEND
============================================================ */

function StatusLegend() {
  const entries: Status[] = ["To Do", "In Progress", "Completed"];
  return (
    <div className="flex items-center" style={{ gap: 14 }}>
      {entries.map((status) => (
        <div
          key={status}
          className="flex items-center text-ink-3"
          style={{ gap: 6, fontSize: 11 }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: STATUS_BAR_COLOR[status],
              border: status === "To Do" ? "1px solid #E4E8ED" : "none",
            }}
          />
          {status}
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   TIMELINE PAGE
============================================================ */

export default function Timeline() {
  const { tasks, setTasks, updateTask, deleteTask, workspaceMembers } = useTaskContext();

  // Stage 2 (Real Task Assignees) — real workspace roster; see
  // Tasks.tsx's identical constant for the full reasoning.
  const ASSIGNEE_OPTIONS = useMemo(
    () => buildWorkspaceAssigneeOptions(workspaceMembers),
    [workspaceMembers]
  );
  const { addNotification } = useNotificationContext();
  const members = useMemo(() => loadMembers(), []);
  const { user } = useAuth();
  const currentActor = useMemo(() => resolveCurrentActor(members, user), [members, user]);

  // Stage 6 (Permissions Alignment): real WorkspaceRole. Task
  // create/update/delete are gated on the backend by workspace role
  // alone (requireWorkspaceRole("OWNER", "ADMIN"), task.routes.ts) —
  // not by any per-project role — so editing here no longer also
  // requires the mock per-project canEditProjectContent check, which
  // never reflected a real boundary for this action. Comments have no
  // role restriction at all beyond workspace membership
  // (comment.routes.ts only requires requireWorkspaceMembership),
  // which is already guaranteed by being able to see this page's data.
  const workspaceRole = useWorkspaceRole();
  const hasTaskEditAccess = isWorkspaceManager(workspaceRole);

  function canEditTask(task: Task): boolean {
    void task;
    return hasTaskEditAccess;
  }

  function canCommentOnTask(task: Task): boolean {
    void task;
    return true;
  }

  const scrollRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [collapsedProjects, setCollapsedProjects] = useState<
    Record<string, boolean>
  >({});
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const dayWidth = DAY_WIDTH[viewMode];
  const today = useMemo(() => startOfDay(new Date()), []);

  /* ==========================================================
     PARSED DUE DATES
  ========================================================== */

  const parsedDueByTaskId = useMemo(() => {
    const map = new Map<string, Date | null>();
    for (const task of tasks) {
      map.set(task.id, resolveTaskDueDate(task, today));
    }
    return map;
  }, [tasks, today]);

  /* ==========================================================
     DATE RANGE — derived from every real due date so nothing is
     ever clipped, padded a few days, clamped for safety.
  ========================================================== */

  const allScheduledTasks = useMemo(
    () => tasks.filter((task) => parsedDueByTaskId.get(task.id) !== null),
    [tasks, parsedDueByTaskId]
  );

  const { rangeStart, rangeEnd } = useMemo(
    () => computeDateRange(allScheduledTasks, today),
    [allScheduledTasks, today]
  );

  const days = useMemo(() => {
    const count = daysBetween(rangeStart, rangeEnd) + 1;
    return Array.from({ length: count }, (_, i) => addDays(rangeStart, i));
  }, [rangeStart, rangeEnd]);

  const daysWidth = days.length * dayWidth;
  const totalWidth = LABEL_WIDTH + daysWidth;
  const todayIndex = daysBetween(rangeStart, today);

  /* ==========================================================
     SEARCH + FILTER
  ========================================================== */

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesQuery =
        query === "" ||
        task.title.toLowerCase().includes(query) ||
        task.project.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "All" || task.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [tasks, searchQuery, statusFilter]);

  const scheduledTasks = useMemo(
    () =>
      filteredTasks.filter((task) => parsedDueByTaskId.get(task.id) !== null),
    [filteredTasks, parsedDueByTaskId]
  );

  const unscheduledTasks = useMemo(
    () =>
      filteredTasks.filter((task) => parsedDueByTaskId.get(task.id) === null),
    [filteredTasks, parsedDueByTaskId]
  );

  const projectGroups = useMemo(() => {
    const map = new Map<string, Task[]>();

    for (const task of scheduledTasks) {
      const key = task.project || "No project";
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }

    return Array.from(map.entries())
      .map(([project, groupTasks]) => ({
        project,
        tasks: [...groupTasks].sort((a, b) => {
          const aTime = parsedDueByTaskId.get(a.id)?.getTime() ?? 0;
          const bTime = parsedDueByTaskId.get(b.id)?.getTime() ?? 0;
          return aTime - bTime;
        }),
      }))
      .sort((a, b) => a.project.localeCompare(b.project));
  }, [scheduledTasks, parsedDueByTaskId]);

  function toggleGroup(project: string) {
    setCollapsedProjects((current) => ({
      ...current,
      [project]: !current[project],
    }));
  }

  /* ==========================================================
     TASK DETAILS DRAWER
  ========================================================== */

  const selectedTask =
    tasks.find((task) => task.id === selectedTaskId) ?? null;

  const canEditSelectedTask = selectedTask ? canEditTask(selectedTask) : false;
  const canCommentOnSelectedTask = selectedTask ? canCommentOnTask(selectedTask) : false;

  const { handleAddComment, handleEditComment, handleDeleteComment, commentsLoading, commentsError } = useTaskCommentHandlers({
    setTasks,
    selectedTask,
    currentActor,
    canComment: canCommentOnSelectedTask,
    canEdit: canEditSelectedTask,
    addNotification,
    notificationHref: "/timeline",
  });

  function handleSaveTask(values: TaskDetailsSaveValues) {
    if (!selectedTask || !canEditTask(selectedTask)) return;

    const before = {
      status: selectedTask.status,
      priority: selectedTask.priority,
      assigneeKeys: selectedTask.assignees
        .map((member) => getAssigneeKey(ASSIGNEE_OPTIONS, member))
        .filter((key): key is string => Boolean(key)),
    };

    const changes = describeChanges(
      before,
      {
        status: values.status,
        priority: values.priority,
        assigneeKeys: values.assigneeKeys,
      },
      (key) =>
        ASSIGNEE_OPTIONS.find((option) => option.key === key)?.label ?? key
    );

    const selectedAssignees = getMembersForKeys(
      ASSIGNEE_OPTIONS,
      values.assigneeKeys
    );

    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id !== selectedTask.id) return task;

        return {
          ...task,
          title: values.title,
          description: values.description,
          status: values.status,
          priority: values.priority,
          due: values.due || "No due date",
          dueDate: values.dueDate,
          dueGroup: getDueGroup(values.dueDate),
          assignees: selectedAssignees,
          activity:
            changes.messages.length > 0
              ? [
                  ...(task.activity ?? []),
                  ...changes.messages.map((change) => ({
                    id: generateId("activity"),
                    text: change,
                    timestamp: "Just now",
                  })),
                ]
              : task.activity,
        };
      })
    );

    // Persists the real-column subset for real (Phase 32; assigneeId
    // Stage 2) — see TaskContext.tsx's updateTask; the block above
    // stays as the instant local echo for activity, which has no
    // backend column. Only the first selected assignee is real.
    void updateTask(selectedTask.id, {
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      dueDate: values.dueDate ?? null,
      assigneeId: values.assigneeKeys[0] ?? null,
    });

    notifyTaskAssigned(addNotification, {
      taskTitle: selectedTask.title,
      projectName: selectedTask.project,
      assigneeId: values.assigneeKeys[0],
      actorId: user?.id,
      actor: currentActor,
      actionHref: "/timeline",
    });

    if (changes.justCompleted) {
      notifyTaskCompleted(addNotification, {
        taskTitle: selectedTask.title,
        projectName: selectedTask.project,
        assigneeId: values.assigneeKeys[0],
        actorId: user?.id,
        actor: currentActor,
        actionHref: "/timeline",
      });
    }
  }

  function handleDeleteTask() {
    if (!selectedTask || !canEditTask(selectedTask)) return;

    setSelectedTaskId(null);

    // Real delete (Phase 32).
    void deleteTask(selectedTask.id);
  }

  /* ==========================================================
     NAVIGATION
  ========================================================== */

  function scrollToToday(behavior: ScrollBehavior = "smooth") {
    const target = Math.max(0, (todayIndex - 3) * dayWidth);
    scrollRef.current?.scrollTo({ left: target, behavior });
  }

  function scrollByStep(direction: 1 | -1) {
    const stepDays = viewMode === "week" ? 7 : 30;
    scrollRef.current?.scrollBy({
      left: direction * dayWidth * stepDays,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    scrollToToday("auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  return (
    <div className="fade-in" style={{ width: "100%" }}>
      <div
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        style={{ marginBottom: 15 }}
      >
        <div>
          <h1
            className="font-display"
            style={{ fontSize: 28, fontWeight: 560, marginBottom: 4 }}
          >
            Timeline
          </h1>
          <p className="text-ink-2" style={{ fontSize: 13.5 }}>
            Every task, grouped by project and laid out by due date.
          </p>
        </div>
      </div>

      {/* ======================================================
          TOOLBAR
      ====================================================== */}

      <div
        className="bg-card border-soft shadow-float flex flex-wrap items-center justify-between"
        style={{
          borderRadius: 16,
          padding: "7px 14px",
          marginBottom: 13,
          gap: 12,
        }}
      >
        <div className="flex items-center" style={{ gap: 10 }}>
          <button
            type="button"
            onClick={() => scrollToToday()}
            className="border-soft nav-item"
            style={{
              borderRadius: 10,
              padding: "7px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              color: "#20242B",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Today
          </button>
          <div className="flex items-center" style={{ gap: 2 }}>
            <button
              type="button"
              onClick={() => scrollByStep(-1)}
              aria-label="Scroll back"
              className="nav-item"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: "none",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#667085",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => scrollByStep(1)}
              aria-label="Scroll forward"
              className="nav-item"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: "none",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#667085",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <span
            className="font-display"
            style={{ fontSize: 14, fontWeight: 600, color: "#20242B" }}
          >
            {formatRangeLabel(rangeStart, rangeEnd)}
          </span>
        </div>

        <div className="flex flex-wrap items-center" style={{ gap: 10 }}>
          {/* SEARCH */}

          <div
            className="flex items-center"
            style={{
              gap: 8,
              padding: "7px 12px",
              borderRadius: 10,
              background: "#EEF2F6",
              width: 180,
            }}
          >
            <Search size={13} color="#98A2B3" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search tasks…"
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 12,
                color: "#20242B",
                width: "100%",
              }}
            />
          </div>

          {/* FILTER */}

          <div
            className="flex items-center"
            style={{ position: "relative", display: "inline-flex" }}
          >
            <SlidersHorizontal
              size={12}
              color="#667085"
              style={{ position: "absolute", left: 11, pointerEvents: "none" }}
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              style={{
                appearance: "none",
                background: "#EEF2F6",
                border: "none",
                borderRadius: 10,
                padding: "8px 28px 8px 30px",
                fontSize: 12,
                fontWeight: 600,
                color: "#20242B",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option} value={option}>
                  {option === "All" ? "All statuses" : option}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              color="#667085"
              style={{
                position: "absolute",
                right: 10,
                top: 10,
                pointerEvents: "none",
              }}
            />
          </div>

          {/* VIEW TOGGLE */}

          <div
            className="flex items-center"
            style={{ background: "#EEF2F6", borderRadius: 10, padding: 2, gap: 2 }}
          >
            {(["week", "month"] as ViewMode[]).map((mode) => {
              const isActive = viewMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  style={{
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 11.5,
                    fontWeight: 600,
                    textTransform: "capitalize",
                    cursor: "pointer",
                    background: isActive ? "#FFFFFF" : "transparent",
                    color: isActive ? "#20242B" : "#667085",
                  }}
                >
                  {mode}
                </button>
              );
            })}
          </div>

          <StatusLegend />

          <div
            className="flex items-center text-ink-3"
            style={{ gap: 6, fontSize: 11 }}
          >
            <ListChecks size={13} />
            {scheduledTasks.length} scheduled
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          message="Tasks you create will show up here on the timeline once they have a due date."
        />
      ) : (
        <div
          className="bg-card border-soft shadow-float"
          style={{ borderRadius: 18, padding: "10px 0 10px 18px" }}
        >
          <div ref={scrollRef} style={{ overflowX: "auto", paddingRight: 18 }}>
            <TimelineDateHeader
              days={days}
              today={today}
              dayWidth={dayWidth}
              daysWidth={daysWidth}
              totalWidth={totalWidth}
            />

            {projectGroups.length === 0 ? (
              <p
                className="text-ink-3"
                style={{ fontSize: 12.5, padding: "10px 4px" }}
              >
                No scheduled tasks match your filters.
              </p>
            ) : (
              projectGroups.map((group) => {
                const isCollapsed = Boolean(collapsedProjects[group.project]);

                return (
                  <div key={group.project}>
                    <ProjectGroupRow
                      project={group.project}
                      count={group.tasks.length}
                      isCollapsed={isCollapsed}
                      onToggle={() => toggleGroup(group.project)}
                      totalWidth={totalWidth}
                      daysWidth={daysWidth}
                    />
                    {!isCollapsed &&
                      group.tasks.map((task) => (
                        <TaskGanttRow
                          key={task.id}
                          task={task}
                          days={days}
                          today={today}
                          dayWidth={dayWidth}
                          daysWidth={daysWidth}
                          totalWidth={totalWidth}
                          onSelect={() => setSelectedTaskId(task.id)}
                        />
                      ))}
                  </div>
                );
              })
            )}
          </div>

          {unscheduledTasks.length > 0 && (
            <div
              style={{
                borderTop: "1px solid #E4E8ED",
                marginTop: 10,
                marginRight: 18,
                paddingTop: 9,
              }}
            >
              <div
                className="text-ink-3"
                style={{
                  fontSize: 11,
                  fontWeight: 650,
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                }}
              >
                No due date ({unscheduledTasks.length})
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                  gap: 8,
                }}
              >
                {unscheduledTasks.map((task) => (
                  <UnscheduledTaskCard
                    key={task.id}
                    task={task}
                    onSelect={() => setSelectedTaskId(task.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          TASK DETAILS DRAWER
      ====================================================== */}

      <TaskDetailsDrawer
        task={selectedTask}
        isOpen={selectedTask !== null}
        statusOptions={STATUS_OPTIONS}
        assigneeOptions={ASSIGNEE_OPTIONS}
        allowMultipleAssignees
        canEdit={canEditSelectedTask}
        canComment={canCommentOnSelectedTask}
        currentActor={currentActor}
        onClose={() => setSelectedTaskId(null)}
        onSave={handleSaveTask}
        onAddComment={handleAddComment}
        onEditComment={handleEditComment}
        onDeleteComment={handleDeleteComment}
        commentsLoading={commentsLoading}
        commentsError={commentsError}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}
