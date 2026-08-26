import { FolderKanban } from "lucide-react";
import { PROJECT_STATUS_META } from "../../data/projectData";

interface ProjectOverviewCardProps {
  total: number;
  active: number;
  completed: number;
  archived: number;
}

const ROWS: { key: "active" | "completed" | "archived"; label: string }[] = [
  { key: "active", label: PROJECT_STATUS_META.active.label },
  { key: "completed", label: PROJECT_STATUS_META.completed.label },
  { key: "archived", label: PROJECT_STATUS_META.archived.label },
];

/**
 * One of the three info cards below the project grid. Every number is a
 * real count the caller (Projects.tsx) already derived from
 * ProjectContext via the existing getProjectStatus() helper — this
 * component only lays them out, same "dumb presentational child" split
 * every other card on this page already follows (ProjectCard, etc.).
 */
export function ProjectOverviewCard({ total, active, completed, archived }: ProjectOverviewCardProps) {
  const counts = { active, completed, archived };

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
          <FolderKanban size={18} strokeWidth={2} color="var(--blue-dark)" />
        </div>
        <div>
          <div className="font-display" style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.1, color: "var(--text)" }}>
            {total}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 500 }}>Total projects</div>
        </div>
      </div>

      {/* Simple stacked distribution bar — proportion of active/completed/archived out of total, same PROJECT_STATUS_META colors every status badge already uses. */}
      <div className="flex items-center" style={{ height: 8, borderRadius: 999, overflow: "hidden", background: "var(--surface-2)", marginBottom: 16 }}>
        {total === 0 ? null : (
          ROWS.map(({ key }) => {
            const share = counts[key] / total;
            if (share <= 0) return null;
            return (
              <div
                key={key}
                style={{
                  width: `${share * 100}%`,
                  height: "100%",
                  background: PROJECT_STATUS_META[key].color,
                  transition: "width 400ms ease",
                }}
              />
            );
          })
        )}
      </div>

      <div className="flex flex-col" style={{ gap: 10 }}>
        {ROWS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="flex items-center" style={{ gap: 8 }}>
              <span
                aria-hidden="true"
                style={{ width: 7, height: 7, borderRadius: "50%", background: PROJECT_STATUS_META[key].color, flexShrink: 0 }}
              />
              <span style={{ fontSize: 12.5, color: "var(--text-2)", fontWeight: 500 }}>{label}</span>
            </span>
            <span style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 650 }}>{counts[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
