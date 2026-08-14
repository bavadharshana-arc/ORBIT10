import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Project } from "../types/dashboard";
import { loadProjects, saveProjects } from "../data/projectData";
import { ProjectContext } from "./projectContextValue";

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [projects, setProjects] = useState<Project[]>(loadProjects);

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  return <ProjectContext.Provider value={{ projects, setProjects }}>{children}</ProjectContext.Provider>;
}
