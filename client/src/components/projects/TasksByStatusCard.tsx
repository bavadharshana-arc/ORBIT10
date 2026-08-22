import { CheckSquare } from "lucide-react";

interface TasksByStatusCardProps {
  notStarted: number;
  inProgress: number;
  completed: number;
}

/**
 * One of the three info cards below the project grid. Real counts only —
 * the frontend's Task.status is genuinely just "To Do" / "In Progress" /
 * "Completed" (see TaskContext.tsx's clampStatus, which folds the
 * backend's "In Review" into "In Progress" before a Task ever reaches a
 * component, and anything else into "To Do"). A 4th "In review" bucket
 * would fabricate a split the data no longer preserves by the time it
 * gets here, so this shows the 3 buckets that are actually real —
 * "To Do" relabeled "Not started" for display only, same status value.
 */
export function TasksByStatusCard({ notStarted, inProgress, completed }: TasksByStatusCardProps) {
  const total = notStarted + inProgress + completed;
  const rows: { label: string; count: number; color: string }[] = [
    { label: "Not started", count: notStarted, color: "var(--text-3)" },
    { label: "In progress", count: inProgress, color: "var(--blue-dark)" },
    { label: "Completed", count: completed, color: "var(--blue)" },
  ];

  return (
    <div className="bg-card border-soft shadow-float fade-in" style={{ borderRadius: 22, padding: 22 }}>
      <div className="flex items-center" style={{ gap: 12, marginBottom: 18 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: "var(--blue-tint)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <CheckSquare size={18} strokeWidth={2} color="var(--blue-dark)" />
        </div>
        <div>
          <div className="font-display" style={{ fontSize: 15.5, fontWeight: 560, color: "var(--text)" }}>
            Tasks by status
          </div>
          <div style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 500 }}>Across every project</div>
        </div>
      </div>

      <div className="flex flex-col" style={{ gap: 14 }}>
        {rows.map((row) => {
          const share = total === 0 ? 0 : row.count / total;
          return (
            <div key={row.label}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, color: "var(--text-2)", fontWeight: 500 }}>{row.label}</span>
                <span style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 650 }}>{row.count}</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${share * 100}%`,
                    height: "100%",
                    background: row.color,
                    borderRadius: 999,
                    transition: "width 400ms ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
