import type { TeamMember } from "../types/dashboard";
import type { WorkspaceActor } from "../types/workspace";


export type Status =
  | "To Do"
  | "In Progress"
  | "Completed";


export type Priority =
  | "Low"
  | "Medium"
  | "High";



export interface TaskComment {
  id: string;
  text: string;
  author: WorkspaceActor;
  createdAt: number;
  editedAt?: number;
}



export interface TaskActivityEntry {
  id: string;
  text: string;
  timestamp: string;
}


export type DueGroup =
  | "Overdue"
  | "Today"
  | "Tomorrow"
  | "This Week"
  | "Later"
  | "No Due Date";



export interface Task {
  id: string;
  title: string;
  description: string;
  project: string;
  due: string;
  dueDate?: string;
  startDate?: string;
  isMilestone?: boolean;
  dueGroup: DueGroup;
  priority: Priority;
  status: Status;
  assignee?: TeamMember;
  assignees: TeamMember[];
  /** Real assignee userId, straight from the backend's Task.assigneeId column (Stage 2) — `assignee`/`assignees` are display-only and carry no id, so this is the one place a caller can get a real, sendable recipient/actor id off a Task. Undefined when unassigned. */
  assigneeId?: string;
  comments: TaskComment[];
  activity: TaskActivityEntry[];
  /** Epoch ms, straight from the backend's Task.createdAt column (TaskContext.mapTaskRecordToTask). Powers the dashboard's "tasks created vs completed" chart. Undefined on tasks built locally by an optimistic create (Kanban/Tasks/ProjectWorkspace "New Task") until the next refetch pulls the real row — same absent-until-refetch caveat as Project.createdAt. */
  createdAt?: number;
  /** Epoch ms, straight from the backend's Task.updatedAt column — refreshed on every successful save (TaskContext.updateTask). Used as the best-effort "completed on" signal when the task's current status is Completed, since the backend doesn't track a dedicated completedAt (see getTaskCompletedAt in workspaceData.ts). Same absent-until-refetch caveat as `createdAt`. */
  updatedAt?: number;
}


// initialTasks/loadTasks/saveTasks (localStorage-backed mock task list,
// plus their toLocalDateString/getDateOffset/generateTaskId/
// normalizeComment helpers and TASK_STORAGE_KEY/TASK_SEED_VERSION*
// constants) were removed in the Phase 19 Frontend Integration audit fix
// (Priority 7) — Task data is fully real via TaskContext/lib/taskApi.ts
// (see TaskContext.tsx's mapTaskRecordToTask), and nothing here had any
// remaining callers. Confirmed via grep before removal.


export function getDueGroup(
  dueDate?: string
): DueGroup {
  if (!dueDate) {
    return "No Due Date";
  }

  const [year, month, day] =
    dueDate
      .split("-")
      .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return "No Due Date";
  }

  const target =
    new Date(
      year,
      month - 1,
      day
    );

  const today =
    new Date();

  const todayStart =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

  const tomorrow =
    new Date(
      todayStart
    );

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  const difference =
    Math.round(
      (
        target.getTime() -
        todayStart.getTime()
      ) /
        (1000 *
          60 *
          60 *
          24)
    );


  if (
    target <
    todayStart
  ) {
    return "Overdue";
  }


  if (
    target.getTime() ===
    todayStart.getTime()
  ) {
    return "Today";
  }

  if (
    target.getTime() ===
    tomorrow.getTime()
  ) {
    return "Tomorrow";
  }


  if (
    difference <= 7
  ) {
    return "This Week";
  }


  return "Later";
}



/**
 * "Aug 16"-style short label for a task's due date, falling back to
 * `fallback` (e.g. Task.due, or a static "No due date") when there's no
 * parseable dueDate. Pulled out as a shared pure helper — Tasks.tsx's
 * TaskRow and the Tasks page's UpcomingDeadlinesCard both need the exact
 * same formatting, and previously only the former had it (private,
 * unexported).
 */
export function formatDueLabel(
  dueDate: string | undefined,
  fallback: string
): string {
  if (dueDate) {
    const date = new Date(`${dueDate}T00:00:00`);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  }

  return fallback;
}

export function getUpcomingTasks(
  tasks: Task[],
  limit?: number
): Task[] {
  const upcoming = tasks
    .filter((task) => {
      if (task.status === "Completed") return false;

      const group = getDueGroup(task.dueDate);
      return (
        group === "Today" ||
        group === "Tomorrow" ||
        group === "This Week"
      );
    })
    .sort(
      (a, b) =>
        (a.dueDate ?? "").localeCompare(b.dueDate ?? "")
    );

  return limit !== undefined
    ? upcoming.slice(0, limit)
    : upcoming;
}
