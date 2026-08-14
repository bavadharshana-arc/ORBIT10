import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  loadTasks,
  saveTasks,
  type Task,
} from "../data/taskData";

import { TaskContext } from "./taskContextValue";

interface TaskProviderProps {
  children: ReactNode;
}

export function TaskProvider({
  children,
}: TaskProviderProps) {
  const [
    tasks,
    setTasks,
  ] = useState<Task[]>(
    loadTasks
  );

  /*
   * Persist to localStorage whenever
   * tasks change (create, edit, status
   * change, drag-and-drop, etc.) so
   * state survives a refresh.
   */
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  const updateTask = (
    id: string,
    updates: Partial<Task>
  ) => {
    setTasks(
      (currentTasks) =>
        currentTasks.map(
          (task) =>
            task.id === id
              ? {
                  ...task,
                  ...updates,
                }
              : task
        )
    );
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        setTasks,
        updateTask,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}