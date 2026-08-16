import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { useAuth } from "./AuthContext";
import { ApiError } from "../lib/api";
import { listMyWorkspaces, type WorkspaceRecord } from "../lib/workspaceApi";
import { WorkspaceContext, type WorkspaceContextValue } from "./workspaceContextValue";



const CURRENT_WORKSPACE_STORAGE_KEY = "orbit-current-workspace-id";

function readStoredWorkspaceId(): string | null {
  try {
    return localStorage.getItem(CURRENT_WORKSPACE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredWorkspaceId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(CURRENT_WORKSPACE_STORAGE_KEY);
    }
  } catch {
    // Storage unavailable (e.g. private browsing) — selection just won't survive a refresh.
  }
}

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { isAuthenticated, isInitializing, user } = useAuth();

  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    // Auth hasn't settled yet (session restore in flight) — wait rather
    // than fetching with a token that might not exist yet or is about
    // to be replaced.
    if (isInitializing) {
      return;
    }

    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (cancelled || !isAuthenticated) {
          return null;
        }
        setIsLoading(true);
        setError(null);
        return listMyWorkspaces();
      })
      .then((fetched) => {
        if (cancelled) return;

        if (!isAuthenticated || !fetched) {
          
          setWorkspaces([]);
          setCurrentWorkspaceId(null);
          writeStoredWorkspaceId(null);
          return;
        }

        setWorkspaces(fetched);

        const stored = readStoredWorkspaceId();
        const stillValid = stored !== null && fetched.some((workspace) => workspace.id === stored);
        const resolved = stillValid ? stored : (fetched[0]?.id ?? null);

        setCurrentWorkspaceId(resolved);
        writeStoredWorkspaceId(resolved);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setWorkspaces([]);
        setCurrentWorkspaceId(null);
        setError(err instanceof ApiError ? err.message : "Couldn't load your workspaces. Try again in a moment.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // user?.id: a different user logging in on the same browser (without
    // a full page reload) re-fetches instead of reusing the previous
    // user's workspace list.
  }, [isAuthenticated, isInitializing, user?.id, reloadToken]);

  const selectWorkspace = useCallback((workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId);
    writeStoredWorkspaceId(workspaceId);
  }, []);

  const refetch = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  const currentWorkspace = workspaces.find((workspace) => workspace.id === currentWorkspaceId) ?? null;

  const value: WorkspaceContextValue = {
    workspaces,
    currentWorkspace,
    currentWorkspaceId,
    isLoading,
    error,
    selectWorkspace,
    refetch,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
