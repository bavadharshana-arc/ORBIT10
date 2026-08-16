import { apiDelete, apiGet, apiPost } from "./api";

/* ============================================================
   PROJECT FILE API (Phase 28)

   Mirrors server/src/services/projectFile.service.ts's return shape —
   metadata only. The backend never stores file bytes (Phase 15
   approved scope: "no upload/download handling") and this milestone
   doesn't invent one — see ProjectFilesTab.tsx for how the in-browser
   preview/download UX is preserved without pretending real binary
   storage exists.
============================================================ */

export type FileKind = "document" | "image" | "pdf" | "spreadsheet" | "other";

export interface ProjectFileApiRecord {
  id: string;
  projectId: string;
  name: string;
  extension: string;
  kind: FileKind;
  sizeBytes: number;
  folder: string;
  uploaderId: string | null;
  createdAt: string;
}

export interface CreateFileInput {
  name: string;
  extension: string;
  kind: FileKind;
  sizeBytes: number;
  folder: string;
}

const filesPath = (workspaceId: string, projectId: string) => `/workspaces/${workspaceId}/projects/${projectId}/files`;

export function listFiles(workspaceId: string, projectId: string): Promise<ProjectFileApiRecord[]> {
  return apiGet<ProjectFileApiRecord[]>(filesPath(workspaceId, projectId));
}

export function createFile(
  workspaceId: string,
  projectId: string,
  input: CreateFileInput,
): Promise<ProjectFileApiRecord> {
  return apiPost<ProjectFileApiRecord>(filesPath(workspaceId, projectId), input);
}

export function deleteFile(workspaceId: string, projectId: string, fileId: string): Promise<void> {
  return apiDelete(`${filesPath(workspaceId, projectId)}/${fileId}`);
}
