import { Clock3 } from "lucide-react";

export interface DeadlineItem {
  /** Task title, or project name for a project-level deadline. */
  name: string;
  /** Project name (task's parent project, or the project's own tag for a project-level row). */
  projectName: string;
  /** Already-formatted relative deadline text — Task.due / Project.due (via formatProjectDue), the same strings every other view on this page already shows. Never re-derived here. */
  relative: string;
}

interface UpcomingDeadlinesCardProps {
  items: DeadlineItem[];
}

/**
 * One of the three info cards below the project grid. `items` is built
 * by the caller (Projects.tsx) from the existing getUpcomingTasks() /
 * getUpcomingProjects() helpers — the same "what's due soon" logic the
 * Dashboard's own Upcoming widget already uses — so this stays purely
 * presentational, no second deadline-computation source.
 */
export function UpcomingDeadlinesCard({ items }: UpcomingDeadlinesCardProps) {
  return (
    <div className="bg-card border-soft shadow-float fade-in" style={{ borderRadius: 22, padding: 22 }}>
      <div className="flex items-center" style={{ gap: 12, marginBottom: 18 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: "rgba(216,166,87,0.16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Clock3 size={18} strokeWidth={2} color="#D8A657" />
        </div>
        <div>
          <div className="font-display" style={{ fontSize: 15.5, fontWeight: 560, color: "var(--text)" }}>
            Upcoming deadlines
          </div>
          <div style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 500 }}>Due today through this week</div>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-ink-3" style={{ fontSize: 12.5, margin: 0 }}>Nothing due soon.</p>
      ) : (
        <div className="flex flex-col" style={{ gap: 14 }}>
          {items.map((item, index) => (
            <div key={`${item.name}-${index}`} className="flex items-start justify-between" style={{ gap: 10 }}>
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
                  {item.name}
                </div>
                <div className="text-ink-3" style={{ fontSize: 11.5, marginTop: 2 }}>{item.projectName}</div>
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: "#D8A657",
                  background: "rgba(216,166,87,0.14)",
                  padding: "3px 9px",
                  borderRadius: 999,
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {item.relative}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
