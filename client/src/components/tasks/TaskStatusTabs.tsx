import { useRef } from "react";
import type { KeyboardEvent } from "react";

/* ============================================================
   TASK STATUS TABS

   The single status-filtering control for the Tasks page — driven by
   the same `statusFilter` state Tasks.tsx already had (previously
   exposed as a plain <select>). Replacing that select with tabs (rather
   than adding tabs alongside it) keeps exactly one status filter instead
   of two competing ones. "All" is kept as the first tab so the existing
   "view every status at once" behavior (the page's default) stays
   reachable, on top of the three tabs the redesign asks for.

   A real (if small) roving-tabindex implementation: Left/Right move
   focus between tabs, Home/End jump to the ends — the standard WAI-ARIA
   tabs keyboard pattern.
============================================================ */

export interface TaskStatusTab<T extends string> {
  key: T;
  label: string;
  count: number;
}

interface TaskStatusTabsProps<T extends string> {
  tabs: TaskStatusTab<T>[];
  active: T;
  onChange: (key: T) => void;
}

export function TaskStatusTabs<T extends string>({ tabs, active, onChange }: TaskStatusTabsProps<T>) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusTab(index: number) {
    const clamped = (index + tabs.length) % tabs.length;
    buttonRefs.current[clamped]?.focus();
    onChange(tabs[clamped].key);
  }

  function handleKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(tabs.length - 1);
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Filter tasks by status"
      className="flex items-center border-soft-t"
      style={{ gap: 4, borderBottom: "1px solid var(--border)", marginBottom: 18 }}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.key === active;

        return (
          <button
            key={tab.key}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.key)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className="flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-dark)]"
            style={{
              position: "relative",
              gap: 7,
              padding: "10px 4px",
              marginRight: 18,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: isActive ? 650 : 550,
              color: isActive ? "var(--text)" : "var(--text-2)",
              transition: "color 200ms ease",
            }}
          >
            {tab.label}

            <span
              style={{
                minWidth: 20,
                height: 20,
                padding: "0 6px",
                borderRadius: 999,
                background: isActive ? "var(--blue-tint)" : "var(--surface-2)",
                color: isActive ? "var(--blue-dark)" : "var(--text-3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10.5,
                fontWeight: 700,
                transition: "background-color 200ms ease, color 200ms ease",
              }}
            >
              {tab.count}
            </span>

            {/* Active-state bottom indicator — sits 1px below the container's own border so it visually overrides it for the active tab only. */}
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: -1,
                height: 2,
                borderRadius: 2,
                background: isActive ? "var(--blue-dark)" : "transparent",
                transition: "background-color 200ms ease",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
