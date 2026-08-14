import { useMemo, useRef, useState } from "react";
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

import { projects } from "../data/dashboardData";
import { loadMembers, type Member } from "../data/teamData";
import { useProjectContext } from "../context/projectContextValue";
import { getPermissionForProjectName, canEditProjectContent, resolveCurrentActor } from "../data/workspaceData";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "../components/ui/Avatar";

/* ============================================================
   DATA MODEL
   Flat, backend-ready shape — a real Files API would return
   roughly this same record, so wiring one in later is a matter
   of swapping buildMockFiles() for a fetch, not reshaping fields.
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
  uploadedBy: FileUploader;
  uploadedAt: string; // "YYYY-MM-DD"
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

/* ============================================================
   MOCK DATA
   Reuses Orbit's existing projects (dashboardData) and team
   roster (teamData) so the demo feels like part of the same
   workspace rather than inventing a parallel cast.
============================================================ */

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

function toUploader(member: Member | undefined): FileUploader {
  if (!member) return { id: "unknown", name: "Unknown", initials: "?", bg: "#EEF2F6", fg: "#20242B" };
  return { id: member.id, name: member.name, initials: member.initials, bg: member.bg, fg: member.fg };
}

function buildMockFiles(members: Member[]): FileRecord[] {
  const projectNames = projects.map((project) => project.name);
  const projectAt = (index: number) => projectNames[index % projectNames.length] ?? "Orbit";
  const uploaderAt = (index: number) => toUploader(members[index % Math.max(members.length, 1)]);

  const seed: Omit<FileRecord, "id">[] = [
    { name: "Q3 product roadmap", extension: "pdf", kind: "pdf", sizeBytes: 2_400_000, project: projectAt(0), uploadedBy: uploaderAt(0), uploadedAt: daysAgo(1) },
    { name: "Onboarding flow wireframes", extension: "png", kind: "image", sizeBytes: 1_850_000, project: projectAt(0), uploadedBy: uploaderAt(1), uploadedAt: daysAgo(2) },
    { name: "Sprint retro notes", extension: "docx", kind: "document", sizeBytes: 84_000, project: projectAt(1), uploadedBy: uploaderAt(2), uploadedAt: daysAgo(3) },
    { name: "Release checklist", extension: "xlsx", kind: "spreadsheet", sizeBytes: 62_000, project: projectAt(2), uploadedBy: uploaderAt(3), uploadedAt: daysAgo(4) },
    { name: "Brand icon set", extension: "zip", kind: "other", sizeBytes: 12_400_000, project: projectAt(0), uploadedBy: uploaderAt(1), uploadedAt: daysAgo(5) },
    { name: "API reference", extension: "pdf", kind: "pdf", sizeBytes: 960_000, project: projectAt(2), uploadedBy: uploaderAt(4), uploadedAt: daysAgo(6) },
    { name: "Dashboard mockup v3", extension: "png", kind: "image", sizeBytes: 3_100_000, project: projectAt(1), uploadedBy: uploaderAt(0), uploadedAt: daysAgo(8) },
    { name: "Customer interview summary", extension: "docx", kind: "document", sizeBytes: 47_000, project: projectAt(3), uploadedBy: uploaderAt(5), uploadedAt: daysAgo(10) },
    { name: "Analytics event schema", extension: "xlsx", kind: "spreadsheet", sizeBytes: 38_000, project: projectAt(3), uploadedBy: uploaderAt(2), uploadedAt: daysAgo(12) },
  ];

  return seed.map((file, index) => ({ id: `file-${index + 1}`, ...file }));
}

function inferKind(extension: string): FileKind {
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(extension)) return "image";
  if (extension === "pdf") return "pdf";
  if (["xlsx", "xls", "csv"].includes(extension)) return "spreadsheet";
  if (["doc", "docx", "md", "txt", "rtf"].includes(extension)) return "document";
  return "other";
}

function generateFileId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
============================================================ */

export default function Files() {
  const members = useMemo(() => loadMembers(), []);
  const { user } = useAuth();
  const currentUser = useMemo(() => resolveCurrentActor(members, user), [members, user]);
  const { projects: liveProjects } = useProjectContext();

  function canEditFile(file: FileRecord): boolean {
    return canEditProjectContent(getPermissionForProjectName(file.project, liveProjects, currentUser.initials));
  }

  // New uploads always land under `projects[0]` (see processFiles below) —
  // gate the upload affordances against that same target, resolved
  // against the live project list so a permission change takes effect
  // immediately rather than reading from the static seed snapshot.
  const uploadTargetProject = projects[0]?.name ?? "Orbit";
  const canUpload = canEditProjectContent(getPermissionForProjectName(uploadTargetProject, liveProjects, currentUser.initials));

  const [files, setFiles] = useState<FileRecord[]>(() => buildMockFiles(members));
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleDelete(id: string) {
    const target = files.find((file) => file.id === id);
    if (!target || !canEditFile(target)) return;

    setFiles((current) => current.filter((file) => file.id !== id));
    setOpenMenuId((current) => (current === id ? null : current));
  }

  // This page keeps only upload metadata (name/size/kind), not the real
  // file content, so there's nothing real to serve — mirrors
  // ProjectFilesTab's own fallback for a file with no stored object URL:
  // a real, working download of a small placeholder bearing the file's
  // actual name, instead of the button doing nothing at all.
  function handleDownload(file: FileRecord) {
    const blob = new Blob(
      [`This is a demo placeholder for "${file.name}.${file.extension}" (${formatFileSize(file.sizeBytes)}).`],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${file.name}.${file.extension}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function processFiles(fileList: FileList) {
    if (!canUpload) return;

    const uploaded: FileRecord[] = Array.from(fileList).map((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      return {
        id: generateFileId(),
        name: file.name.replace(/\.[^.]+$/, ""),
        extension,
        kind: inferKind(extension),
        sizeBytes: file.size,
        project: projects[0]?.name ?? "Orbit",
        uploadedBy: currentUser,
        uploadedAt: new Date().toISOString().split("T")[0],
      };
    });

    setFiles((current) => [...uploaded, ...current]);
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

      {canUpload && (
        <UploadDropzone
          isDragging={isDragging}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        />
      )}

      {!hasFiles ? (
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
