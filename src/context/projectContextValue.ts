import { createContext, useContext } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Project } from "../types/dashboard";

export interface ProjectContextValue {
  projects: Project[];
  setProjects: Dispatch<SetStateAction<Project[]>>;
}

export const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export function useProjectContext(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used inside ProjectProvider");
  }
  return context;
}
