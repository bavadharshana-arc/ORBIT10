import { createContext, useContext } from "react";
import type { WorkspaceRecord } from "../lib/workspaceApi";


export interface WorkspaceContextValue {
  
  workspaces: WorkspaceRecord[];
 
  currentWorkspace: WorkspaceRecord | null;
  
  currentWorkspaceId: string | null;
  
  isLoading: boolean;
  error: string | null;
  
  selectWorkspace: (workspaceId: string) => void;
  
  refetch: () => void;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }
  return context;
}
