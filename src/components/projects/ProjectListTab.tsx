import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { getDueGroup, type Priority, type Status, type Task } from "../../data/taskData";
import { Pill } from "../ui/Pill";
import { AvatarStack } from "../ui/AvatarStack";
import { useProjectWorkspace } from "../../context/projectWorkspaceContext";
import { useTaskContext } from "../../context/taskContextValue";
import { useNotificationContext } from "../../context/notificationContextValue";
import { useTaskCommentHandlers } from "../../hooks/useTaskCommentHandlers";
import { loadMembers } from "../../data/teamData";
import { resolveCurrentActor } from "../../data/workspaceData";
import { useWorkspaceRole, isWorkspaceManager } from "../../hooks/useWorkspaceRole";
import { notifyTaskAssigned, notifyTaskCompleted } from "../../data/systemNotifications";
import { useAuth } from "../../context/AuthContext";
import {
  TaskDetailsDrawer,
  buildWorkspaceAssigneeOptions,
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

type StatusFilter = "All" | Status;
type PriorityFilter = "All" | Priority;
type SortMode = "due" | "priority" | "title";

const PRIORITY_RANK: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

function sortTasks(tasks: Task[], mode: SortMode): Task[] {
  const sorted = [...tasks];

  if (mode === "priority") {
    return sorted.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  }

  if (mode === "title") {
    return sorted.sort((a, b) => a.title.localeCompare(b.title));
  }

  return sorted.sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
}

const filterStyle = {
  appearance: "none" as const,
  border: "1px solid var(--border)",
  borderRadius: 10,
  background: "var(--surface)",
  padding: "7px 10px",
  fontSize: 11.5,
  fontWeight: 600,
  color: "var(--text)",
  outline: "none",
  cursor: "pointer",
};

export function ProjectListTab() {
  const { projectTasks: tasks, project } = useProjectWorkspace();
  const { setTasks, updateTask, deleteTask, workspaceMembers } = useTaskContext();
  const { addNotification } = useNotificationContext();
  // Stage 6 (Permissions Alignment): real WorkspaceRole — task
  // create/update/delete are gated on the backend by workspace role
  // alone (requireWorkspaceRole("OWNER", "ADMIN"), task.routes.ts), not
  // by this project's ProjectRole. Comments have no role restriction
  // beyond workspace membership (comment.routes.ts).
  const workspaceRole = useWorkspaceRole();
  const canEdit = isWorkspaceManager(workspaceRole);
  const canComment = true;

  const members = useMemo(() => loadMembers(), []);
  const { user } = useAuth();
  const currentActor = useMemo(() => resolveCurrentActor(members, user), [members, user]);
  // Stage 2 (Real Task Assignees) — real workspace roster; see
  // ProjectWorkspace.tsx's identical constant for the full reasoning.
  const assigneeOptions = useMemo(() => buildWorkspaceAssigneeOptions(workspaceMembers), [workspaceMembers]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("All");
  const [sortMode, setSortMode] = useState<SortMode>("due");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesQuery =
        normalizedQuery === "" ||
        task.title.toLowerCase().includes(normalizedQuery) ||
        task.description.toLowerCase().includes(normalizedQuery);

      const matchesStatus = statusFilter === "All" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "All" || task.priority === priorityFilter;

      return matchesQuery && matchesStatus && matchesPriority;
    });
  }, [tasks, query, statusFilter, priorityFilter]);

  const sorted = useMemo(() => sortTasks(filteredTasks, sortMode), [filteredTasks, sortMode]);

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
      actionHref: `/projects/${project.id}/list`,
    });

    if (changes.justCompleted) {
      notifyTaskCompleted(addNotification, {
        taskTitle: selectedTask.title,
        projectName: selectedTask.project,
        assigneeId: values.assigneeKeys[0],
        actorId: user?.id,
        actor: currentActor,
        actionHref: `/projects/${project.id}/list`,
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
    notificationHref: `/projects/${project.id}/list`,
  });

  function handleDeleteTask() {
    if (!selectedTask || !canEdit) return;
    setSelectedTaskId(null);
    void deleteTask(selectedTask.id);
  }

  return (
    <div>
      {/* TOOLBAR */}
      {tasks.length > 0 && (
        <div
          className="bg-card border-soft"
          style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, marginBottom: 14, flexWrap: "wrap" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 160, padding: "6px 10px" }}>
            <Search size={14} color="var(--text-3)" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tasks..."
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, color: "var(--text)", width: "100%" }}
            />
          </div>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} style={filterStyle}>
            <option value="All">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)} style={filterStyle}>
            <option value="All">All priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} style={filterStyle}>
            <option value="due">Sort: Due date</option>
            <option value="priority">Sort: Priority</option>
            <option value="title">Sort: Title</option>
          </select>
        </div>
      )}

      {/* LIST */}
      <div className="bg-card border-soft shadow-float fade-in" style={{ borderRadius: 20, padding: "10px 4px" }}>
        {tasks.length === 0 ? (
          <p className="text-ink-3" style={{ fontSize: 12.5, padding: "24px 16px", textAlign: "center" }}>
            No tasks in this project yet.
          </p>
        ) : sorted.length === 0 ? (
          <p className="text-ink-3" style={{ fontSize: 12.5, padding: "24px 16px", textAlign: "center" }}>
            No tasks match your search or filters.
          </p>
        ) : (
          sorted.map((task, index) => (
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
              className="flex items-center"
              style={{
                gap: 14,
                padding: "12px 16px",
                borderTop: index === 0 ? "none" : "1px solid var(--border)",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  flex: "2 1 200px",
                  minWidth: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {task.title}
              </span>
              <div style={{ flex: "0.6 1 90px" }}>
                <Pill tone="surface">{task.status}</Pill>
              </div>
              <div style={{ flex: "0.5 1 80px" }}>
                <Pill tone={PRIORITY_TONE[task.priority]}>{task.priority}</Pill>
              </div>
              <span className="text-ink-3 hidden sm:block" style={{ flex: "0.7 1 100px", fontSize: 12 }}>
                {task.due}
              </span>
              <div style={{ flexShrink: 0 }}>{task.assignees.length > 0 && <AvatarStack people={task.assignees} />}</div>
            </div>
          ))
        )}
      </div>

      {/* TASK DETAILS DRAWER */}
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
    </div>
  );
}
