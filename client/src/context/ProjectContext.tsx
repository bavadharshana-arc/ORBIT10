import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Project } from "../types/dashboard";
import { useWorkspace } from "./workspaceContextValue";
import { ApiError } from "../lib/api";
import { listProjects, type ProjectRecord } from "../lib/projectApi";
import {
  listProjectMembers,
  addProjectMember as addProjectMemberRequest,
  removeProjectMember as removeProjectMemberRequest,
  updateProjectMemberRole as updateProjectMemberRoleRequest,
  type ProjectMemberRecord,
  type ProjectMemberRole,
} from "../lib/projectMemberApi";
import { formatProjectDue } from "../data/projectData";
import { ProjectContext } from "./projectContextValue";



// Phase 19 Frontend Integration audit fix (Priority 8): tag/color/
// startDate/dueDate are real, persisted columns (see lib/projectApi.ts's
// ProjectRecord) — mapped straight from the record instead of always
// resetting to empty/zero. Project membership ("people" in the old,
// removed local-only field) is handled separately below — real
// ProjectMember rows, not a field on Project itself.
function mapProjectRecordToProject(record: ProjectRecord): Project {
  const dueDate = record.dueDate?.slice(0, 10);
  return {
    id: record.id,
    name: record.name,
    tag: record.tag ?? "",
    progress: 0,
    tasks: "0 / 0 tasks",
    due: dueDate ? formatProjectDue(dueDate) : "No due date",
    description: record.description ?? undefined,
    color: record.color ?? undefined,
    startDate: record.startDate?.slice(0, 10),
    dueDate,
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

  // Phase 19 Frontend Integration follow-up (Persist Project people):
  // the real roster for every loaded project, keyed by project id — the
  // single source of truth every project-membership UI reads from
  // (Projects.tsx's cards, ProjectsWidget.tsx, ProjectWorkspace.tsx's
  // header/tabs), replacing the old local-only Project.people field.
  // Fetched once per project *set* (see projectIdsKey below, same
  // "refetch only when the set of ids actually changed" convention
  // TaskContext.tsx already uses) rather than on every project edit.
  const [projectMembersByProjectId, setProjectMembersByProjectId] = useState<Record<string, ProjectMemberRecord[]>>({});
  const [projectMembersLoading, setProjectMembersLoading] = useState(false);
  const [projectMembersError, setProjectMembersError] = useState<string | null>(null);

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

  const projectIdsKey = projects.map((project) => project.id).join(",");

  useEffect(() => {
    let cancelled = false;
    const workspaceId = currentWorkspaceId;

    Promise.resolve()
      .then(() => {
        if (cancelled || !workspaceId || projects.length === 0) {
          return null;
        }
        setProjectMembersLoading(true);
        setProjectMembersError(null);
        return Promise.all(projects.map((project) => listProjectMembers(workspaceId, project.id)));
      })
      .then((results) => {
        if (cancelled) return;

        if (!workspaceId || projects.length === 0 || !results) {
          setProjectMembersByProjectId({});
          return;
        }

        const next: Record<string, ProjectMemberRecord[]> = {};
        results.forEach((records, index) => {
          const project = projects[index];
          if (project) next[project.id] = records;
        });
        setProjectMembersByProjectId(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setProjectMembersByProjectId({});
        setProjectMembersError(err instanceof ApiError ? err.message : "Couldn't load project members. Try again in a moment.");
      })
      .finally(() => {
        if (!cancelled) setProjectMembersLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `projects` is intentionally omitted — projectIdsKey is the
    // deliberate proxy for "did the project set actually change" (same
    // reasoning as TaskContext.tsx's identical pattern).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspaceId, projectIdsKey]);

  const refetch = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  const addProjectMember = useCallback(
    async (projectId: string, userId: string, role: ProjectMemberRole): Promise<ProjectMemberRecord> => {
      if (!currentWorkspaceId) {
        throw new Error("No current workspace");
      }
      const record = await addProjectMemberRequest(currentWorkspaceId, projectId, userId, role);
      setProjectMembersByProjectId((current) => ({
        ...current,
        [projectId]: [...(current[projectId] ?? []), record],
      }));
      return record;
    },
    [currentWorkspaceId],
  );

  const removeProjectMember = useCallback(
    async (projectId: string, memberId: string): Promise<void> => {
      if (!currentWorkspaceId) {
        throw new Error("No current workspace");
      }
      await removeProjectMemberRequest(currentWorkspaceId, projectId, memberId);
      setProjectMembersByProjectId((current) => ({
        ...current,
        [projectId]: (current[projectId] ?? []).filter((record) => record.id !== memberId),
      }));
    },
    [currentWorkspaceId],
  );

  const updateProjectMemberRole = useCallback(
    async (projectId: string, memberId: string, role: ProjectMemberRole): Promise<ProjectMemberRecord> => {
      if (!currentWorkspaceId) {
        throw new Error("No current workspace");
      }
      const record = await updateProjectMemberRoleRequest(currentWorkspaceId, projectId, memberId, role);
      setProjectMembersByProjectId((current) => ({
        ...current,
        [projectId]: (current[projectId] ?? []).map((candidate) => (candidate.id === memberId ? record : candidate)),
      }));
      return record;
    },
    [currentWorkspaceId],
  );

  return (
    <ProjectContext.Provider
      value={{
        projects,
        setProjects,
        isLoading,
        error,
        refetch,
        projectMembersByProjectId,
        projectMembersLoading,
        projectMembersError,
        addProjectMember,
        removeProjectMember,
        updateProjectMemberRole,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}
