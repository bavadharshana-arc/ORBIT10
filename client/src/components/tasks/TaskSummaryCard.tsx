import { useMemo } from "react";

import { useTaskContext } from "../../context/taskContextValue";

/* ============================================================
   TASK SUMMARY CARD (right sidebar)

   Compact breakdown of Total / To Do / In Progress / Completed
   task counts, calculated live from the shared TaskContext.
============================================================ */

interface SummaryRow {
  label: string;
  count: number;
  dotColor: string;
}

export function TaskSummaryCard() {
  const { tasks } = useTaskContext();

  const rows: SummaryRow[] = useMemo(() => {
    const toDo = tasks.filter(
      (task) => task.status === "To Do"
    ).length;

    const inProgress = tasks.filter(
      (task) => task.status === "In Progress"
    ).length;

    const completed = tasks.filter(
      (task) => task.status === "Completed"
    ).length;

    return [
      {
        label: "Total",
        count: tasks.length,
        dotColor: "var(--text)",
      },
      {
        label: "To Do",
        count: toDo,
        dotColor: "var(--text-3)",
      },
      {
        label: "In Progress",
        count: inProgress,
        dotColor: "var(--blue-dark)",
      },
      {
        label: "Completed",
        count: completed,
        dotColor: "var(--blue)",
      },
    ];
  }, [tasks]);

  return (
    <div
      className="bg-card border-soft shadow-float fade-in"
      style={{
        borderRadius: 22,
        padding: "16px 18px",
        marginTop: 16,
      }}
    >
      <span
        className="font-display"
        style={{
          fontSize: 14.5,
          fontWeight: 560,
          color: "var(--text)",
        }}
      >
        Task Summary
      </span>

      <div style={{ marginTop: 12 }}>
        {rows.map((row, index) => (
          <div
            key={row.label}
            className="flex items-center"
            style={{
              justifyContent: "space-between",
              padding: "8px 0",
              borderTop:
                index === 0 ? "none" : "1px solid var(--border)",
            }}
          >
            <div className="flex items-center" style={{ gap: 8 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: row.dotColor,
                  flexShrink: 0,
                }}
              />

              <span
                style={{
                  fontSize: 12,
                  fontWeight: row.label === "Total" ? 650 : 500,
                  color:
                    row.label === "Total"
                      ? "var(--text)"
                      : "var(--text-2)",
                }}
              >
                {row.label}
              </span>
            </div>

            <span
              className="font-display"
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              {row.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
