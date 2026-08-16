import { useMemo, useRef, useState } from "react";

import { useProjectWorkspace } from "../../context/projectWorkspaceContext";
import { useTaskContext } from "../../context/taskContextValue";
import { useNotificationContext } from "../../context/notificationContextValue";
import { useTaskCommentHandlers } from "../../hooks/useTaskCommentHandlers";
import { getDueGroup, type Status } from "../../data/taskData";
import {
  getAssigneeKey,
  getMembersForKeys,
  describeChanges,
  generateId,
  TaskDetailsDrawer,
  buildWorkspaceAssigneeOptions,
  type TaskDetailsSaveValues,
} from "../TaskDetailsDrawer";
import { loadMembers } from "../../data/teamData";
import { resolveCurrentActor } from "../../data/workspaceData";
import { useWorkspaceRole, isWorkspaceManager } from "../../hooks/useWorkspaceRole";
import { notifyTaskAssigned, notifyTaskCompleted } from "../../data/systemNotifications";
import { useAuth } from "../../context/AuthContext";
import {
  DAY_WIDTH,
  LABEL_WIDTH,
  startOfDay,
  daysBetween,
  addDays,
  computeDateRange,
  resolveTaskDueDate,
  TimelineDateHeader,
  TaskGanttRow,
  UnscheduledTaskCard,
} from "../timeline/GanttTimeline";

const STATUS_OPTIONS: Status[] = ["To Do", "In Progress", "Completed"];

/**
 * Renders this project's tasks on the same date-scaled Gantt (day-grid
 * header + task bars/milestones positioned from real start/due dates) as
 * the main Timeline page — reusing its rendering pieces from
 * components/timeline/GanttTimeline instead of a second, hand-rolled
 * implementation — scoped down to just `projectTasks` (no cross-project
 * grouping, since there's only ever one project here).
 */
export function ProjectTimelineTab() {
  const { projectTasks: tasks, project } = useProjectWorkspace();
  const { setTasks, updateTask, deleteTask, workspaceMembers } = useTaskContext();
  const { addNotification } = useNotificationContext();
  // Stage 6 (Permissions Alignment): real WorkspaceRole — see
  // ProjectListTab.tsx's identical constant for the full reasoning.
  const workspaceRole = useWorkspaceRole();
  const canEdit = isWorkspaceManager(workspaceRole);
  const canComment = true;

  const members = useMemo(() => loadMembers(), []);
  const { user } = useAuth();
  const currentActor = useMemo(() => resolveCurrentActor(members, user), [members, user]);
  // Stage 2 (Real Task Assignees) — real workspace roster; see
  // ProjectWorkspace.tsx's identical constant for the full reasoning.
  const assigneeOptions = useMemo(() => buildWorkspaceAssigneeOptions(workspaceMembers), [workspaceMembers]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const dayWidth = DAY_WIDTH.week;
  const today = useMemo(() => startOfDay(new Date()), []);

  /*
   * Scheduled vs. unscheduled is decided by the same resolveTaskDueDate()
   * the Gantt bars themselves use — not just "is `due` non-empty" — so a
   * task only lands in the day grid when it actually resolves to a real
   * date, and that date agrees with where its bar gets drawn.
   */
  const scheduledTasks = useMemo(() => tasks.filter((task) => resolveTaskDueDate(task, today) !== null), [tasks, today]);
  const unscheduledTasks = useMemo(() => tasks.filter((task) => resolveTaskDueDate(task, today) === null), [tasks, today]);

  const { rangeStart, rangeEnd } = useMemo(() => computeDateRange(scheduledTasks, today), [scheduledTasks, today]);

  const days = useMemo(() => {
    const count = daysBetween(rangeStart, rangeEnd) + 1;
    return Array.from({ length: count }, (_, i) => addDays(rangeStart, i));
  }, [rangeStart, rangeEnd]);

  const daysWidth = days.length * dayWidth;
  const totalWidth = LABEL_WIDTH + daysWidth;

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  function handleSaveTask(values: TaskDetailsSaveValues) {
    if (!selectedTask || !canEdit) return;

    const before = {
      status: selectedTask.status,
      priority: selectedTask.priority,
      assigneeKeys: selectedTask.assignees
        .map((member) => getAssigneeKey(assigneeOptions, member))
        .filter((key): key is string => Boolean(key)),
    };

    const changes = describeChanges(
      before,
      { status: values.status, priority: values.priority, assigneeKeys: values.assigneeKeys },
      (key) => assigneeOptions.find((option) => option.key === key)?.label ?? key
    );

    const selectedAssignees = getMembersForKeys(assigneeOptions, values.assigneeKeys);

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
          assignee: selectedAssignees[0],
          assignees: selectedAssignees,
          activity:
            changes.messages.length > 0
              ? [...(task.activity ?? []), ...changes.messages.map((change) => ({ id: generateId("activity"), text: change, timestamp: "Just now" }))]
              : task.activity,
        };
      })
    );

    // Persists the real-column subset for real (Phase 32; assigneeId
    // Stage 2) — see TaskContext.tsx's updateTask. Only the first
    // selected assignee is real.
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
      actionHref: `/projects/${project.id}/timeline`,
    });

    if (changes.justCompleted) {
      notifyTaskCompleted(addNotification, {
        taskTitle: selectedTask.title,
        projectName: selectedTask.project,
        assigneeId: values.assigneeKeys[0],
        actorId: user?.id,
        actor: currentActor,
        actionHref: `/projects/${project.id}/timeline`,
      });
    }
  }

  const { handleAddComment, handleEditComment, handleDeleteComment, commentsLoading, commentsError } = useTaskCommentHandlers({
    setTasks,
    selectedTask,
    currentActor,
    canComment,
    canEdit,
    addNotification,
    notificationHref: `/projects/${project.id}/timeline`,
  });

  function handleDeleteTask() {
    if (!selectedTask || !canEdit) return;
    setSelectedTaskId(null);
    void deleteTask(selectedTask.id);
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-card border-soft shadow-float fade-in" style={{ borderRadius: 20, padding: 20 }}>
        <p className="text-ink-3" style={{ fontSize: 12.5 }}>No tasks in this project yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border-soft shadow-float fade-in" style={{ borderRadius: 20, padding: "10px 0 10px 18px" }}>
        <div ref={scrollRef} style={{ overflowX: "auto", paddingRight: 18 }}>
          <TimelineDateHeader days={days} today={today} dayWidth={dayWidth} daysWidth={daysWidth} totalWidth={totalWidth} />

          {scheduledTasks.length === 0 ? (
            <p className="text-ink-3" style={{ fontSize: 12.5, padding: "10px 4px" }}>
              No dated tasks to show on the timeline yet.
            </p>
          ) : (
            scheduledTasks.map((task) => (
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
            ))
          )}
        </div>

        {unscheduledTasks.length > 0 && (
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 10, marginRight: 18, paddingTop: 9 }}>
            <div className="text-ink-3" style={{ fontSize: 11, fontWeight: 650, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.3 }}>
              No due date ({unscheduledTasks.length})
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 8 }}>
              {unscheduledTasks.map((task) => (
                <UnscheduledTaskCard key={task.id} task={task} onSelect={() => setSelectedTaskId(task.id)} />
              ))}
            </div>
          </div>
        )}
      </div>

      <TaskDetailsDrawer
        task={selectedTask}
        isOpen={selectedTask !== null}
        statusOptions={STATUS_OPTIONS}
        assigneeOptions={assigneeOptions}
        allowMultipleAssignees
        canEdit={canEdit}
        canComment={canComment}
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
    </>
  );
}
