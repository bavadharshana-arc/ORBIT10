import { useOutletContext } from "react-router-dom";
import type { Project, ProjectPermission } from "../types/dashboard";
import type { Task } from "../data/taskData";

/**
 * Shared by every nested /projects/:projectId/* route. ProjectWorkspace
 * (the layout route) computes `project`/`projectTasks` once from the
 * existing TaskContext/ProjectContext and hands them down via
 * <Outlet context={...} /> — every tab reads from here instead of
 * re-deriving its own copy, so there's exactly one source of truth.
 */
export interface ProjectWorkspaceContextValue {
  project: Project;
  projectTasks: Task[];
  isArchived: boolean;
  /** The current user's resolved permission on this project (getProjectPermission()'s result). Tabs gate their own actions by passing this into canEditProjectContent()/canCommentOnProject()/canManageProject() from workspaceData.ts rather than comparing it directly. */
  permission: ProjectPermission;
  /** Opens the "+ New Task" drawer, pre-locked to this project. */
  openNewTaskDrawer: () => void;
  openEditDrawer: () => void;
  openDeleteModal: () => void;
  duplicateProject: () => void;
  archiveProject: () => void;
}

export function useProjectWorkspace(): ProjectWorkspaceContextValue {
  return useOutletContext<ProjectWorkspaceContextValue>();
}
