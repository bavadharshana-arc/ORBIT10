import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock } from "lucide-react";

import { formatDueLabel, getDueGroup, getUpcomingTasks, type DueGroup } from "../../data/taskData";
import { useTaskContext } from "../../context/taskContextValue";

/* ============================================================
   UPCOMING DEADLINES CARD (Tasks page — right sidebar, card 3)

   Reuses getUpcomingTasks() — the exact same "what's due soon" source
   Dashboard.tsx, Projects.tsx, and Analytics.tsx already build their own
   upcoming-deadline lists from — so this introduces no second definition
   of "upcoming". That helper already excludes Completed tasks and
   anything Overdue (an "upcoming" list is inherently forward-looking, a
   convention every other view here already follows), so in practice
   items only ever land in the Today/Tomorrow/This Week tiers below.
   Overdue styling is kept anyway (not just Today/soon) so the card stays
   correct if that ever changes.
============================================================ */

// Monochromatic ORBIT blue — urgency steps down through shade, not hue:
// Overdue gets the deepest blue, Today the primary blue, Tomorrow/This
// Week the same primary blue at a lighter tint, and anything further out
// falls back to plain neutral (no blue at all — restrained, not another
// accent color).
const URGENCY_STYLE: Record<DueGroup, { color: string; tint: string }> = {
  Overdue: { color: "var(--blue-deep)", tint: "color-mix(in srgb, var(--blue-deep) 16%, transparent)" },
  Today: { color: "var(--blue-dark)", tint: "color-mix(in srgb, var(--blue-dark) 18%, transparent)" },
  Tomorrow: { color: "var(--blue-dark)", tint: "var(--blue-tint)" },
  "This Week": { color: "var(--blue-dark)", tint: "var(--blue-tint)" },
  Later: { color: "var(--text-2)", tint: "var(--surface-2)" },
  "No Due Date": { color: "var(--text-3)", tint: "var(--surface-2)" },
};

export function UpcomingDeadlinesCard() {
  const { tasks } = useTaskContext();

  const items = useMemo(() => getUpcomingTasks(tasks, 4), [tasks]);

  return (
    <div className="bg-card border-soft shadow-float fade-in" style={{ borderRadius: 22, padding: "18px 18px 16px" }}>
      <div className="flex items-center" style={{ gap: 9, marginBottom: 16 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            background: "var(--surface-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <CalendarClock size={15} color="var(--text-2)" />
        </div>

        <span className="font-display" style={{ fontSize: 15.5, fontWeight: 560, color: "var(--text)" }}>
          Upcoming deadlines
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-ink-3" style={{ fontSize: 12, margin: "0 0 4px" }}>
          Nothing due soon.
        </p>
      ) : (
        <div className="flex flex-col" style={{ gap: 4 }}>
          {items.map((task) => {
            const group = getDueGroup(task.dueDate);
            const urgency = URGENCY_STYLE[group];

            return (
              <div
                key={task.id}
                className="flex items-center justify-between"
                style={{ gap: 10, padding: "8px 0", borderTop: "1px solid var(--border)" }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 650,
                      color: "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {task.title}
                  </div>
                  <div className="text-ink-3" style={{ fontSize: 11, marginTop: 2 }}>
                    {task.project}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: urgency.color,
                    background: urgency.tint,
                    padding: "3px 9px",
                    borderRadius: 999,
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  {group === "Overdue" ? "Overdue" : group === "Today" ? "Today" : formatDueLabel(task.dueDate, task.due)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Link
        to="/calendar"
        className="flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-dark)]"
        style={{
          gap: 5,
          marginTop: 14,
          fontSize: 11.5,
          fontWeight: 650,
          color: "var(--blue-dark)",
          textDecoration: "none",
        }}
      >
        View calendar
        <ArrowRight size={12} />
      </Link>
    </div>
  );
}
