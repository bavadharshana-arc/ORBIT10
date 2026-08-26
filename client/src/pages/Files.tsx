import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, DragEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Upload,
  UploadCloud,
  Search,
  ChevronDown,
  LayoutGrid,
  Rows3,
  MoreHorizontal,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileType2,
  File as FileIcon,
  Download,
  Pencil,
  Trash2,
  Inbox,
  FolderOpen,
} from "lucide-react";

import { loadMembers, getInitials } from "../data/teamData";
import { useProjectContext } from "../context/projectContextValue";
import { useWorkspace } from "../context/workspaceContextValue";
import {
  getPermissionForProjectName,
  canEditProjectContent,
  resolveCurrentActor,
  setSessionObjectUrl,
  getSessionObjectUrl,
  clearSessionObjectUrl,
} from "../data/workspaceData";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "../components/ui/Avatar";
import { ApiError } from "../lib/api";
import {
  listFiles as listFilesRequest,
  createFile as createFileRequest,
  deleteFile as deleteFileRequest,
  type ProjectFileApiRecord,
} from "../lib/fileApi";
import { listWorkspaceMembers, type WorkspaceMemberRecord } from "../lib/workspaceApi";

/* ============================================================
   DATA MODEL
   Flat, UI-shaped record built by flattening every accessible
   project's real files (Stage 3 — Workspace-wide Files) into one
   list — see mapApiRecord below. Backed by the same real,
   metadata-only per-project file endpoint ProjectFilesTab.tsx uses
   (lib/fileApi.ts, Phase 28); this page just aggregates it across
   every project in the current workspace instead of scoping to one.

   Phase 35: this page used to seed itself with buildMockFiles() —
   9 fake files tagged to dashboardData.ts's hardcoded demo projects
   ("Orbit Mobile App", etc.) and the mock team roster — shown to
   every single user, new or old, on every load. Removed then; Stage
   3 finishes the job by replacing the session-only local state those
   fake files used to live in with the real backend list.
============================================================ */

type FileKind = "document" | "image" | "pdf" | "spreadsheet" | "other";

interface FileUploader {
  id: string;
  name: string;
  initials: string;
  bg: string;
  fg?: string;
}

interface FileRecord {
  id: string;
  name: string;
  extension: string;
  kind: FileKind;
  sizeBytes: number;
  project: string;
  /** Real project id — needed to scope the delete/create API calls, which are still per-project routes. */
  projectId: string;
  uploadedBy: FileUploader;
  uploadedAt: string; // "YYYY-MM-DD"
}

const NEUTRAL_UPLOADER_AVATAR = { bg: "var(--blue)", fg: "var(--text)" };

/** Resolves a real uploaderId into a display FileUploader — same pattern as TaskContext.tsx's assignee resolution and ProjectFilesTab.tsx's resolveUploader. */
function resolveUploader(
  uploaderId: string | null,
  membersById: Map<string, WorkspaceMemberRecord>,
  fallback: FileUploader,
): FileUploader {
  if (!uploaderId) return fallback;
  const member = membersById.get(uploaderId);
  if (!member) return fallback;
  const name = member.user.name ?? member.user.email;
  return {
    id: uploaderId,
    name,
    initials: getInitials(name),
    bg: member.user.avatarBg ?? NEUTRAL_UPLOADER_AVATAR.bg,
    fg: member.user.avatarFg ?? NEUTRAL_UPLOADER_AVATAR.fg,
  };
}

function mapApiRecord(
  record: ProjectFileApiRecord,
  projectName: string,
  membersById: Map<string, WorkspaceMemberRecord>,
  fallbackUploader: FileUploader,
): FileRecord {
  return {
    id: record.id,
    name: record.name,
    extension: record.extension,
    kind: record.kind,
    sizeBytes: record.sizeBytes,
    project: projectName,
    projectId: record.projectId,
    uploadedBy: resolveUploader(record.uploaderId, membersById, fallbackUploader),
    uploadedAt: record.createdAt.slice(0, 10),
  };
}

const FILE_TYPE_META: Record<FileKind, { label: string; icon: LucideIcon }> = {
  document: { label: "Document", icon: FileText },
  pdf: { label: "PDF", icon: FileType2 },
  image: { label: "Image", icon: FileImage },
  spreadsheet: { label: "Spreadsheet", icon: FileSpreadsheet },
  other: { label: "File", icon: FileIcon },
};

type TypeFilter = "all" | "document" | "image" | "pdf" | "spreadsheet";

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "document", label: "Documents" },
  { key: "image", label: "Images" },
  { key: "pdf", label: "PDFs" },
  { key: "spreadsheet", label: "Spreadsheets" },
];

type SortKey = "newest" | "oldest" | "name" | "largest";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "name", label: "Name (A–Z)" },
  { key: "largest", label: "Largest first" },
];

type ViewMode = "list" | "grid";

interface UploaderGroup {
  uploader: FileUploader;
  files: FileRecord[];
}

function inferKind(extension: string): FileKind {
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(extension)) return "image";
  if (extension === "pdf") return "pdf";
  if (["xlsx", "xls", "csv"].includes(extension)) return "spreadsheet";
  if (["doc", "docx", "md", "txt", "rtf"].includes(extension)) return "document";
  return "other";
}

/* ============================================================
   FORMATTING
============================================================ */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  let decimals = value < 10 ? 1 : 0;
  // The unit above was picked from the raw value, but rounding for
  // display can itself round up to "1024" (e.g. 1023.6 KB -> "1024 KB")
  // instead of promoting to the next unit — reapply the same promotion
  // against the rounded value that's actually about to be shown.
  if (Number(value.toFixed(decimals)) >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
    decimals = value < 10 ? 1 : 0;
  }
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ============================================================
   SHARED STYLE HELPERS
============================================================ */

const primaryButtonStyle: CSSProperties = {
  background: "var(--text)",
  color: "var(--surface)",
  border: "none",
  borderRadius: 14,
  padding: "13px 22px",
  fontSize: 13.5,
  fontWeight: 650,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  flexShrink: 0,
};

const secondaryButtonStyle: CSSProperties = {
  background: "var(--surface-2)",
  color: "var(--text-2)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "8px 14px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const iconButtonStyle: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "none",
  background: "var(--surface-2)",
  color: "var(--text-2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
};

const selectStyle: CSSProperties = {
  appearance: "none",
  border: "1px solid var(--border)",
  borderRadius: 10,
  background: "var(--surface-2)",
  padding: "8px 30px 8px 12px",
  fontSize: 11.5,
  fontWeight: 600,
  color: "var(--text)",
  outline: "none",
  cursor: "pointer",
};

function viewToggleStyle(active: boolean): CSSProperties {
  return {
    width: 30,
    height: 26,
    borderRadius: 8,
    border: "none",
    background: active ? "var(--card)" : "transparent",
    color: active ? "var(--text)" : "var(--text-3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: active ? "0 1px 2px rgba(32,36,43,0.08)" : "none",
    transition: "background 160ms ease, color 160ms ease",
  };
}

function FileBadge({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 600,
        padding: "4px 10px",
        borderRadius: 999,
        background: "var(--surface-2)",
        color: "var(--text-2)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/* ============================================================
   ACTIONS MENU
============================================================ */

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? "Coming soon" : undefined}
      className={disabled ? "flex items-center" : "nav-item flex items-center"}
      style={{
        width: "100%",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 8,
        border: "none",
        background: "transparent",
        color: disabled ? "var(--text-3)" : destructive ? "var(--text)" : "var(--text-2)",
        fontSize: 12.5,
        fontWeight: 500,
        cursor: disabled ? "default" : "pointer",
        textAlign: "left",
      }}
    >
      <Icon size={13} strokeWidth={1.8} />
      {label}
    </button>
  );
}

function FileActionsMenu({
  open,
  canDelete,
  onToggle,
  onDownload,
  onDelete,
}: {
  open: boolean;
  /** Editor+ on the file's project — gates Rename/Delete only; Download stays available to everyone. */
  canDelete: boolean;
  onToggle: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        aria-label="More actions"
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        style={{ ...iconButtonStyle, position: "relative", zIndex: 31 }}
      >
        <MoreHorizontal size={14} strokeWidth={1.8} />
      </button>

      {open && (
        <>
          <div onClick={onToggle} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
          <div
            className="bg-card border-soft shadow-float-lg fade-in-static"
            style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 168, borderRadius: 12, padding: 6, zIndex: 32 }}
          >
            <MenuItem icon={Download} label="Download" onClick={onDownload} />
            {canDelete && (
              <>
                <MenuItem icon={Pencil} label="Rename" disabled />
                <MenuItem icon={Trash2} label="Delete" destructive onClick={onDelete} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   LIST VIEW
============================================================ */

interface FileRowProps {
  file: FileRecord;
  showDivider: boolean;
  canEdit: boolean;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

function FileListHeader() {
  return (
    <div
      className="hidden sm:flex items-center text-ink-3"
      style={{ padding: "0 14px 8px", gap: 14, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}
    >
      <div style={{ flex: "2 1 220px" }}>Name</div>
      <div style={{ flex: "0.7 1 100px" }}>Type</div>
      <div style={{ flex: "0.5 1 70px" }}>Size</div>
      <div className="hidden md:block" style={{ flex: "1 1 150px" }}>Uploaded by</div>
      <div className="hidden lg:block" style={{ flex: "0.9 1 140px" }}>Project</div>
      <div className="hidden lg:block" style={{ flex: "0.7 1 90px" }}>Uploaded</div>
      <div style={{ width: 28, flexShrink: 0 }} />
    </div>
  );
}

function FileRow({ file, showDivider, canEdit, isMenuOpen, onToggleMenu, onDownload, onDelete }: FileRowProps) {
  const meta = FILE_TYPE_META[file.kind];

  return (
    <div
      className="flex items-center"
      style={{ padding: "10px 14px", gap: 14, borderTop: showDivider ? "1px solid var(--border)" : "none" }}
    >
      {/* NAME */}
      <div className="flex items-center" style={{ gap: 10, flex: "2 1 220px", minWidth: 0 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: "var(--surface-2)",
            color: "var(--blue-dark)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <meta.icon size={15} strokeWidth={1.8} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {file.name}
          </div>
          <div className="text-ink-3" style={{ fontSize: 11, marginTop: 1 }}>.{file.extension}</div>
        </div>
      </div>

      {/* TYPE */}
      <div className="hidden sm:block" style={{ flex: "0.7 1 100px" }}>
        <FileBadge>{meta.label}</FileBadge>
      </div>

      {/* SIZE */}
      <div className="hidden sm:block text-ink-3" style={{ flex: "0.5 1 70px", fontSize: 12 }}>
        {formatFileSize(file.sizeBytes)}
      </div>

      {/* UPLOADED BY */}
      <div className="hidden md:flex items-center" style={{ gap: 8, flex: "1 1 150px", minWidth: 0 }}>
        <Avatar initials={file.uploadedBy.initials} bg={file.uploadedBy.bg} fg={file.uploadedBy.fg} size={24} />
        <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {file.uploadedBy.name}
        </span>
      </div>

      {/* PROJECT */}
      <div className="hidden lg:block" style={{ flex: "0.9 1 140px", minWidth: 0 }}>
        <span style={{ fontSize: 12, color: "var(--text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {file.project}
        </span>
      </div>

      {/* DATE */}
      <div className="hidden lg:block text-ink-3" style={{ flex: "0.7 1 90px", fontSize: 12 }}>
        {formatDate(file.uploadedAt)}
      </div>

      {/* ACTIONS */}
      <div style={{ flexShrink: 0 }}>
        <FileActionsMenu open={isMenuOpen} canDelete={canEdit} onToggle={onToggleMenu} onDownload={onDownload} onDelete={onDelete} />
      </div>
    </div>
  );
}

/* ============================================================
   GRID VIEW
============================================================ */

function FileCard({ file, canEdit, isMenuOpen, onToggleMenu, onDownload, onDelete }: Omit<FileRowProps, "showDivider">) {
  const meta = FILE_TYPE_META[file.kind];

  return (
    <div className="bg-card border-soft shadow-float lift fade-in" style={{ borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="flex items-start" style={{ justifyContent: "space-between" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--surface-2)",
            color: "var(--blue-dark)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <meta.icon size={16} strokeWidth={1.8} />
        </div>
        <FileActionsMenu open={isMenuOpen} canDelete={canEdit} onToggle={onToggleMenu} onDownload={onDownload} onDelete={onDelete} />
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {file.name}
        </div>
        <div className="text-ink-3" style={{ fontSize: 11, marginTop: 3 }}>
          {formatFileSize(file.sizeBytes)} &middot; {formatDate(file.uploadedAt)}
        </div>
      </div>

      <div className="flex items-center" style={{ gap: 7, marginTop: "auto", minWidth: 0 }}>
        <Avatar initials={file.uploadedBy.initials} bg={file.uploadedBy.bg} fg={file.uploadedBy.fg} size={20} />
        <span className="text-ink-3" style={{ fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {file.project}
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   UPLOADER SECTION — collapsible group of one person's files
============================================================ */

interface UploaderSectionProps {
  group: UploaderGroup;
  viewMode: ViewMode;
  isCollapsed: boolean;
  canEditFile: (file: FileRecord) => boolean;
  onToggleCollapse: () => void;
  openMenuId: string | null;
  onToggleMenu: (id: string) => void;
  onDownload: (file: FileRecord) => void;
  onDelete: (id: string) => void;
}

function UploaderSection({ group, viewMode, isCollapsed, canEditFile, onToggleCollapse, openMenuId, onToggleMenu, onDownload, onDelete }: UploaderSectionProps) {
  const { uploader, files } = group;

  return (
    <div className="bg-card border-soft shadow-float fade-in" style={{ borderRadius: 16, overflow: "hidden" }}>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex items-center"
        style={{ width: "100%", justifyContent: "space-between", padding: "12px 14px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }}
      >
        <div className="flex items-center" style={{ gap: 10, minWidth: 0 }}>
          <Avatar initials={uploader.initials} bg={uploader.bg} fg={uploader.fg} size={30} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {uploader.name}
            </div>
            <div className="text-ink-3" style={{ fontSize: 11 }}>
              {files.length} file{files.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
        <ChevronDown
          size={16}
          strokeWidth={2}
          style={{ color: "var(--text-3)", flexShrink: 0, transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 160ms ease" }}
        />
      </button>

      {!isCollapsed && (
        viewMode === "list" ? (
          <div style={{ borderTop: "1px solid var(--border)", padding: "6px 4px 4px" }}>
            <FileListHeader />
            {files.map((file, index) => (
              <FileRow
                key={file.id}
                file={file}
                showDivider={index > 0}
                canEdit={canEditFile(file)}
                isMenuOpen={openMenuId === file.id}
                onToggleMenu={() => onToggleMenu(file.id)}
                onDownload={() => onDownload(file)}
                onDelete={() => onDelete(file.id)}
              />
            ))}
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            style={{ gap: 12, padding: "4px 14px 14px", borderTop: "1px solid var(--border)" }}
          >
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                canEdit={canEditFile(file)}
                isMenuOpen={openMenuId === file.id}
                onToggleMenu={() => onToggleMenu(file.id)}
                onDownload={() => onDownload(file)}
                onDelete={() => onDelete(file.id)}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

/* ============================================================
   UPLOAD DROPZONE
   Wide, shallow drag-and-drop target that doubles as the "click
   to browse" trigger for the hidden file input in Files().
============================================================ */

interface UploadDropzoneProps {
  isDragging: boolean;
  onClick: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}

function UploadDropzone({ isDragging, onClick, onDragOver, onDragLeave, onDrop }: UploadDropzoneProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="fade-in flex flex-col items-center justify-center"
      style={{
        border: `1.5px dashed ${isDragging ? "var(--blue-dark)" : "var(--blue)"}`,
        borderRadius: 16,
        padding: "20px 24px",
        marginBottom: 22,
        gap: 12,
        textAlign: "center",
        cursor: "pointer",
        background: isDragging ? "var(--surface-2)" : "var(--card)",
        transition: "background 160ms ease, border-color 160ms ease",
      }}
    >
      <div className="flex items-center" style={{ gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "var(--surface-2)",
            color: "var(--blue-dark)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <UploadCloud size={15} strokeWidth={1.8} />
        </div>
        <span style={{ fontSize: 13.5, fontWeight: 650, color: "var(--text)" }}>Upload files</span>
      </div>
      <span className="text-ink-2" style={{ fontSize: 12.5 }}>Drag and drop files here, or click to browse</span>
      <span className="text-ink-3" style={{ fontSize: 11 }}>Supports PDF, DOCX, XLSX, PNG, JPG and more</span>
    </div>
  );
}

/* ============================================================
   EMPTY STATES
============================================================ */

function EmptyFilesState({ canUpload, onUploadClick }: { canUpload: boolean; onUploadClick: () => void }) {
  return (
    <div className="bg-card border-soft shadow-float fade-in flex flex-col items-center" style={{ borderRadius: 22, padding: "64px 24px", textAlign: "center" }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: "var(--surface-2)",
          color: "var(--blue-dark)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Inbox size={22} strokeWidth={1.8} />
      </div>
      <h2 className="font-display" style={{ fontSize: 17, fontWeight: 560, marginBottom: 6, color: "var(--text)" }}>
        No files yet
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-2)", maxWidth: 340, marginBottom: 20 }}>
        Upload documents, images, and other project assets to keep everything your team needs in one place.
      </p>
      {canUpload && (
        <button type="button" onClick={onUploadClick} className="shadow-float lift" style={primaryButtonStyle}>
          <Upload size={16} strokeWidth={2} />
          Upload files
        </button>
      )}
    </div>
  );
}

function NoResultsState({ onReset }: { onReset: () => void }) {
  return (
    <div className="bg-card border-soft shadow-float fade-in flex flex-col items-center" style={{ borderRadius: 20, padding: "48px 24px", textAlign: "center" }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "var(--surface-2)",
          color: "var(--text-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <FolderOpen size={19} strokeWidth={1.8} />
      </div>
      <h2 className="font-display" style={{ fontSize: 15, fontWeight: 560, marginBottom: 5, color: "var(--text)" }}>
        No files match
      </h2>
      <p style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 16 }}>
        Try a different search term or clear the current filters.
      </p>
      <button type="button" onClick={onReset} style={secondaryButtonStyle}>
        Clear filters
      </button>
    </div>
  );
}

/* ============================================================
   FILES PAGE

   Workspace-wide file browser. Stage 3 (Workspace-wide Files):
   flattens every accessible project's real, backend-persisted files
   (the same per-project endpoint ProjectFilesTab.tsx uses, Phase 28
   — fileApi.ts is scoped per-project, GET .../projects/:projectId/
   files) into one list, the same aggregation pattern TaskContext.tsx
   already uses for workspace-wide tasks. No new storage, no binary
   upload — still metadata-only.
============================================================ */

export default function Files() {
  const members = useMemo(() => loadMembers(), []);
  const { user } = useAuth();
  const currentUser = useMemo(() => resolveCurrentActor(members, user), [members, user]);
  const { projects: liveProjects } = useProjectContext();
  const { currentWorkspaceId } = useWorkspace();

  function canEditFile(file: FileRecord): boolean {
    return canEditProjectContent(getPermissionForProjectName(file.project, liveProjects, currentUser.initials));
  }

  // New uploads always land under the caller's first real project (see
  // processFiles below) — gate the upload affordances against that same
  // target, resolved against the live project list. Phase 35: this used
  // to fall back to a hardcoded demo project name when there were no
  // real projects, which (via getPermissionForProjectName's own no-match
  // fallback, "Editor") let uploading appear enabled for an account with
  // no real project to attach a file to. Explicitly false with zero real
  // projects instead.
  const uploadTargetProject = liveProjects[0];
  const canUpload =
    uploadTargetProject !== undefined &&
    canEditProjectContent(getPermissionForProjectName(uploadTargetProject.name, liveProjects, currentUser.initials));

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deliberate proxy for "did the accessible project set actually
  // change" — same reasoning as TaskContext.tsx's identical
  // projectIdsKey, so a re-render that produces a new `liveProjects`
  // array reference (but the same ids) doesn't re-trigger the fetch.
  const projectIdsKey = liveProjects.map((project) => project.id).join(",");

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled || !currentWorkspaceId || liveProjects.length === 0) return null;
        setFilesLoading(true);
        setFilesError(null);
        return Promise.all([
          listWorkspaceMembers(currentWorkspaceId),
          Promise.all(liveProjects.map((project) => listFilesRequest(currentWorkspaceId, project.id))),
        ]);
      })
      .then((result) => {
        if (cancelled) return;
        if (!currentWorkspaceId || liveProjects.length === 0 || !result) {
          setFiles([]);
          return;
        }
        const [workspaceMembers, perProjectFiles] = result;
        const membersById = new Map(workspaceMembers.map((member) => [member.userId, member] as const));
        const flattened: FileRecord[] = [];
        perProjectFiles.forEach((records, index) => {
          const project = liveProjects[index];
          if (!project) return;
          for (const record of records) {
            flattened.push(mapApiRecord(record, project.name, membersById, currentUser));
          }
        });
        setFiles(flattened);
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
    // `liveProjects` is intentionally omitted — projectIdsKey is the
    // deliberate proxy for it (see comment above); `currentUser` is only
    // a display fallback for a missing uploader match, not a refetch
    // trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspaceId, projectIdsKey]);

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase();

    const matched = files.filter((file) => {
      const matchesQuery = query === "" || file.name.toLowerCase().includes(query);
      const matchesType = typeFilter === "all" || file.kind === typeFilter;
      return matchesQuery && matchesType;
    });

    return matched.sort((a, b) => {
      if (sortKey === "newest") return b.uploadedAt.localeCompare(a.uploadedAt);
      if (sortKey === "oldest") return a.uploadedAt.localeCompare(b.uploadedAt);
      if (sortKey === "name") return a.name.localeCompare(b.name);
      return b.sizeBytes - a.sizeBytes;
    });
  }, [files, search, typeFilter, sortKey]);

  /*
   * Grouped by uploader for the accordion layout. filteredFiles is
   * already sorted per sortKey, so each group's files stay in that
   * same order — grouping never re-sorts within a person's files.
   */
  const groupedFiles = useMemo<UploaderGroup[]>(() => {
    const byUploader = new Map<string, UploaderGroup>();
    filteredFiles.forEach((file) => {
      const existing = byUploader.get(file.uploadedBy.id);
      if (existing) {
        existing.files.push(file);
      } else {
        byUploader.set(file.uploadedBy.id, { uploader: file.uploadedBy, files: [file] });
      }
    });

    return Array.from(byUploader.values()).sort((a, b) => {
      if (b.files.length !== a.files.length) return b.files.length - a.files.length;
      return a.uploader.name.localeCompare(b.uploader.name);
    });
  }, [filteredFiles]);

  function toggleMenu(id: string) {
    setOpenMenuId((current) => (current === id ? null : id));
  }

  function toggleGroup(id: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete(id: string) {
    const target = files.find((file) => file.id === id);
    if (!target || !canEditFile(target) || !currentWorkspaceId) return;

    setMutationError(null);
    try {
      await deleteFileRequest(currentWorkspaceId, target.projectId, id);
      setFiles((current) => current.filter((file) => file.id !== id));
      setOpenMenuId((current) => (current === id ? null : current));
      clearSessionObjectUrl(id);
    } catch (error) {
      setMutationError(error instanceof ApiError ? error.message : "Couldn't delete the file. Try again.");
    }
  }

  // The backend still only keeps upload metadata (name/size/kind), never
  // the real file bytes, so a fresh page load has nothing real to serve.
  // Within the same browser session, though, an object URL captured at
  // upload time (below) lets a just-uploaded file actually download —
  // same session-object-url pattern as ProjectFilesTab.tsx. Falls back to
  // a placeholder bearing the file's real name when there's no captured
  // URL (e.g. after a reload), instead of the button doing nothing.
  function handleDownload(file: FileRecord) {
    const objectUrl = getSessionObjectUrl(file.id);
    const link = document.createElement("a");
    if (objectUrl) {
      link.href = objectUrl;
      link.download = `${file.name}.${file.extension}`;
      link.click();
      return;
    }
    const blob = new Blob(
      [`This is a demo placeholder for "${file.name}.${file.extension}" (${formatFileSize(file.sizeBytes)}).`],
      { type: "text/plain" }
    );
    const fallbackUrl = URL.createObjectURL(blob);
    link.href = fallbackUrl;
    link.download = `${file.name}.${file.extension}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(fallbackUrl), 1000);
  }

  async function processFiles(fileList: FileList) {
    // canUpload being true guarantees uploadTargetProject is a real
    // project (see its definition above) — reused directly rather than
    // re-deriving it.
    if (!canUpload || uploadTargetProject === undefined || !currentWorkspaceId) return;

    setMutationError(null);

    for (const file of Array.from(fileList)) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      const name = file.name.replace(/\.[^.]+$/, "");
      const kind = inferKind(extension);

      try {
        const record = await createFileRequest(currentWorkspaceId, uploadTargetProject.id, {
          name,
          extension,
          kind,
          sizeBytes: file.size,
          folder: "General",
        });

        setSessionObjectUrl(record.id, URL.createObjectURL(file));

        const newFile: FileRecord = {
          id: record.id,
          name: record.name,
          extension: record.extension,
          kind: record.kind,
          sizeBytes: record.sizeBytes,
          project: uploadTargetProject.name,
          projectId: record.projectId,
          uploadedBy: currentUser,
          uploadedAt: record.createdAt.slice(0, 10),
        };

        setFiles((current) => [newFile, ...current]);
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

  const hasFiles = files.length > 0;
  const hasResults = filteredFiles.length > 0;

  return (
    <>
      <input ref={fileInputRef} type="file" multiple onChange={handleFilesSelected} style={{ display: "none" }} />

      <div className="fade-in" style={{ marginBottom: 16 }}>
        <h1 className="font-display" style={{ fontSize: 26, fontWeight: 560, marginBottom: 6, color: "var(--text)" }}>
          Files
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-2)" }}>
          Documents and assets shared across your Orbit projects.
        </p>
      </div>

      {mutationError && (
        <p className="fade-in" style={{ margin: "0 0 14px", fontSize: 12.5, color: "#B3564B" }}>
          {mutationError}
        </p>
      )}

      {canUpload && (
        <UploadDropzone
          isDragging={isDragging}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        />
      )}

      {filesLoading ? (
        <div className="bg-card border-soft shadow-float fade-in flex flex-col items-center" style={{ borderRadius: 22, padding: "64px 24px", textAlign: "center" }}>
          <p className="text-ink-3" style={{ fontSize: 13 }}>Loading files…</p>
        </div>
      ) : filesError ? (
        <div className="bg-card border-soft shadow-float fade-in flex flex-col items-center" style={{ borderRadius: 22, padding: "64px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: "#B3564B", marginBottom: 6 }}>Couldn't load files</p>
          <p className="text-ink-3" style={{ fontSize: 12.5, maxWidth: 320 }}>{filesError}</p>
        </div>
      ) : !hasFiles ? (
        <EmptyFilesState canUpload={canUpload} onUploadClick={() => fileInputRef.current?.click()} />
      ) : (
        <>
          {/* DEDICATED SEARCH */}
          <div className="bg-card border-soft fade-in flex items-center" style={{ gap: 10, padding: "11px 14px", borderRadius: 14, marginBottom: 14, color: "var(--text-3)" }}>
            <Search size={16} strokeWidth={1.8} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by file name..."
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--text)", width: "100%" }}
            />
          </div>

          {/* TOOLBAR */}
          <div className="bg-card border-soft fade-in flex items-center" style={{ gap: 10, padding: 10, borderRadius: 14, marginBottom: 14, flexWrap: "wrap" }}>
            <div className="flex items-center" style={{ gap: 4, flexWrap: "wrap", flex: 1 }}>
              {TYPE_FILTERS.map((option) => {
                const isActive = typeFilter === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setTypeFilter(option.key)}
                    style={{
                      border: "none",
                      borderRadius: 999,
                      padding: "7px 13px",
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      background: isActive ? "var(--text)" : "var(--surface-2)",
                      color: isActive ? "var(--surface)" : "var(--text-2)",
                      transition: "background 160ms ease, color 160ms ease",
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div style={{ position: "relative", color: "var(--text)" }}>
              <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} style={selectStyle}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
              <ChevronDown size={13} strokeWidth={2} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>

            <div className="flex items-center" style={{ gap: 2, background: "var(--surface-2)", borderRadius: 10, padding: 3 }}>
              <button type="button" aria-label="List view" onClick={() => setViewMode("list")} style={viewToggleStyle(viewMode === "list")}>
                <Rows3 size={14} strokeWidth={1.8} />
              </button>
              <button type="button" aria-label="Grid view" onClick={() => setViewMode("grid")} style={viewToggleStyle(viewMode === "grid")}>
                <LayoutGrid size={14} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div className="text-ink-3 fade-in" style={{ fontSize: 12, marginBottom: 10 }}>
            {filteredFiles.length} of {files.length} file{files.length === 1 ? "" : "s"}
          </div>

          {!hasResults ? (
            <NoResultsState onReset={() => { setSearch(""); setTypeFilter("all"); }} />
          ) : (
            <div className="flex flex-col" style={{ gap: 12 }}>
              {groupedFiles.map((group) => (
                <UploaderSection
                  key={group.uploader.id}
                  group={group}
                  viewMode={viewMode}
                  isCollapsed={collapsedGroups.has(group.uploader.id)}
                  canEditFile={canEditFile}
                  onToggleCollapse={() => toggleGroup(group.uploader.id)}
                  openMenuId={openMenuId}
                  onToggleMenu={toggleMenu}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
