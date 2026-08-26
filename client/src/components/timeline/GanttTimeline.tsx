import type { ReactNode } from "react";
import { Clock, CheckCircle2, Clock3, Circle } from "lucide-react";

import type { PillTone } from "../../types/dashboard";
import type { Priority, Status, Task } from "../../data/taskData";
import { Pill } from "../ui/Pill";
import { AvatarStack } from "../ui/AvatarStack";

/**
 * The Gantt-rendering guts of the main Timeline page (src/pages/Timeline.tsx)
 * — date math, the day-grid header, and the task-bar/milestone row — pulled
 * out so the Project Workspace Timeline tab can render the same accurate,
 * date-scaled Gantt for a single project's tasks instead of duplicating (or
 * worse, re-approximating) this logic. Timeline.tsx imports these too, so
 * there's exactly one implementation of "where does this task's bar sit on
 * the day grid" for the whole app.
 */

/* ============================================================
   CONSTANTS
============================================================ */

// Widened from 360 — real task titles ("Set up Lighthouse performance
// budget in CI") were running right up against the edge of the sticky
// label column, leaving no room to spare before wrapping/crowding the
// priority+status pills below. Still a fixed pixel width (not a
// hardcoded huge one) because the day-track's own bar/milestone math is
// independent of it — bumping this number only widens the label column,
// nothing downstream needs to change.
export const LABEL_WIDTH = 400;

// The real Task model (server/prisma/schema.prisma) has no `startDate`
// column at all — only `dueDate` — so `TaskGanttRow` below always falls
// back to a same-day bar for every real task (see its own comment). At a
// single day's actual column width (dayWidth-10 -> as little as 16px in
// month view, 34px in week view) that fallback bar reads as a tiny,
// near-invisible tick rather than a real bar, which is what made the
// whole grid look sparse/empty. This is a floor on rendered *width* only
// — it never changes `barLeft` (still exactly the due/start date's own
// column) or invents a multi-day span, so date alignment stays exact;
// it just makes a real bar big enough to actually read as one, with room
// for its status icon and a few characters of title.
export const MIN_BAR_WIDTH = 92;

export const RANGE_PADDING_DAYS = 3;
export const MAX_RANGE_DAYS = 180;

export type ViewMode = "week" | "month";

export const DAY_WIDTH: Record<ViewMode, number> = {
  week: 44,
  month: 26,
};

export const WEEKDAY_LABELS_MINI = ["S", "M", "T", "W", "T", "F", "S"];

export const PRIORITY_TONE: Record<Priority, PillTone> = {
  Low: "surface",
  Medium: "blue",
  High: "dark",
};

export const STATUS_BAR_COLOR: Record<Status, string> = {
  "To Do": "var(--border)",
  "In Progress": "var(--blue)",
  Completed: "var(--text)",
};

export const STATUS_ICON: Record<Status, typeof CheckCircle2> = {
  "To Do": Circle,
  "In Progress": Clock3,
  Completed: CheckCircle2,
};

const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/* ============================================================
   DATE HELPERS
============================================================ */

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Parses `task.due` — a free-text label, e.g. a raw ISO date
 * ("2026-08-15"), or a human-readable one ("Today, 11:00 AM", "Tomorrow",
 * "Yesterday", "This Friday", "Next Week", "No due date") — into a concrete
 * Date, relative to `today`. `due` is edited independently of the
 * canonical `dueDate` field, so this is only a fallback for tasks without
 * one; see `resolveTaskDueDate`, which every positioning call site should
 * use instead of calling this directly.
 */
export function parseTaskDue(due: string, today: Date): Date | null {
  const trimmed = due.trim();
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase();

  if (normalized === "no due date") return null;
  if (normalized.startsWith("today")) return today;
  if (normalized.startsWith("tomorrow")) return addDays(today, 1);
  if (normalized.startsWith("yesterday")) return addDays(today, -1);
  if (normalized === "next week") return addDays(today, 7);

  const isoMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return new Date(year, month - 1, day);
  }

  for (let i = 0; i < WEEKDAY_NAMES.length; i++) {
    if (normalized.includes(WEEKDAY_NAMES[i])) {
      const todayDow = today.getDay();
      let diff = i - todayDow;
      if (diff <= 0) diff += 7;
      return addDays(today, diff);
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return startOfDay(parsed);
  }

  return null;
}

/**
 * Parses `task.startDate` — a raw ISO date ("2026-08-15") — into a concrete
 * Date. Unlike `due`, start dates are never human-readable labels, so this
 * only needs to understand the ISO shape.
 */
export function parseIsoDate(value: string | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!isoMatch) return null;
  const year = Number(isoMatch[1]);
  const month = Number(isoMatch[2]);
  const day = Number(isoMatch[3]);
  return new Date(year, month - 1, day);
}

/**
 * Resolves a task's effective due date for the Gantt: `task.dueDate` (the
 * canonical ISO date set by the drawer's date picker — the same field the
 * MiniCalendar, Tasks page filtering, and `getDueGroup()` all trust) takes
 * priority over `task.due` (a free-text label edited independently in its
 * own input, e.g. "This Friday" or a stale "Today, 11:00 AM") since the two
 * can drift out of sync. `due` is only consulted as a fallback for tasks
 * that predate `dueDate` and never got one, so every call site positions
 * bars from the same real date instead of re-deriving (and risking
 * disagreeing about) "when is this task actually due".
 */
export function resolveTaskDueDate(task: Task, today: Date): Date | null {
  return parseIsoDate(task.dueDate) ?? parseTaskDue(task.due, today);
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatRangeLabel(start: Date, end: Date): string {
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

/**
 * Derives the visible day range from a set of tasks: spans every real due
 * date (via `resolveTaskDueDate`) and start date (`task.startDate`), always
 * includes `today`, clamps any stray far-flung date to `MAX_RANGE_DAYS` so
 * one bad date can't blow out the whole grid, and pads a few days on each
 * end.
 */
export function computeDateRange(tasks: Task[], today: Date): { rangeStart: Date; rangeEnd: Date } {
  const clampToToday = (date: Date): Date => {
    const offset = daysBetween(today, date);
    if (offset > MAX_RANGE_DAYS) return addDays(today, MAX_RANGE_DAYS);
    if (offset < -MAX_RANGE_DAYS) return addDays(today, -MAX_RANGE_DAYS);
    return date;
  };

  const dueDates = tasks
    .map((task) => resolveTaskDueDate(task, today))
    .filter((date): date is Date => date !== null)
    .map(clampToToday);

  const startDates = tasks
    .map((task) => parseIsoDate(task.startDate))
    .filter((date): date is Date => date !== null)
    .map(clampToToday);

  const allDates = [today, ...dueDates, ...startDates];
  const minTime = Math.min(...allDates.map((date) => date.getTime()));
  const maxTime = Math.max(...allDates.map((date) => date.getTime()));

  const start = addDays(new Date(minTime), -RANGE_PADDING_DAYS);
  const end = addDays(new Date(maxTime), RANGE_PADDING_DAYS);

  return { rangeStart: start, rangeEnd: end };
}

/* ============================================================
   GANTT ROW SHELL
   Shared layout for every row: a sticky label cell (frozen while the day
   track scrolls horizontally) followed by the day track. `daysWidth` is
   required and applied explicitly so the day track is never left to
   implicit flex sizing — that's what left task bars without a
   deterministic coordinate space to position in.
============================================================ */

export function GanttRow({
  totalWidth,
  daysWidth,
  labelBackground,
  borderBottom,
  label,
  onClick,
  children,
}: {
  totalWidth: number;
  daysWidth: number;
  labelBackground: string;
  borderBottom?: string;
  label: ReactNode;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className={onClick ? "nav-item" : undefined}
      style={{
        display: "flex",
        width: totalWidth,
        borderBottom,
        cursor: onClick ? "pointer" : undefined,
      }}
    >
      <div
        style={{
          position: "sticky",
          left: 0,
          zIndex: 2,
          width: LABEL_WIDTH,
          flexShrink: 0,
          background: labelBackground,
          // A safety net shared by every label renderer (date header,
          // project group header, task row) — the label column always
          // has a "reasonable minimum width" (LABEL_WIDTH above), but
          // this guarantees nothing inside it can ever visually bleed
          // past that width into the day-track/timeline area, whatever
          // its content ends up being.
          overflow: "hidden",
        }}
      >
        {label}
      </div>
      <div style={{ width: daysWidth, flexShrink: 0 }}>{children}</div>
    </div>
  );
}

/* ============================================================
   DATE HEADER ROW
============================================================ */

export function TimelineDateHeader({
  days,
  today,
  dayWidth,
  daysWidth,
  totalWidth,
}: {
  days: Date[];
  today: Date;
  dayWidth: number;
  daysWidth: number;
  totalWidth: number;
}) {
  return (
    <GanttRow
      totalWidth={totalWidth}
      daysWidth={daysWidth}
      labelBackground="var(--card)"
      borderBottom="1px solid var(--border)"
      label={
        <div className="text-ink-3" style={{ fontSize: 11, fontWeight: 650, padding: "0 4px 5px" }}>
          Task
        </div>
      }
    >
      <div style={{ display: "flex" }}>
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              style={{
                width: dayWidth,
                flexShrink: 0,
                textAlign: "center",
                paddingBottom: 5,
                background: isToday ? "rgba(142,167,191,0.12)" : "transparent",
              }}
            >
              <div className="text-ink-3" style={{ fontSize: 10, fontWeight: 600 }}>
                {WEEKDAY_LABELS_MINI[day.getDay()]}
              </div>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "2px auto 0",
                  fontSize: 11,
                  fontWeight: 650,
                  background: isToday ? "var(--text)" : "transparent",
                  color: isToday ? "var(--surface)" : "var(--text)",
                }}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>
    </GanttRow>
  );
}

/* ============================================================
   TASK ROW
============================================================ */

export function TaskGanttRow({
  task,
  days,
  today,
  dayWidth,
  daysWidth,
  totalWidth,
  isSelected = false,
  onSelect,
}: {
  task: Task;
  days: Date[];
  today: Date;
  dayWidth: number;
  daysWidth: number;
  totalWidth: number;
  /** True when this is the task currently open in the task details drawer — gives the row a clear selected state instead of no feedback at all once you've clicked it. */
  isSelected?: boolean;
  onSelect: () => void;
}) {
  const dueDate = resolveTaskDueDate(task, today);
  const isMilestone = Boolean(task.isMilestone);

  /*
   * Every task with a due date renders as a Gantt bar regardless of status
   * — falling back to a same-day bar when no startDate was given. Only
   * tasks explicitly flagged isMilestone use the diamond marker instead,
   * since that's a genuine single-point checkpoint rather than missing
   * data.
   */
  const rawStartDate = parseIsoDate(task.startDate);
  const startDate = isMilestone ? null : rawStartDate ?? dueDate;
  const hasBar = Boolean(!isMilestone && dueDate && startDate && startDate.getTime() <= dueDate.getTime());
  // Falls back to the "To Do" icon for any status that isn't one of the
  // three STATUS_ICON keys — e.g. a stale value cached in localStorage
  // from before the Status union was narrowed — so an unrecognized status
  // can never resolve to `undefined` and crash the row's render.
  const StatusIcon = STATUS_ICON[task.status] ?? Circle;

  const assigneeNames = task.assignees.map((assignee) => assignee.initials).join(", ");

  const tooltip = [
    task.title,
    task.status,
    `${task.priority} priority`,
    assigneeNames ? `Assignees: ${assigneeNames}` : "Unassigned",
    hasBar && startDate && dueDate ? `${formatShortDate(startDate)} → ${formatShortDate(dueDate)}` : `Due: ${task.due || "No due date"}`,
  ].join(" · ");

  const rangeStartDay = days[0];
  const barLeft = hasBar && startDate ? daysBetween(rangeStartDay, startDate) * dayWidth : 0;
  const barWidth = hasBar && startDate && dueDate ? Math.max(MIN_BAR_WIDTH, (daysBetween(startDate, dueDate) + 1) * dayWidth - 10) : 0;
  const milestoneLeft = !hasBar && dueDate ? daysBetween(rangeStartDay, dueDate) * dayWidth : 0;
  const isHighPriority = task.priority === "High";

  return (
    <GanttRow
      totalWidth={totalWidth}
      daysWidth={daysWidth}
      labelBackground={isSelected ? "var(--surface-2)" : "var(--card)"}
      borderBottom="1px solid var(--surface-2)"
      onClick={onSelect}
      label={
        <div
          style={{
            padding: "9px 4px 9px 9px",
            // Reserves the same 3px regardless of state so selecting a
            // row never shifts its content — same technique TaskRow.tsx
            // already uses for its own priority-accent border.
            borderLeft: isSelected ? "3px solid var(--blue-dark)" : "3px solid transparent",
          }}
        >
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 650,
              color: "var(--text)",
              // The wider LABEL_WIDTH above already gives most real
              // titles room to sit on one line; anything still too long
              // now ellipses cleanly (the `title` attribute keeps the
              // full text on hover) instead of wrapping and stretching
              // the row's height unpredictably per task.
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.3,
              marginBottom: 4,
            }}
            title={task.title}
          >
            {task.title}
          </div>

          <div className="flex items-center flex-wrap" style={{ gap: 4, marginBottom: 5 }}>
            <Pill tone={PRIORITY_TONE[task.priority]}>{task.priority}</Pill>
            <Pill tone="surface">{task.status}</Pill>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center text-ink-3" style={{ gap: 4, fontSize: 10.5 }}>
              <Clock size={11} />
              {task.due || "No due date"}
            </span>

            {task.assignees.length > 0 && <AvatarStack people={task.assignees} />}
          </div>
        </div>
      }
    >
      <div style={{ position: "relative", display: "flex", height: "100%" }}>
        {days.map((day) => {
          const isToday = isSameDay(day, today);

          return (
            <div
              key={day.toISOString()}
              style={{
                width: dayWidth,
                flexShrink: 0,
                height: "100%",
                background: isSelected ? "var(--surface-2)" : isToday ? "rgba(142,167,191,0.08)" : "transparent",
              }}
            />
          );
        })}

        {hasBar && (
          <div
            title={tooltip}
            onClick={onSelect}
            className="flex items-center"
            style={{
              position: "absolute",
              left: barLeft + 5,
              top: "50%",
              transform: "translateY(-50%)",
              width: barWidth,
              height: 24,
              borderRadius: 7,
              background: STATUS_BAR_COLOR[task.status],
              // A subtle "was this High priority" edge — an inset shadow
              // rather than a border/outline so it never changes the
              // bar's actual rendered width (which has to stay exactly
              // `barWidth` for date alignment to stay honest), and a
              // translucent dark tone so it still reads against every
              // status color, including the darkest (Completed).
              boxShadow: isHighPriority ? "inset 3px 0 0 0 rgba(32,36,43,0.35)" : undefined,
              outline: isSelected ? "2px solid var(--blue-dark)" : "none",
              outlineOffset: 1,
              gap: 4,
              paddingLeft: isHighPriority ? 9 : 6,
              paddingRight: 6,
              overflow: "hidden",
              cursor: "pointer",
            }}
          >
            <StatusIcon size={12} color={task.status === "Completed" ? "var(--surface)" : "var(--text)"} style={{ flexShrink: 0 }} />
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: task.status === "Completed" ? "var(--surface)" : "var(--text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {task.title}
            </span>
          </div>
        )}

        {!hasBar && dueDate && (
          <div
            title={tooltip}
            onClick={onSelect}
            style={{
              position: "absolute",
              left: milestoneLeft + dayWidth / 2 - 7,
              top: "50%",
              width: 14,
              height: 14,
              transform: "translateY(-50%) rotate(45deg)",
              borderRadius: 3,
              background: STATUS_BAR_COLOR[task.status],
              cursor: "pointer",
            }}
          />
        )}
      </div>
    </GanttRow>
  );
}

/* ============================================================
   NO DUE DATE CARD
============================================================ */

export function UnscheduledTaskCard({ task, onSelect }: { task: Task; onSelect: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className="border-soft"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: 80,
        padding: 9,
        borderRadius: 14,
        background: "var(--surface)",
        cursor: "pointer",
      }}
      title={`${task.title} · ${task.status} · ${task.project}`}
    >
      <Pill tone={PRIORITY_TONE[task.priority]}>{task.priority}</Pill>

      <div
        style={{
          fontSize: 12.5,
          fontWeight: 650,
          color: "var(--text)",
          lineHeight: 1.35,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {task.title}
      </div>

      {task.assignees.length > 0 ? (
        <AvatarStack people={task.assignees} />
      ) : (
        <span className="text-ink-3" style={{ fontSize: 10.5, fontWeight: 600 }}>
          Unassigned
        </span>
      )}
    </div>
  );
}
