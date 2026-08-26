import { ArrowUpDown, ChevronDown, Search } from "lucide-react";
import type { ReactNode } from "react";

/* ============================================================
   PILL SELECT

   A native <select> dressed up as a rounded SaaS-style control —
   deliberately still a real <select> (not a custom listbox) so keyboard
   support, screen readers, and mobile pickers all work for free. Mirrors
   the private PillSelect Kanban.tsx already has (visual consistency
   across the two task views) — kept as its own local copy here rather
   than extracted into a shared file, since touching Kanban.tsx isn't
   necessary for this page's redesign.
============================================================ */

interface PillSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  icon?: ReactNode;
}

function PillSelect({ label, value, options, onChange, icon }: PillSelectProps) {
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      {icon && (
        <span style={{ position: "absolute", left: 11, display: "flex", pointerEvents: "none", color: "var(--text-3)" }}>
          {icon}
        </span>
      )}

      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-dark)]"
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 11,
          padding: icon ? "8px 30px 8px 32px" : "8px 30px 8px 13px",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text)",
          cursor: "pointer",
          outline: "none",
          transition: "border-color 200ms ease, background-color 200ms ease",
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown size={13} color="var(--text-2)" style={{ position: "absolute", right: 10, pointerEvents: "none" }} />
    </div>
  );
}

/* ============================================================
   TASK FILTERS TOOLBAR

   Search + Priority + Due date + Sort by. Status filtering moved out of
   this toolbar entirely — TaskStatusTabs (rendered above it in
   Tasks.tsx) is now the single status control, so there's no longer a
   second, competing status dropdown here.
============================================================ */

export type SortMode = "default" | "dueDate" | "priority" | "title";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "default", label: "Sort: Default" },
  { value: "dueDate", label: "Sort: Due date" },
  { value: "priority", label: "Sort: Priority" },
  { value: "title", label: "Sort: Title (A–Z)" },
];

interface TaskFiltersProps {
  query: string;
  onQueryChange: (value: string) => void;
  priorityFilter: string;
  priorityOptions: { value: string; label: string }[];
  onPriorityChange: (value: string) => void;
  dueFilter: string;
  dueOptions: { value: string; label: string }[];
  onDueChange: (value: string) => void;
  sortMode: SortMode;
  onSortChange: (value: SortMode) => void;
}

export function TaskFilters({
  query,
  onQueryChange,
  priorityFilter,
  priorityOptions,
  onPriorityChange,
  dueFilter,
  dueOptions,
  onDueChange,
  sortMode,
  onSortChange,
}: TaskFiltersProps) {
  return (
    <div
      className="bg-card border-soft flex items-center"
      style={{ gap: 10, padding: 10, borderRadius: 14, marginBottom: 22, flexWrap: "wrap" }}
    >
      {/* SEARCH */}

      <div
        className="flex items-center focus-within:border-[var(--blue-dark)] focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-[var(--blue-dark)]"
        style={{
          gap: 8,
          flex: 1,
          minWidth: 200,
          padding: "8px 12px",
          borderRadius: 11,
          border: "1px solid var(--border)",
          background: "var(--surface-2)",
          transition: "border-color 200ms ease",
        }}
      >
        <Search size={15} color="var(--text-3)" aria-hidden="true" />

        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search tasks..."
          aria-label="Search tasks"
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 12.5,
            color: "var(--text)",
            width: "100%",
          }}
        />
      </div>

      <PillSelect label="Filter by priority" value={priorityFilter} options={priorityOptions} onChange={onPriorityChange} />

      <PillSelect label="Filter by due date" value={dueFilter} options={dueOptions} onChange={onDueChange} />

      <PillSelect
        label="Sort tasks"
        value={sortMode}
        options={SORT_OPTIONS}
        onChange={(value) => onSortChange(value as SortMode)}
        icon={<ArrowUpDown size={13} />}
      />
    </div>
  );
}
