import { useOutletContext } from "react-router-dom";
import type { Project, ProjectMilestone, ProjectObjective, ProjectPermission } from "../types/dashboard";
import type { Task } from "../data/taskData";

export interface ProjectWorkspaceContextValue {
  project: Project;
  projectTasks: Task[];
  isArchived: boolean;
  permission: ProjectPermission;
  /** Real WorkspaceRole OWNER/ADMIN — governs the project *entity* itself (edit/duplicate/archive/delete) and task creation, both workspace-role-gated on the backend rather than project-role-gated. See ProjectWorkspace.tsx's doc comment. */
  canManageProjectEntity: boolean;

  openNewTaskDrawer: () => void;
  openEditDrawer: () => void;
  openDeleteModal: () => void;
  duplicateProject: () => void;
  archiveProject: () => void;

  objectives: ProjectObjective[];
  milestones: ProjectMilestone[];
  objectivesLoading: boolean;
  objectivesError: string | null;
  addObjective: (text: string) => void;
  toggleObjective: (id: string) => void;
  removeObjective: (id: string) => void;
  addMilestone: (title: string) => void;
  toggleMilestone: (id: string) => void;
  removeMilestone: (id: string) => void;
}

export function useProjectWorkspace(): ProjectWorkspaceContextValue {
  return useOutletContext<ProjectWorkspaceContextValue>();
}
