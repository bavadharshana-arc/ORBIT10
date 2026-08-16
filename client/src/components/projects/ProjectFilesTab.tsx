import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  UploadCloud,
  Search,
  LayoutGrid,
  Rows3,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileType2,
  File as FileIcon,
  Download,
  Eye,
  Trash2,
  Inbox,
  X,
  Folder,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { FileKind, ProjectFileRecord } from "../../types/workspace";
import type { WorkspaceActor } from "../../types/workspace";
import { loadMembers, getInitials } from "../../data/teamData";
import { useProjectWorkspace } from "../../context/projectWorkspaceContext";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/workspaceContextValue";
import {
  resolveCurrentActor,
  inferFileKind,
  formatFileSize,
  FILE_KIND_LABEL,
  DEFAULT_FOLDER,
  setSessionObjectUrl,
  getSessionObjectUrl,
  clearSessionObjectUrl,
  canEditProjectContent,
} from "../../data/workspaceData";
import { ApiError } from "../../lib/api";
import {
  listFiles as listFilesRequest,
  createFile as createFileRequest,
  deleteFile as deleteFileRequest,
  type ProjectFileApiRecord,
} from "../../lib/fileApi";
import { createActivityEvent } from "../../lib/activityApi";
import { listWorkspaceMembers, type WorkspaceMemberRecord } from "../../lib/workspaceApi";
import { Avatar } from "../ui/Avatar";
import { Pill } from "../ui/Pill";

const KIND_ICON: Record<FileKind, LucideIcon> = {
  document: FileText,
  pdf: FileType2,
  image: FileImage,
  spreadsheet: FileSpreadsheet,
  other: FileIcon,
};

type ViewMode = "list" | "grid";

/* ============================================================
   PREVIEW MODAL
============================================================ */

function FilePreviewModal({ file, onClose, onDownload }: { file: ProjectFileRecord; onClose: () => void; onDownload: () => void }) {
  const Icon = KIND_ICON[file.kind];
  const objectUrl = getSessionObjectUrl(file.id);
  const canShowImage = file.kind === "image" && objectUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={`Preview ${file.name}`}>
      <button type="button" aria-label="Close preview" onClick={onClose} className="absolute inset-0 h-full w-full cursor-default bg-black/40 backdrop-blur-[2px]" />
      <div className="fade-in shadow-float-lg bg-card" style={{ position: "relative", width: "100%", maxWidth: 480, margin: 20, borderRadius: 20, padding: 22 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <span className="text-ink-3" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>File preview</span>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: "none", background: "var(--surface-2)", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-2)" }}>
            <X size={15} />
          </button>
        </div>

        <div
          className="bg-surface-2"
          style={{ borderRadius: 14, height: 220, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, overflow: "hidden" }}
        >
          {canShowImage ? (
            <img src={objectUrl} alt={file.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          ) : (
            <div className="flex flex-col items-center" style={{ gap: 8 }}>
              <Icon size={40} strokeWidth={1.4} color="var(--blue-dark)" />
              <span className="text-ink-3" style={{ fontSize: 11 }}>
                {objectUrl ? "Preview not available for this file type" : "Demo file — no bytes to preview"}
              </span>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 650, color: "var(--text)", wordBreak: "break-word" }}>
            {file.name}.{file.extension}
          </div>
          <div className="text-ink-3" style={{ fontSize: 12, marginTop: 4 }}>
            {formatFileSize(file.sizeBytes)} &middot; {FILE_KIND_LABEL[file.kind]} &middot; {file.folder}
          </div>
        </div>

        <div className="flex items-center" style={{ gap: 10 }}>
          <Avatar initials={file.uploadedBy.initials} bg={file.uploadedBy.bg} fg={file.uploadedBy.fg} size={26} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{file.uploadedBy.name}</div>
            <div className="text-ink-3" style={{ fontSize: 10.5 }}>{new Date(file.uploadedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
          </div>
          <button
            type="button"
            onClick={onDownload}
            className="lift"
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, background: "var(--text)", color: "var(--surface)", border: "none", borderRadius: 11, padding: "9px 15px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            <Download size={13} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ROWS / CARDS
============================================================ */

interface FileItemProps {
  file: ProjectFileRecord;
  canEdit: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

function FileRow({ file, canEdit, onPreview, onDownload, onDelete }: FileItemProps) {
  const Icon = KIND_ICON[file.kind];
  return (
    <div className="flex items-center" style={{ gap: 14, padding: "11px 14px", borderTop: "1px solid var(--border)" }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--surface-2)", color: "var(--blue-dark)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={15} strokeWidth={1.8} />
      </div>
      <div style={{ flex: "2 1 220px", minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
        <div className="text-ink-3" style={{ fontSize: 11 }}>.{file.extension} &middot; {formatFileSize(file.sizeBytes)}</div>
      </div>
      <div className="hidden sm:block" style={{ flex: "0.7 1 100px" }}>
        <Pill tone="surface">{file.folder}</Pill>
      </div>
      <div className="hidden md:flex items-center" style={{ gap: 8, flex: "1 1 150px", minWidth: 0 }}>
        <Avatar initials={file.uploadedBy.initials} bg={file.uploadedBy.bg} fg={file.uploadedBy.fg} size={22} />
        <span style={{ fontSize: 11.5, color: "var(--text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.uploadedBy.name}</span>
      </div>
      <span className="hidden lg:block text-ink-3" style={{ flex: "0.6 1 90px", fontSize: 11.5 }}>
        {new Date(file.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </span>
      <div className="flex items-center" style={{ gap: 4, flexShrink: 0 }}>
        <button type="button" aria-label="Preview" onClick={onPreview} style={iconBtn}><Eye size={13} strokeWidth={1.8} /></button>
        <button type="button" aria-label="Download" onClick={onDownload} style={iconBtn}><Download size={13} strokeWidth={1.8} /></button>
        {canEdit && <button type="button" aria-label="Delete" onClick={onDelete} style={iconBtn}><Trash2 size={13} strokeWidth={1.8} /></button>}
      </div>
    </div>
  );
}

function FileCard({ file, canEdit, onPreview, onDownload, onDelete }: FileItemProps) {
  const Icon = KIND_ICON[file.kind];
  return (
    <div className="bg-card border-soft shadow-float lift fade-in" style={{ borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="flex items-start justify-between">
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--surface-2)", color: "var(--blue-dark)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} strokeWidth={1.8} />
        </div>
        <Pill tone="surface">{file.folder}</Pill>
      </div>
      <div style={{ minWidth: 0 }} onClick={onPreview} role="button" tabIndex={0}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer" }}>{file.name}</div>
        <div className="text-ink-3" style={{ fontSize: 11, marginTop: 3 }}>{formatFileSize(file.sizeBytes)}</div>
      </div>
      <div className="flex items-center" style={{ gap: 7, marginTop: "auto" }}>
        <Avatar initials={file.uploadedBy.initials} bg={file.uploadedBy.bg} fg={file.uploadedBy.fg} size={20} />
        <span className="text-ink-3" style={{ fontSize: 11, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.uploadedBy.name}</span>
        <button type="button" aria-label="Download" onClick={onDownload} style={iconBtn}><Download size={12} strokeWidth={1.8} /></button>
        {canEdit && <button type="button" aria-label="Delete" onClick={onDelete} style={iconBtn}><Trash2 size={12} strokeWidth={1.8} /></button>}
      </div>
    </div>
  );
}

const iconBtn = {
  width: 26,
  height: 26,
  borderRadius: 8,
  border: "none",
  background: "var(--surface-2)",
  color: "var(--text-2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
} as const;

const NEUTRAL_AVATAR = { bg: "#E9EDF2", fg: "#20242B" };

/** Resolves a real uploaderId into a WorkspaceActor (real name/initials/avatar) — same pattern as TaskContext.tsx's assignee resolution (Phase 26) and useTaskCommentHandlers.ts's comment authors (Phase 27). */
function resolveUploader(
  uploaderId: string | null,
  membersById: Map<string, WorkspaceMemberRecord>,
  fallback: WorkspaceActor,
): WorkspaceActor {
  if (!uploaderId) return fallback;
  const member = membersById.get(uploaderId);
  if (!member) return fallback;
  const name = member.user.name ?? member.user.email;
  return {
    id: uploaderId,
    name,
    initials: getInitials(name),
    bg: member.user.avatarBg ?? NEUTRAL_AVATAR.bg,
    fg: member.user.avatarFg ?? NEUTRAL_AVATAR.fg,
  };
}

function mapFileRecord(
  record: ProjectFileApiRecord,
  membersById: Map<string, WorkspaceMemberRecord>,
  fallbackUploader: WorkspaceActor,
): ProjectFileRecord {
  return {
    id: record.id,
    projectId: record.projectId,
    name: record.name,
    extension: record.extension,
    kind: record.kind,
    sizeBytes: record.sizeBytes,
    folder: record.folder,
    uploadedBy: resolveUploader(record.uploaderId, membersById, fallbackUploader),
    uploadedAt: new Date(record.createdAt).getTime(),
  };
}

/* ============================================================
   FILES TAB
============================================================ */

export function ProjectFilesTab() {
  const { project, permission } = useProjectWorkspace();
  const canEdit = canEditProjectContent(permission);
  const members = useMemo(() => loadMembers(), []);
  const { user } = useAuth();
  const currentActor = useMemo(() => resolveCurrentActor(members, user), [members, user]);
  const { currentWorkspaceId } = useWorkspace();

  const [files, setFiles] = useState<ProjectFileRecord[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentWorkspaceId) {
      return;
    }

    let cancelled = false;
    const workspaceId = currentWorkspaceId;
    const projectId = project.id;

    // Deferred into the promise chain — never synchronous in the effect
    // body — same reasoning as every other Phase 24–27 fetch effect.
    Promise.resolve()
      .then(() => {
        if (cancelled) return null;
        setFilesLoading(true);
        setFilesError(null);
        return Promise.all([listWorkspaceMembers(workspaceId), listFilesRequest(workspaceId, projectId)]);
      })
      .then((result) => {
        if (cancelled || !result) return;
        const [workspaceMembers, records] = result;
        const membersById = new Map(workspaceMembers.map((member) => [member.userId, member] as const));
        setFiles(records.map((record) => mapFileRecord(record, membersById, currentActor)));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFiles([]);
        setFilesError(err instanceof ApiError ? err.message : "Couldn't load files. Try again in a moment.");
      })
      .finally(() => {
        if (!cancelled) setFilesLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // currentActor intentionally omitted — it's only a display fallback,
    // not a refetch trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspaceId, project.id]);

  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<ProjectFileRecord | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const folders = useMemo(() => {
    const set = new Set(files.map((file) => file.folder));
    return Array.from(set).sort();
  }, [files]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return files
      .filter((file) => (folderFilter === "all" ? true : file.folder === folderFilter))
      .filter((file) => query === "" || file.name.toLowerCase().includes(query))
      .sort((a, b) => b.uploadedAt - a.uploadedAt);
  }, [files, folderFilter, search]);

  async function processFiles(fileList: FileList) {
    if (!canEdit || !currentWorkspaceId) return;
    const folder = folderFilter === "all" ? DEFAULT_FOLDER : folderFilter;

    setMutationError(null);

    // Metadata-only, per file — the backend never stores bytes (Phase 15
    // approved scope), so only name/extension/kind/size/folder are sent.
    // The real browser File object is kept just long enough to build an
    // in-session object URL for preview/download (setSessionObjectUrl,
    // unchanged) — never persisted anywhere, including localStorage.
    for (const file of Array.from(fileList)) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      const name = file.name.replace(/\.[^.]+$/, "");
      const kind = inferFileKind(extension);

      try {
        const record = await createFileRequest(currentWorkspaceId, project.id, {
          name,
          extension,
          kind,
          sizeBytes: file.size,
          folder,
        });

        const objectUrl = URL.createObjectURL(file);
        setSessionObjectUrl(record.id, objectUrl);

        const newFile: ProjectFileRecord = {
          id: record.id,
          projectId: record.projectId,
          name: record.name,
          extension: record.extension,
          kind: record.kind,
          sizeBytes: record.sizeBytes,
          folder: record.folder,
          uploadedBy: currentActor,
          uploadedAt: new Date(record.createdAt).getTime(),
        };

        setFiles((current) => [newFile, ...current]);

        if (currentWorkspaceId) {
          // Best-effort, real activity log entry — failure here shouldn't
          // undo or block the upload that already succeeded above.
          createActivityEvent(currentWorkspaceId, project.id, {
            type: "file_uploaded",
            text: `${currentActor.name} uploaded "${newFile.name}.${newFile.extension}"`,
            actorId: user?.id,
          }).catch((err: unknown) => console.error("Couldn't log file-upload activity:", err));
        }

        // Stage 4 (Real Notifications): no notifyFileUploaded call here —
        // there's no real endpoint yet to list a project's *members* (as
        // opposed to its files), so there's no real audience to target
        // without over-broadcasting to the whole workspace. See
        // systemNotifications.ts's doc comment on notifyFileUploaded.
      } catch (error) {
        setMutationError(error instanceof ApiError ? error.message : `Couldn't upload "${file.name}". Try again.`);
      }
    }
  }

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files;
    if (selected && selected.length > 0) processFiles(selected);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer.files;
    if (dropped && dropped.length > 0) processFiles(dropped);
  }

  function handleDownload(file: ProjectFileRecord) {
    const url = getSessionObjectUrl(file.id);
    const link = document.createElement("a");
    if (url) {
      link.href = url;
      link.download = `${file.name}.${file.extension}`;
      link.click();
      return;
    }
    const blob = new Blob([`This is a demo placeholder for "${file.name}.${file.extension}" (${formatFileSize(file.sizeBytes)}).`], { type: "text/plain" });
    const fallbackUrl = URL.createObjectURL(blob);
    link.href = fallbackUrl;
    link.download = `${file.name}.${file.extension}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(fallbackUrl), 1000);
  }

  async function handleDelete(id: string) {
    if (!canEdit || !currentWorkspaceId) return;

    setMutationError(null);

    try {
      await deleteFileRequest(currentWorkspaceId, project.id, id);
      setFiles((current) => current.filter((file) => file.id !== id));
      setPreviewFile((current) => (current?.id === id ? null : current));
      clearSessionObjectUrl(id);
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : "Couldn't delete the file. Try again.");
    }
  }

  return (
    <div className="fade-in flex flex-col" style={{ gap: 16 }}>
      <input ref={fileInputRef} type="file" multiple onChange={handleFilesSelected} style={{ display: "none" }} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display" style={{ fontSize: 17, fontWeight: 560, color: "var(--text)", marginBottom: 4 }}>Files</h2>
          <p className="text-ink-2" style={{ fontSize: 12.5 }}>Documents and assets shared inside this project.</p>
        </div>
      </div>

      {mutationError && <p style={{ margin: 0, fontSize: 12.5, color: "#B3564B" }}>{mutationError}</p>}

      {canEdit && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && fileInputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center"
          style={{
            border: `1.5px dashed ${isDragging ? "var(--blue-dark)" : "var(--blue)"}`,
            borderRadius: 16,
            padding: "18px 24px",
            gap: 8,
            textAlign: "center",
            cursor: "pointer",
            background: isDragging ? "var(--surface-2)" : "var(--card)",
            transition: "background 160ms ease, border-color 160ms ease",
          }}
        >
          <div className="flex items-center" style={{ gap: 8 }}>
            <UploadCloud size={16} strokeWidth={1.8} color="var(--blue-dark)" />
            <span style={{ fontSize: 13, fontWeight: 650, color: "var(--text)" }}>Upload files</span>
          </div>
          <span className="text-ink-3" style={{ fontSize: 11.5 }}>
            Drag and drop, or click to browse — lands in {folderFilter === "all" ? DEFAULT_FOLDER : folderFilter}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center" style={{ gap: 10 }}>
        <div className="bg-card border-soft flex items-center" style={{ gap: 8, padding: "9px 13px", borderRadius: 12, flex: 1, minWidth: 200 }}>
          <Search size={14} strokeWidth={1.8} color="var(--text-3)" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search files…"
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 12.5, color: "var(--text)", width: "100%" }}
          />
        </div>
        <div className="flex items-center" style={{ gap: 2, background: "var(--surface-2)", borderRadius: 10, padding: 3 }}>
          <button type="button" aria-label="List view" onClick={() => setViewMode("list")} style={{ width: 30, height: 26, borderRadius: 8, border: "none", background: viewMode === "list" ? "var(--card)" : "transparent", color: viewMode === "list" ? "var(--text)" : "var(--text-3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Rows3 size={14} strokeWidth={1.8} />
          </button>
          <button type="button" aria-label="Grid view" onClick={() => setViewMode("grid")} style={{ width: 30, height: 26, borderRadius: 8, border: "none", background: viewMode === "grid" ? "var(--card)" : "transparent", color: viewMode === "grid" ? "var(--text)" : "var(--text-3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <LayoutGrid size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <div className="flex items-center" style={{ gap: 6, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setFolderFilter("all")}
          className="flex items-center"
          style={{ gap: 5, border: "none", borderRadius: 999, padding: "6px 13px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", background: folderFilter === "all" ? "var(--text)" : "var(--surface-2)", color: folderFilter === "all" ? "var(--surface)" : "var(--text-2)" }}
        >
          <Folder size={11} /> All files <span style={{ opacity: 0.7 }}>{files.length}</span>
        </button>
        {folders.map((folder) => {
          const count = files.filter((f) => f.folder === folder).length;
          const isActive = folderFilter === folder;
          return (
            <button
              key={folder}
              type="button"
              onClick={() => setFolderFilter(folder)}
              style={{ border: "none", borderRadius: 999, padding: "6px 13px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", background: isActive ? "var(--text)" : "var(--surface-2)", color: isActive ? "var(--surface)" : "var(--text-2)" }}
            >
              {folder} <span style={{ opacity: 0.7 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {filesLoading ? (
        <div className="bg-card border-soft shadow-float fade-in flex flex-col items-center" style={{ borderRadius: 20, padding: "48px 24px", textAlign: "center", gap: 10 }}>
          <p className="text-ink-3" style={{ fontSize: 12.5 }}>Loading files…</p>
        </div>
      ) : filesError ? (
        <div className="bg-card border-soft shadow-float fade-in flex flex-col items-center" style={{ borderRadius: 20, padding: "48px 24px", textAlign: "center", gap: 10 }}>
          <Inbox size={22} strokeWidth={1.6} color="var(--text-3)" />
          <p style={{ fontSize: 13.5, fontWeight: 600, color: "#B3564B" }}>Couldn't load files</p>
          <p className="text-ink-3" style={{ fontSize: 12, maxWidth: 300 }}>{filesError}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border-soft shadow-float fade-in flex flex-col items-center" style={{ borderRadius: 20, padding: "48px 24px", textAlign: "center", gap: 10 }}>
          <Inbox size={22} strokeWidth={1.6} color="var(--text-3)" />
          <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>No files yet</p>
          <p className="text-ink-3" style={{ fontSize: 12, maxWidth: 300 }}>Upload documents, images, and other assets to keep everything the team needs in one place.</p>
        </div>
      ) : viewMode === "list" ? (
        <div className="bg-card border-soft shadow-float fade-in" style={{ borderRadius: 20, overflow: "hidden" }}>
          {filtered.map((file) => (
            <FileRow key={file.id} file={file} canEdit={canEdit} onPreview={() => setPreviewFile(file)} onDownload={() => handleDownload(file)} onDelete={() => handleDelete(file.id)} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" style={{ gap: 12 }}>
          {filtered.map((file) => (
            <FileCard key={file.id} file={file} canEdit={canEdit} onPreview={() => setPreviewFile(file)} onDownload={() => handleDownload(file)} onDelete={() => handleDelete(file.id)} />
          ))}
        </div>
      )}

      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} onDownload={() => handleDownload(previewFile)} />}
    </div>
  );
}
