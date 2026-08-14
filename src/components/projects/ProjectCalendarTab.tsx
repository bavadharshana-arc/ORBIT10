import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { MiniCalendar } from "../dashboard/MiniCalendar";
import { useProjectWorkspace } from "../../context/projectWorkspaceContext";
import { useTaskContext } from "../../context/taskContextValue";
import { useNotificationContext } from "../../context/notificationContextValue";
import { useTaskCommentHandlers } from "../../hooks/useTaskCommentHandlers";
import { loadMembers } from "../../data/teamData";
import { buildProjectAssigneeOptions, canEditProjectContent, canCommentOnProject, resolveCurrentActor } from "../../data/workspaceData";
import { useAuth } from "../../context/AuthContext";
import { notifyTaskAssigned, notifyTaskCompleted } from "../../data/systemNotifications";
import { getDueGroup, type Status, type Task } from "../../data/taskData";
import { buildMonthGrid, groupTasksByDay } from "../../data/calendarGrid";
import { Pill } from "../ui/Pill";
import { AvatarStack } from "../ui/AvatarStack";
import {
  TaskDetailsDrawer,
  generateId,
  getMembersForKeys,
  describeChanges,
  type TaskDetailsSaveValues,
} from "../TaskDetailsDrawer";

const PRIORITY_TONE: Record<Task["priority"], "surface" | "blue" | "dark"> = {
  Low: "surface",
  Medium: "blue",
  High: "dark",
};

const STATUS_OPTIONS: Status[] = ["To Do", "In Progress", "Completed"];

export function ProjectCalendarTab() {
  // `projectTasks` is already scoped to this project (filtered by
  // ProjectWorkspace from the shared TaskContext), and `setTasks` writes
  // straight back into that same context — so the drawer edits the one
  // real task list instead of a local copy.
  const { projectTasks: tasks, project, permission } = useProjectWorkspace();
  const { setTasks } = useTaskContext();
  const { addNotification } = useNotificationContext();
  const canEdit = canEditProjectContent(permission);
  const canComment = canCommentOnProject(permission);

  const members = useMemo(() => loadMembers(), []);
  const { user } = useAuth();
  const currentActor = useMemo(() => resolveCurrentActor(members, user), [members, user]);
  const assigneeOptions = useMemo(() => buildProjectAssigneeOptions(project, members), [project, members]);

  const today = useMemo(() => new Date(), []);
  const [viewedMonth, setViewedMonth] = useState(today);
  const grid = useMemo(() => buildMonthGrid(viewedMonth), [viewedMonth]);
  const isViewingCurrentMonth = grid.year === today.getFullYear() && grid.month === today.getMonth();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  function handlePrevMonth() {
    setViewedMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  function handleNextMonth() {
    setViewedMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  const tasksByDay = useMemo(() => groupTasksByDay(tasks, grid.year, grid.month), [tasks, grid]);
  const eventDays = useMemo(() => [...tasksByDay.keys()], [tasksByDay]);
  const selectedDayTasks = selectedDay !== null ? tasksByDay.get(selectedDay) ?? [] : [];
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  const selectedDayLabel =
    selectedDay !== null
      ? new Date(grid.year, grid.month, selectedDay).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })
      : null;

  function handleSaveTask(values: TaskDetailsSaveValues) {
    if (!selectedTask || !canEdit) return;

    const before = {
      status: selectedTask.status,
      priority: selectedTask.priority,
      assigneeKeys: selectedTask.assignees
        .map((member) => assigneeOptions.find((option) => option.member.initials === member.initials)?.key)
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

    notifyTaskAssigned(addNotification, {
      taskTitle: selectedTask.title,
      projectName: selectedTask.project,
      assignedNames: changes.newlyAssigned,
      actor: currentActor,
      actionHref: `/projects/${project.id}/calendar`,
    });

    if (changes.justCompleted) {
      notifyTaskCompleted(addNotification, {
        taskTitle: selectedTask.title,
        projectName: selectedTask.project,
        actor: currentActor,
        actionHref: `/projects/${project.id}/calendar`,
      });
    }
  }

  const { handleAddComment, handleEditComment, handleDeleteComment } = useTaskCommentHandlers({
    setTasks,
    selectedTask,
    currentActor,
    canComment,
    canEdit,
    addNotification,
    notificationHref: `/projects/${project.id}/calendar`,
  });

  function handleDeleteTask() {
    if (!selectedTask || !canEdit) return;
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== selectedTask.id));
    setSelectedTaskId(null);
  }

  return (
    <div>
      <div className="flex items-start" style={{ gap: 18, flexWrap: "wrap" }}>
        <div style={{ width: 420, maxWidth: "100%" }}>
          <MiniCalendar
            monthLabel={grid.monthLabel}
            rows={grid.rows}
            outsideKeys={grid.outsideKeys}
            today={today.getDate()}
            isCurrentMonth={isViewingCurrentMonth}
            eventDays={eventDays}
            onSelectDay={setSelectedDay}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />
        </div>

        <div className="bg-card border-soft shadow-float fade-in" style={{ borderRadius: 22, padding: 20, flex: "1 1 260px", minWidth: 260 }}>
          <div className="flex items-center" style={{ gap: 8, marginBottom: 14 }}>
            <CalendarDays size={15} color="var(--text-3)" />
            <span className="font-display" style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
              {selectedDayLabel ?? "Select a date"}
            </span>
          </div>

          {selectedDay === null ? (
            <p className="text-ink-3" style={{ fontSize: 12.5, padding: "20px 4px", textAlign: "center" }}>
              Click a date on the calendar to see tasks due that day.
            </p>
          ) : selectedDayTasks.length === 0 ? (
            <p className="text-ink-3" style={{ fontSize: 12.5, padding: "20px 4px", textAlign: "center" }}>
              No tasks due on this day.
            </p>
          ) : (
            <div className="flex flex-col" style={{ gap: 10 }}>
              {selectedDayTasks.map((task) => (
                <div
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedTaskId(task.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedTaskId(task.id);
                    }
                  }}
                  className="flex items-center border-soft"
                  style={{ gap: 10, padding: "10px 12px", borderRadius: 14, border: "1px solid var(--border)", cursor: "pointer" }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text)",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center" style={{ gap: 6, marginTop: 6 }}>
                      <Pill tone="surface">{task.status}</Pill>
                      <Pill tone={PRIORITY_TONE[task.priority]}>{task.priority}</Pill>
                    </div>
                  </div>
                  {task.assignees.length > 0 && <AvatarStack people={task.assignees} />}
                </div>
              ))}
            </div>
          )}
        </div>
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
        onDelete={handleDeleteTask}
      />
    </div>
  );
}
