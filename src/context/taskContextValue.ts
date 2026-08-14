import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { Task } from "../data/taskData";

/* ============================================================
   TASK CONTEXT VALUE
============================================================ */

export interface TaskContextValue {
  tasks: Task[];

  setTasks: Dispatch<
    SetStateAction<Task[]>
  >;

  updateTask: (
    id: string,
    updates: Partial<Task>
  ) => void;
}

/* ============================================================
   CONTEXT
============================================================ */

export const TaskContext =
  createContext<
    TaskContextValue | undefined
  >(undefined);

/* ============================================================
   HOOK
============================================================ */

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