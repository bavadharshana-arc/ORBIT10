import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { Task } from "../data/taskData";
import type { WorkspaceMemberRecord } from "../lib/workspaceApi";


export type TaskUpdateInput = Partial<Omit<Task, "dueDate">> & {
  dueDate?: string | null;
  /** Stage 2 (Real Task Assignees) — a real workspace-member userId, or null to unassign. Not part of Task itself (Task.assignee/.assignees are display-only TeamMember echoes); this is the one field updateTask actually persists as Task.assigneeId. */
  assigneeId?: string | null;
};

export interface TaskContextValue {
  tasks: Task[];

  setTasks: Dispatch<
    SetStateAction<Task[]>
  >;


  updateTask: (
    id: string,
    updates: TaskUpdateInput
  ) => void;


  deleteTask: (id: string) => void;

  /** Stage 2 (Real Task Assignees) — the real workspace member list TaskContext already fetches to resolve Task.assigneeId into a display TeamMember; exposed so every assignee picker (Tasks/Kanban/Timeline/Project tabs) can build its options from real users instead of the mock roster. */
  workspaceMembers: WorkspaceMemberRecord[];


  isLoading: boolean;

  error: string | null;


  refetch: () => void;
}


export const TaskContext =
  createContext<
    TaskContextValue | undefined
  >(undefined);


export function useTaskContext(): TaskContextValue {
  const context =
    useContext(TaskContext);

  if (!context) {
    throw new Error(
      "useTaskContext must be used inside TaskProvider"
    );
  }

  return context;
}