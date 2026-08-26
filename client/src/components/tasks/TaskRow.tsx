import { useEffect, useRef, useState } from "react";

import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import { formatDueLabel, getDueGroup, type Priority, type Task } from "../../data/taskData";
import type { TeamMember } from "../../types/dashboard";
import { AvatarStack } from "../ui/AvatarStack";

/* ============================================================
   PRIORITY ACCENT — monochromatic ORBIT blue

   Deliberately not the shared Pill/PillTone system (used by Kanban.tsx
   and elsewhere with a neutral surface/blue/dark mapping) — this page
   wants a graduated priority "ladder", which PillTone has no tones for.
   Every tier stays inside ORBIT's existing blue family (--blue-deep/
   --blue-dark/--blue, the same tokens globals.css already defines for
   both themes) rather than switching hue for meaning — priority reads
   through shade/weight/border strength instead, exactly like the
   Overdue/Due-today treatment in DueDate below.

   Text intentionally never drops to the palest tint (--blue is ~1.5:1
   against white — fine for a dot or a tinted background, not for small
   badge text): High/Medium use --blue-deep/--blue-dark, both readable;
   Low keeps that same --blue-dark text but signals "lighter" through a
   thinner border, lighter dot, and lighter background tint instead.
============================================================ */

const PRIORITY_ACCENT: Record<
  Priority,
  { color: string; dot: string; tint: string; borderWidth: number; weight: number; label: string }
> = {
  High: {
    color: "var(--blue-deep)",
    dot: "var(--blue-deep)",
    tint: "color-mix(in srgb, var(--blue-deep) 15%, transparent)",
    borderWidth: 3,
    weight: 700,
    label: "High priority",
  },
  Medium: {
    color: "var(--blue-dark)",
    dot: "var(--blue-dark)",
    tint: "color-mix(in srgb, var(--blue-dark) 16%, transparent)",
    borderWidth: 2,
    weight: 650,
    label: "Medium priority",
  },
  Low: {
    color: "var(--blue-dark)",
    dot: "var(--blue)",
    tint: "color-mix(in srgb, var(--blue) 20%, transparent)",
    borderWidth: 1.5,
    weight: 550,
    label: "Low priority",
  },
};

function PriorityBadge({ priority }: { priority: Priority }) {
  const accent = PRIORITY_ACCENT[priority];

  return (
    <span
      className="inline-flex items-center"
      aria-label={accent.label}
      style={{
        gap: 5,
        fontSize: 11,
        fontWeight: accent.weight,
        color: accent.color,
        background: accent.tint,
        padding: "3px 9px 3px 7px",
        borderRadius: 999,
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 6, height: 6, borderRadius: "50%", background: accent.dot, flexShrink: 0 }}
      />
      {priority}
    </span>
  );
}

/* ============================================================
   DUE DATE

   Reuses getDueGroup (taskData.ts) for the urgency tier — never
   re-derives "is this overdue" locally. Urgency is communicated with a
   darker step of the same blue (Overdue > Today), heavier weight, and
   an explicit "Overdue" word — never a hue change — so it still reads
   in grayscale/for color-blind users and stays inside the monochromatic
   system the rest of the page uses.
============================================================ */

function DueDate({ task }: { task: Task }) {
  const group = getDueGroup(task.dueDate);
  const label = formatDueLabel(task.dueDate, task.due || "No due date");

  const isOverdue = group === "Overdue";
  const isToday = group === "Today";

  const color = isOverdue ? "var(--blue-deep)" : isToday ? "var(--blue-dark)" : "var(--text-3)";

  return (
    <span
      className="inline-flex items-center"
      style={{ gap: 5, fontSize: 11.5, fontWeight: isOverdue ? 700 : isToday ? 650 : 500, color, flexShrink: 0 }}
    >
      <CalendarDays size={13} color={color} strokeWidth={isOverdue ? 2.4 : 2} />
      {label}
      {isOverdue && <span aria-hidden="true">·</span>}
      {isOverdue && <span>Overdue</span>}
    </span>
  );
}

/* ============================================================
   ROW ACTIONS MENU

   The three-dot affordance existed visually before this redesign but did
   nothing (a bare icon — clicks just bubbled up to the row). This wires
   it to real actions, but every item calls a handler the page already
   owns (onOpen/onToggleStatus/onDelete come straight from Tasks.tsx's
   existing setSelectedTaskId/handleToggleStatus/handleDeleteTask) — no
   new mutation logic, just a real menu around what already existed.
============================================================ */

interface TaskRowMenuProps {
  task: Task;
  canEdit: boolean;
  onOpen: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

function TaskRowMenu({ task, canEdit, onOpen, onToggleStatus, onDelete }: TaskRowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        aria-label="Task actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-dark)]"
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          border: "none",
          background: "transparent",
          color: "var(--text-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <MoreHorizontal size={16} />
      </button>

      {isOpen && (
        <>
          <div
            onClick={(event) => {
              event.stopPropagation();
              setIsOpen(false);
            }}
            style={{ position: "fixed", inset: 0, zIndex: 30 }}
          />
          <div
            role="menu"
            className="bg-card border-soft shadow-float-lg fade-in-static"
            style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 178, borderRadius: 12, padding: 6, zIndex: 32 }}
          >
            <MenuItem
              icon={Pencil}
              label="Open task"
              onClick={() => {
                setIsOpen(false);
                onOpen();
              }}
            />
            {canEdit && (
              <MenuItem
                icon={CheckCircle2}
                label={task.status === "Completed" ? "Mark as not completed" : "Mark as completed"}
                onClick={() => {
                  setIsOpen(false);
                  onToggleStatus();
                }}
              />
            )}
            {canEdit && (
              <MenuItem
                icon={Trash2}
                label="Delete task"
                destructive
                onClick={() => {
                  setIsOpen(false);
                  onDelete();
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
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
        // Matches ProjectActionsMenu.tsx's own destructive MenuItem — no
        // red, delete is signaled by the icon/label alone plus the
        // stronger --text weight, keeping this monochromatic too.
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

/* ============================================================
   TASK ROW
============================================================ */

/** Also used by Tasks.tsx's handleSaveTask to compute the "before" assignee keys for change-detection — not purely a rendering helper. */
export function getTaskAssignees(task: Task): TeamMember[] {
  if (task.assignees && task.assignees.length > 0) {
    return task.assignees;
  }

  if (task.assignee) {
    return [task.assignee];
  }

  return [];
}

export interface TaskRowProps {
  task: Task;
  /** Editor+ on the task's project — gates the status-toggle/delete actions only; opening the row to view details stays available to everyone. */
  canEdit: boolean;
  onClick: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

export function TaskRow({ task, canEdit, onClick, onToggleStatus, onDelete }: TaskRowProps) {
  const assignees = getTaskAssignees(task);
  const accent = PRIORITY_ACCENT[task.priority];

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
      // Below `sm`, the row's fixed-width metadata (due date, comment
      // count, avatars, actions menu) no longer fits alongside the title
      // on one line — with the default `flex-wrap: nowrap` that meant
      // those items got squeezed or clipped by DashboardLayout's
      // page-level overflow-x-hidden instead of actually shrinking,
      // silently hiding real functionality on narrow phones. Wrapping
      // lets the title/status stay on their own line and the metadata
      // reflow onto a second line instead of disappearing; `sm:flex-nowrap`
      // restores the exact original single-line layout everywhere the
      // row already had room for it (640px+, unchanged from before).
      className="bg-card border-soft hover:shadow-[0_6px_20px_-10px_rgba(32,36,43,0.22)] hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-dark)] flex-wrap sm:flex-nowrap"
      style={{
        width: "100%",
        borderRadius: 14,
        borderLeft: `${accent.borderWidth}px solid ${accent.dot}`,
        padding: "13px 16px 13px 14px",
        display: "flex",
        alignItems: "center",
        rowGap: 10,
        columnGap: 14,
        cursor: "pointer",
        textAlign: "left",
        transition: "box-shadow 200ms ease, transform 200ms ease, border-color 200ms ease",
      }}
    >
      {/* STATUS CONTROL — three status states, three steps of the same
          blue: To Do is the lightest/least emphasis, In Progress steps up
          to the primary blue, Completed deliberately drops to the muted/
          low-contrast step so it reads as "done" without switching to
          green. Icon shape (circle/clock/check) still carries the actual
          status, same as before — color is reinforcement, not the only
          signal. */}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleStatus();
        }}
        disabled={!canEdit}
        aria-label={task.status === "Completed" ? "Mark as not completed" : "Mark as completed"}
        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-dark)]"
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          border: "none",
          padding: 0,
          background:
            task.status === "Completed"
              ? "color-mix(in srgb, var(--blue-muted) 30%, var(--surface-2))"
              : task.status === "In Progress"
                ? "color-mix(in srgb, var(--blue-dark) 20%, var(--surface-2))"
                : "var(--blue-tint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          cursor: canEdit ? "pointer" : "default",
          transition: "background-color 200ms ease, transform 150ms ease",
        }}
      >
        {task.status === "Completed" ? (
          <CheckCircle2 size={16} color="var(--blue-muted)" />
        ) : task.status === "In Progress" ? (
          <Clock3 size={16} color="var(--blue-dark)" />
        ) : (
          // Same --blue-dark stroke as In Progress — var(--blue) itself is
          // too pale to read as a thin icon stroke against the equally
          // pale --blue-tint background it sits on. To Do stays visually
          // "lighter" through the tint background alone, one of several
          // shades/tints the row already varies (border weight, badge
          // tint, checkbox fill).
          <Circle size={16} color="var(--blue-dark)" />
        )}
      </button>

      {/* MAIN */}

      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="flex items-center" style={{ gap: 9, marginBottom: 4 }}>
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 650,
              color: "var(--text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {task.title}
          </span>

          <PriorityBadge priority={task.priority} />
        </div>

        <div className="flex items-center" style={{ gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 650, flexShrink: 0 }}>{task.project}</span>

          {task.description && (
            <>
              <span aria-hidden="true" style={{ color: "var(--text-3)", fontSize: 11 }}>
                ·
              </span>
              <span
                className="text-ink-3"
                style={{
                  fontSize: 11,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                }}
              >
                {task.description}
              </span>
            </>
          )}
        </div>
      </div>

      {/* DUE DATE */}

      <div style={{ minWidth: 78, flexShrink: 0 }}>
        <DueDate task={task} />
      </div>

      {/* COMMENTS */}

      <div className="flex items-center text-ink-3" style={{ gap: 5, fontSize: 11, minWidth: 34, flexShrink: 0 }}>
        <MessageSquare size={13} />
        {task.comments?.length ?? 0}
      </div>

      {/* ASSIGNEES */}

      <AvatarStack people={assignees} />

      {/* ACTIONS */}

      <TaskRowMenu task={task} canEdit={canEdit} onOpen={onClick} onToggleStatus={onToggleStatus} onDelete={onDelete} />
    </div>
  );
}

/* ============================================================
   TASK GROUP
============================================================ */

export interface TaskGroupProps {
  title: string;
  tasks: Task[];
  /** false when a single status tab is active — showing "To Do (5)" again right under the "To Do" tab is redundant. */
  showHeader?: boolean;
  canEditTask: (task: Task) => boolean;
  onTaskClick: (task: Task) => void;
  onToggleStatus: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

export function TaskGroup({
  title,
  tasks,
  showHeader = true,
  canEditTask,
  onTaskClick,
  onToggleStatus,
  onDeleteTask,
}: TaskGroupProps) {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <section style={{ marginBottom: 24 }}>
      {showHeader && (
        <div className="flex items-center" style={{ gap: 8, marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 13, fontWeight: 650, color: "var(--text)" }}>{title}</h2>

          <span
            style={{
              minWidth: 22,
              height: 22,
              padding: "0 6px",
              borderRadius: 999,
              background: "var(--surface-2)",
              color: "var(--text-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10.5,
              fontWeight: 650,
            }}
          >
            {tasks.length}
          </span>
        </div>
      )}

      <div className="flex flex-col" style={{ gap: 8 }}>
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            canEdit={canEditTask(task)}
            onClick={() => onTaskClick(task)}
            onToggleStatus={() => onToggleStatus(task)}
            onDelete={() => onDeleteTask(task)}
          />
        ))}
      </div>
    </section>
  );
}
