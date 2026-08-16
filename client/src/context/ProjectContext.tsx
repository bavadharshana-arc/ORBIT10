import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Project } from "../types/dashboard";
import { useWorkspace } from "./workspaceContextValue";
import { ApiError } from "../lib/api";
import { listProjects, type ProjectRecord } from "../lib/projectApi";
import { ProjectContext } from "./projectContextValue";



function mapProjectRecordToProject(record: ProjectRecord): Project {
  return {
    id: record.id,
    name: record.name,
    tag: "",
    progress: 0,
    tasks: "0 / 0 tasks",
    due: "No due date",
    people: [],
    description: record.description ?? undefined,
    createdAt: record.createdAt,
  };
}

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const { currentWorkspaceId } = useWorkspace();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled || !currentWorkspaceId) {
          return null;
        }
        setIsLoading(true);
        setError(null);
        return listProjects(currentWorkspaceId);
      })
      .then((fetched) => {
        if (cancelled) return;

        if (!currentWorkspaceId || !fetched) {
    
          setProjects([]);
          return;
        }

        setProjects(fetched.map(mapProjectRecordToProject));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setProjects([]);
        setError(err instanceof ApiError ? err.message : "Couldn't load projects. Try again in a moment.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentWorkspaceId, reloadToken]);

  const refetch = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  return (
    <ProjectContext.Provider value={{ projects, setProjects, isLoading, error, refetch }}>
      {children}
    </ProjectContext.Provider>
  );
}
