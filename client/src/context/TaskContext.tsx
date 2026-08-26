import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { getDueGroup, type Task } from "../data/taskData";
import type { Status, Priority } from "../data/taskData";
import type { TeamMember } from "../types/dashboard";
import { getInitials } from "../data/teamData";
import { useWorkspace } from "./workspaceContextValue";
import { useProjectContext } from "./projectContextValue";
import { ApiError } from "../lib/api";
import {
  listTasks,
  updateTask as updateTaskRequest,
  deleteTask as deleteTaskRequest,
  type TaskRecord,
  type TaskWriteInput,
} from "../lib/taskApi";
import { listWorkspaceMembers, type WorkspaceMemberRecord } from "../lib/workspaceApi";
import { TaskContext, type TaskUpdateInput } from "./taskContextValue";


const STATUS_VALUES: readonly Status[] = ["To Do", "In Progress", "Completed"];
const PRIORITY_VALUES: readonly Priority[] = ["Low", "Medium", "High"];


function clampStatus(value: string | null): Status {
  if (value && (STATUS_VALUES as readonly string[]).includes(value)) {
    return value as Status;
  }
  if (value === "In Review") return "In Progress";
  return "To Do";
}

function clampPriority(value: string | null): Priority {
  if (value && (PRIORITY_VALUES as readonly string[]).includes(value)) {
    return value as Priority;
  }
  return "High";
}

const NEUTRAL_AVATAR = { bg: "var(--surface-2)", fg: "var(--text)" };

function resolveAssignee(
  assigneeId: string | null,
  membersById: Map<string, WorkspaceMemberRecord>,
): TeamMember | undefined {
  if (!assigneeId) return undefined;
  const member = membersById.get(assigneeId);
  if (!member) return undefined;

  const name = member.user.name ?? member.user.email;
  return {
    initials: getInitials(name),
    bg: member.user.avatarBg ?? NEUTRAL_AVATAR.bg,
    fg: member.user.avatarFg ?? NEUTRAL_AVATAR.fg,
  };
}

function toDueDateString(iso: string | null): string | undefined {
  return iso ? iso.slice(0, 10) : undefined;
}

/** Parses a backend ISO timestamp (Task.createdAt/updatedAt) into epoch ms, or undefined if it's ever malformed — never a fallback "now", since that would silently fabricate activity that didn't happen. */
function parseTimestamp(iso: string): number | undefined {
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

function mapTaskRecordToTask(
  record: TaskRecord,
  projectName: string,
  membersById: Map<string, WorkspaceMemberRecord>,
): Task {
  const dueDate = toDueDateString(record.dueDate);
  const assignee = resolveAssignee(record.assigneeId, membersById);

  return {
    id: record.id,
    title: record.title,
    description: record.description ?? "",
    project: projectName,
    due: dueDate ?? "No due date",
    dueDate,
    dueGroup: getDueGroup(dueDate),
    priority: clampPriority(record.priority),
    status: clampStatus(record.status),
    assignee,
    assignees: assignee ? [assignee] : [],
    assigneeId: record.assigneeId ?? undefined,
    comments: [],
    activity: [],
    createdAt: parseTimestamp(record.createdAt),
    updatedAt: parseTimestamp(record.updatedAt),
  };
}

interface TaskProviderProps {
  children: ReactNode;
}

export function TaskProvider({ children }: TaskProviderProps) {
  const { currentWorkspaceId } = useWorkspace();
  const { projects } = useProjectContext();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const projectIdsKey = projects.map((project) => project.id).join(",");

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled || !currentWorkspaceId) {
          return null;
        }
        setIsLoading(true);
        setError(null);
        // Root cause of the "demo shows New Task/New Project, a real
        // account's brand-new workspace doesn't" discrepancy: this used
        // to skip the whole fetch — including listWorkspaceMembers —
        // whenever `projects.length === 0`. Workspace membership isn't
        // conditional on any project existing, but useWorkspaceRole()
        // (Kanban.tsx, Projects.tsx, Tasks.tsx) derives the signed-in
        // user's role from `workspaceMembers` here, so a workspace with
        // zero projects — every brand-new registered account's first
        // workspace, before seed.ts-style pre-populated demo data —
        // left even its real OWNER's role stuck at null, hiding "New
        // Task"/"New Project" (isWorkspaceManager(null) is false) at
        // exactly the moment a new owner needs them to create their
        // first project. The demo workspace never hit this because
        // seed.ts always gives it 3 projects up front. Members now
        // always fetch once a workspace is active; tasks still
        // correctly resolve to [] when there are no projects to map
        // (Promise.all([]) below, no behavior change there).
        return Promise.all([
          listWorkspaceMembers(currentWorkspaceId),
          Promise.all(projects.map((project) => listTasks(currentWorkspaceId, project.id))),
        ]);
      })
      .then((result) => {
        if (cancelled) return;

        if (!currentWorkspaceId || !result) {
          setTasks([]);
          setWorkspaceMembers([]);
          return;
        }

        const [members, perProjectTasks] = result;
        const membersById = new Map(members.map((member) => [member.userId, member] as const));

        const mapped: Task[] = [];
        perProjectTasks.forEach((records, index) => {
          const project = projects[index];
          if (!project) return;
          for (const record of records) {
            mapped.push(mapTaskRecordToTask(record, project.name, membersById));
          }
        });

        setTasks(mapped);
        setWorkspaceMembers(members);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setTasks([]);
        setWorkspaceMembers([]);
        setError(err instanceof ApiError ? err.message : "Couldn't load tasks. Try again in a moment.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `projects` is intentionally omitted — projectIdsKey is the
    // deliberate proxy for "did the project set actually change" (see
    // comment above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspaceId, projectIdsKey, reloadToken]);

  const refetch = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  
  async function updateTask(id: string, updates: TaskUpdateInput) {
    if (!currentWorkspaceId) {
      return;
    }

    const task = tasks.find((candidate) => candidate.id === id);
    if (!task) {
      return;
    }

    const project = projects.find((candidate) => candidate.name === task.project);
    if (!project) {
      return;
    }

    const input: TaskWriteInput = {};
    if (updates.title !== undefined) input.title = updates.title;
    if (updates.description !== undefined) input.description = updates.description;
    if (updates.status !== undefined) input.status = updates.status;
    if (updates.priority !== undefined) input.priority = updates.priority;
    if (updates.dueDate !== undefined) input.dueDate = updates.dueDate;
    // Stage 2 (Real Task Assignees) — the one field on Task with no
    // backend column of its own is assignee (assignee/assignees are a
    // display-only TeamMember, not an id); assigneeId is the real
    // column, sent through as-is (null unassigns).
    if (updates.assigneeId !== undefined) input.assigneeId = updates.assigneeId;

    if (Object.keys(input).length === 0) {

      setTasks((current) => current.map((candidate) => (candidate.id === id ? ({ ...candidate, ...updates } as Task) : candidate)));
      return;
    }

    try {
      const updated = await updateTaskRequest(currentWorkspaceId, project.id, id, input);
      const dueDate = toDueDateString(updated.dueDate);
      const membersById = new Map(workspaceMembers.map((member) => [member.userId, member] as const));
      const assignee = resolveAssignee(updated.assigneeId, membersById);

      setTasks((current) =>
        current.map((candidate) =>
          candidate.id === id
            ? {
                ...candidate,
                title: updated.title,
                description: updated.description ?? "",
                status: clampStatus(updated.status),
                priority: clampPriority(updated.priority),
                dueDate,
                due: dueDate ?? "No due date",
                dueGroup: getDueGroup(dueDate),
                // Only actually changes when assigneeId was part of this
                // update — re-resolving it unconditionally is still
                // correct either way, since it's derived straight from
                // the server's own response.
                assignee,
                assignees: assignee ? [assignee] : [],
                assigneeId: updated.assigneeId ?? undefined,
                // Refreshed straight from the server's own response, so a
                // status flip to Completed is reflected in the dashboard
                // chart immediately rather than waiting on a refetch.
                updatedAt: parseTimestamp(updated.updatedAt) ?? candidate.updatedAt,
              }
            : candidate,
        ),
      );
    } catch (error) {

      console.error("Couldn't save task:", error);
    }
  }

  async function deleteTask(id: string) {
    if (!currentWorkspaceId) {
      return;
    }

    const task = tasks.find((candidate) => candidate.id === id);
    if (!task) {
      return;
    }

    const project = projects.find((candidate) => candidate.name === task.project);
    if (!project) {
      setTasks((current) => current.filter((candidate) => candidate.id !== id));
      return;
    }

    try {
      await deleteTaskRequest(currentWorkspaceId, project.id, id);
      setTasks((current) => current.filter((candidate) => candidate.id !== id));
    } catch (error) {
      console.error("Couldn't delete task:", error);
    }
  }

  return (
    <TaskContext.Provider value={{ tasks, setTasks, updateTask, deleteTask, workspaceMembers, isLoading, error, refetch }}>
      {children}
    </TaskContext.Provider>
  );
}
