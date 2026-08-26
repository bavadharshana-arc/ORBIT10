import { createContext, useContext } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Project } from "../types/dashboard";
import type { ProjectMemberRecord, ProjectMemberRole } from "../lib/projectMemberApi";

export interface ProjectContextValue {
  projects: Project[];
  setProjects: Dispatch<SetStateAction<Project[]>>;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;

  /** Real ProjectMember rosters, keyed by project id — the single source of truth for project membership (see ProjectContext.tsx's doc comment). */
  projectMembersByProjectId: Record<string, ProjectMemberRecord[]>;
  projectMembersLoading: boolean;
  projectMembersError: string | null;
  addProjectMember: (projectId: string, userId: string, role: ProjectMemberRole) => Promise<ProjectMemberRecord>;
  removeProjectMember: (projectId: string, memberId: string) => Promise<void>;
  updateProjectMemberRole: (projectId: string, memberId: string, role: ProjectMemberRole) => Promise<ProjectMemberRecord>;
}

export const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);
export function useProjectContext(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used inside ProjectProvider");
  }
  return context;
}
