import type { LucideIcon } from "lucide-react";
import { MoreHorizontal, Pencil, Copy, Archive, Trash2 } from "lucide-react";

interface ProjectActionsMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  isArchived?: boolean;
}

function MenuItem({ icon: Icon, label, onClick, destructive }: { icon: LucideIcon; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="nav-item flex items-center"
      style={{
        width: "100%",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 8,
        border: "none",
        background: "transparent",
        color: destructive ? "var(--text)" : "var(--text-2)",
        fontSize: 12.5,
        fontWeight: 500,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <Icon size={13} strokeWidth={1.8} />
      {label}
    </button>
  );
}

/** Reused on both the project card and the project workspace header. */
export function ProjectActionsMenu({ isOpen, onToggle, onEdit, onDuplicate, onArchive, onDelete, isArchived }: ProjectActionsMenuProps) {
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        aria-label="Project actions"
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          border: "none",
          background: "var(--surface-2)",
          color: "var(--text-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
          zIndex: 31,
          flexShrink: 0,
        }}
      >
        <MoreHorizontal size={15} strokeWidth={1.8} />
      </button>

      {isOpen && (
        <>
          <div
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
            style={{ position: "fixed", inset: 0, zIndex: 30 }}
          />
          <div
            className="bg-card border-soft shadow-float-lg fade-in-static"
            style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 172, borderRadius: 12, padding: 6, zIndex: 32 }}
          >
            <MenuItem icon={Pencil} label="Edit" onClick={onEdit} />
            <MenuItem icon={Copy} label="Duplicate" onClick={onDuplicate} />
            {!isArchived && <MenuItem icon={Archive} label="Archive" onClick={onArchive} />}
            <MenuItem icon={Trash2} label="Delete" destructive onClick={onDelete} />
          </div>
        </>
      )}
    </div>
  );
}
