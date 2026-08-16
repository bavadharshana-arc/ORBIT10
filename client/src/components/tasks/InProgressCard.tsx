import { useMemo } from "react";

import {
  Clock3,
  Flame,
  CalendarClock,
} from "lucide-react";

import { getDueGroup } from "../../data/taskData";
import { useTaskContext } from "../../context/taskContextValue";

/* ============================================================
   IN PROGRESS CARD (right sidebar)

   Premium productivity widget replacing the old completed-tasks
   list. Every number here is derived live from the shared
   TaskContext, so it stays in sync with edits made anywhere in
   the app (Tasks, Kanban, Calendar, Timeline/Gantt).
============================================================ */

export function InProgressCard() {
  const { tasks } = useTaskContext();

  const stats = useMemo(() => {
    const total = tasks.length;

    const inProgressTasks = tasks.filter(
      (task) => task.status === "In Progress"
    );

    const completedCount = tasks.filter(
      (task) => task.status === "Completed"
    ).length;

    const highPriorityInProgress = inProgressTasks.filter(
      (task) => task.priority === "High"
    ).length;

    const dueTodayCount = tasks.filter(
      (task) => getDueGroup(task.dueDate) === "Today"
    ).length;

    const inProgressCount = inProgressTasks.length;

    const progressShare =
      total > 0 ? Math.round((inProgressCount / total) * 100) : 0;

    const completionPercentage =
      total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return {
      total,
      inProgressCount,
      progressShare,
      completionPercentage,
      highPriorityInProgress,
      dueTodayCount,
    };
  }, [tasks]);

  return (
    <div
      className="bg-card border-soft shadow-float fade-in"
      style={{
        borderRadius: 22,
        padding: 20,
      }}
    >
      {/* HEADER */}

      <div
        className="flex items-center"
        style={{
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div className="flex items-center" style={{ gap: 9 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              background: "var(--blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Clock3 size={15} color="var(--text)" />
          </div>

          <span
            className="font-display"
            style={{
              fontSize: 15.5,
              fontWeight: 560,
              color: "var(--text)",
            }}
          >
            In Progress
          </span>
        </div>

        <span
          style={{
            fontSize: 10.5,
            fontWeight: 650,
            color: "var(--blue-dark)",
            background: "var(--surface-2)",
            borderRadius: 999,
            padding: "4px 9px",
          }}
        >
          {stats.progressShare}% of all tasks
        </span>
      </div>

      {/* BIG STAT */}

      <div
        className="flex items-baseline"
        style={{ gap: 6, marginBottom: 10 }}
      >
        <span
          className="font-display"
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: "var(--text)",
            lineHeight: 1,
          }}
        >
          {stats.inProgressCount}
        </span>

        <span
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "var(--text-3)",
          }}
        >
          / {stats.total}
        </span>

        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-2)",
            marginLeft: 2,
          }}
        >
          tasks in progress
        </span>
      </div>

      {/* PROGRESS BAR */}

      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: "var(--surface-2)",
          overflow: "hidden",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: `${stats.progressShare}%`,
            height: "100%",
            background: "var(--blue-dark)",
            borderRadius: 999,
            transition: "width 400ms ease",
          }}
        />
      </div>

      {/* COMPLETION PERCENTAGE */}

      <div
        className="flex items-center"
        style={{
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <span
          style={{
            fontSize: 11.5,
            color: "var(--text-2)",
            fontWeight: 500,
          }}
        >
          Overall completion
        </span>

        <span
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: "var(--text)",
          }}
        >
          {stats.completionPercentage}%
        </span>
      </div>

      {/* MINI STAT TILES */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <div
          style={{
            background: "var(--surface-2)",
            borderRadius: 14,
            padding: "11px 12px",
          }}
        >
          <div
            className="flex items-center"
            style={{ gap: 6, marginBottom: 8 }}
          >
            <Flame size={13} color="var(--blue-dark)" />

            <span
              style={{
                fontSize: 10.5,
                fontWeight: 650,
                color: "var(--text-2)",
              }}
            >
              High priority
            </span>
          </div>

          <span
            className="font-display"
            style={{
              fontSize: 19,
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            {stats.highPriorityInProgress}
          </span>
        </div>

        <div
          style={{
            background: "var(--surface-2)",
            borderRadius: 14,
            padding: "11px 12px",
          }}
        >
          <div
            className="flex items-center"
            style={{ gap: 6, marginBottom: 8 }}
          >
            <CalendarClock size={13} color="var(--blue-dark)" />

            <span
              style={{
                fontSize: 10.5,
                fontWeight: 650,
                color: "var(--text-2)",
              }}
            >
              Due today
            </span>
          </div>

          <span
            className="font-display"
            style={{
              fontSize: 19,
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            {stats.dueTodayCount}
          </span>
        </div>
      </div>
    </div>
  );
}
