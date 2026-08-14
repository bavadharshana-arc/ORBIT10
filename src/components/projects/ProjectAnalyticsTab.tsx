import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ListChecks, CheckCircle2, AlertTriangle, Gauge, Diamond, Circle, Clock3 } from "lucide-react";

import { getDueGroup, type Status } from "../../data/taskData";
import { useProjectWorkspace } from "../../context/projectWorkspaceContext";
import { useIsDarkMode } from "../../hooks/useIsDarkMode";
import { LIGHT_THEME, DARK_THEME } from "../../data/chartTheme";
import { getMemberWorkload, getTaskCompletedAt } from "../../data/workspaceData";
import { StatCard } from "../dashboard/StatCard";
import { ProgressRing } from "../ui/ProgressRing";
import { Avatar } from "../ui/Avatar";
import { Pill } from "../ui/Pill";

function buildWeekBuckets(count: number) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return Array.from({ length: count }, (_, index) => {
    const weeksAgo = count - 1 - index;
    const end = new Date(todayStart);
    end.setDate(end.getDate() - weeksAgo * 7);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
  });
}

export function ProjectAnalyticsTab() {
  const { project, projectTasks } = useProjectWorkspace();
  const isDark = useIsDarkMode();
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  const total = projectTasks.length;
  const completed = projectTasks.filter((t) => t.status === "Completed").length;
  const inProgress = projectTasks.filter((t) => t.status === "In Progress").length;
  const todo = projectTasks.filter((t) => t.status === "To Do").length;
  const overdueTasks = projectTasks.filter((t) => t.status !== "Completed" && getDueGroup(t.dueDate) === "Overdue");
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const distribution = useMemo(
    () => [
      { status: "To Do" as Status, icon: Circle, color: theme.text3, count: todo },
      { status: "In Progress" as Status, icon: Clock3, color: theme.blueDark, count: inProgress },
      { status: "Completed" as Status, icon: CheckCircle2, color: theme.text, count: completed },
    ],
    [theme, todo, inProgress, completed]
  );

  const velocity = useMemo(() => {
    const buckets = buildWeekBuckets(8);
    const completedAt = projectTasks.map((task) => getTaskCompletedAt(task)).filter((ms): ms is number => ms !== null);
    return buckets.map((bucket) => ({
      label: bucket.label,
      completed: completedAt.filter((ms) => ms >= bucket.start.getTime() && ms <= bucket.end.getTime()).length,
    }));
  }, [projectTasks]);

  const workloadRows = useMemo(() => {
    const seen = new Map<string, { initials: string; bg: string; fg?: string }>();
    project.people.forEach((person) => seen.set(person.initials, person));
    projectTasks.forEach((task) => (task.assignees ?? []).forEach((assignee) => seen.set(assignee.initials, assignee)));

    return Array.from(seen.values())
      .map((person) => ({ person, workload: getMemberWorkload(person.initials, projectTasks) }))
      .sort((a, b) => b.workload.total - a.workload.total)
      .slice(0, 8);
  }, [project.people, projectTasks]);

  const maxWorkload = Math.max(1, ...workloadRows.map((row) => row.workload.total));

  const milestones = project.milestones ?? [];
  const milestonesDone = milestones.filter((m) => m.done).length;
  const milestoneRate = milestones.length > 0 ? Math.round((milestonesDone / milestones.length) * 100) : 0;

  const tooltipStyle = { background: isDark ? theme.card : theme.text, border: "none", borderRadius: 10, fontSize: 11.5, color: isDark ? theme.text : theme.surface, padding: "6px 10px" };

  return (
    <div className="fade-in flex flex-col" style={{ gap: 16 }}>
      <div>
        <h2 className="font-display" style={{ fontSize: 17, fontWeight: 560, color: "var(--text)", marginBottom: 4 }}>Analytics</h2>
        <p className="text-ink-2" style={{ fontSize: 12.5 }}>How this project is trending — completion, velocity, and workload.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" style={{ gap: 14 }}>
        <StatCard label="Completion" value={`${completionRate}%`} icon={CheckCircle2} ring={completionRate} compact />
        <StatCard label="Total tasks" value={String(total)} icon={ListChecks} compact />
        <StatCard label="Overdue" value={String(overdueTasks.length)} icon={AlertTriangle} compact />
        <StatCard label="Milestones" value={`${milestonesDone}/${milestones.length}`} icon={Diamond} compact />
      </div>

      <div className="flex flex-col xl:flex-row" style={{ gap: 14, alignItems: "stretch" }}>
        {/* DISTRIBUTION */}
        <div className="bg-card border-soft shadow-float lift fade-in" style={{ borderRadius: 20, padding: 20, flex: 1 }}>
          <h3 className="font-display" style={{ fontSize: 15, fontWeight: 560, marginBottom: 14, color: "var(--text)" }}>Task distribution</h3>
          <div className="flex items-center" style={{ gap: 18 }}>
            <div style={{ width: 100, height: 100, flexShrink: 0, position: "relative" }}>
              {total > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distribution} dataKey="count" nameKey="status" innerRadius={30} outerRadius={48} paddingAngle={3} cornerRadius={4} stroke="none">
                      {distribution.map((row) => (
                        <Cell key={row.status} fill={row.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", border: `2px dashed ${theme.border}` }} />
              )}
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <span className="font-display" style={{ fontSize: 17, fontWeight: 600, color: "var(--text)" }}>{total}</span>
                <span style={{ fontSize: 9, color: "var(--text-3)" }}>tasks</span>
              </div>
            </div>
            <div className="flex flex-col" style={{ gap: 9, flex: 1, minWidth: 0 }}>
              {distribution.map((row) => {
                const percent = total > 0 ? Math.round((row.count / total) * 100) : 0;
                return (
                  <div key={row.status} className="flex items-center justify-between" style={{ gap: 8 }}>
                    <div className="flex items-center" style={{ gap: 6, minWidth: 0 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: row.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11.5, color: "var(--text-2)" }}>{row.status}</span>
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text)" }}>{row.count} &middot; {percent}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* VELOCITY */}
        <div className="bg-card border-soft shadow-float lift fade-in" style={{ borderRadius: 20, padding: 20, flex: 1.4, minWidth: 0 }}>
          <h3 className="font-display" style={{ fontSize: 15, fontWeight: 560, marginBottom: 3, color: "var(--text)" }}>Velocity</h3>
          <span className="text-ink-3" style={{ fontSize: 11 }}>Tasks completed per week, last 8 weeks</span>
          <div style={{ height: 150, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocity} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={theme.border} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: theme.text3, fontSize: 10 }} interval={1} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} width={24} tick={{ fill: theme.text3, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: theme.surface2 }} />
                <Bar dataKey="completed" name="Completed" radius={[4, 4, 0, 0]} fill={theme.blueDark} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row" style={{ gap: 14, alignItems: "stretch" }}>
        {/* WORKLOAD */}
        <div className="bg-card border-soft shadow-float lift fade-in" style={{ borderRadius: 20, padding: 20, flex: 1.2 }}>
          <div className="flex items-center" style={{ justifyContent: "space-between", marginBottom: 3 }}>
            <h3 className="font-display" style={{ fontSize: 15, fontWeight: 560, color: "var(--text)" }}>Workload</h3>
            <Gauge size={13} strokeWidth={1.8} color={theme.text3} />
          </div>
          <span className="text-ink-3" style={{ fontSize: 11 }}>Active tasks per person</span>
          <div className="flex flex-col" style={{ gap: 12, marginTop: 14 }}>
            {workloadRows.length === 0 ? (
              <p className="text-ink-3" style={{ fontSize: 12 }}>No one assigned yet.</p>
            ) : (
              workloadRows.map((row) => (
                <div key={row.person.initials} className="flex items-center" style={{ gap: 10 }}>
                  <Avatar initials={row.person.initials} bg={row.person.bg} fg={row.person.fg} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ height: 6, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
                      <div style={{ width: `${(row.workload.active / maxWorkload) * 100}%`, height: "100%", background: theme.blueDark, borderRadius: 999, transition: "width 400ms ease" }} />
                    </div>
                  </div>
                  <span className="text-ink-3" style={{ fontSize: 11, width: 70, textAlign: "right", flexShrink: 0 }}>{row.workload.active} active</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MILESTONES + OVERDUE */}
        <div className="flex flex-col" style={{ flex: 1, gap: 14 }}>
          <div className="bg-card border-soft shadow-float lift fade-in" style={{ borderRadius: 20, padding: 20 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <h3 className="font-display" style={{ fontSize: 15, fontWeight: 560, color: "var(--text)" }}>Milestone progress</h3>
              <ProgressRing value={milestoneRate} size={30} stroke={3} color={theme.blueDark} track={theme.border} />
            </div>
            {milestones.length === 0 ? (
              <p className="text-ink-3" style={{ fontSize: 12 }}>No milestones set — add some from Overview.</p>
            ) : (
              <div className="flex flex-col" style={{ gap: 7 }}>
                {milestones.slice(0, 4).map((milestone) => (
                  <div key={milestone.id} className="flex items-center" style={{ gap: 8 }}>
                    <Diamond size={10} strokeWidth={2.2} fill={milestone.done ? theme.blueDark : "none"} color={milestone.done ? theme.blueDark : theme.text3} />
                    <span style={{ fontSize: 12, color: milestone.done ? "var(--text-3)" : "var(--text)", textDecoration: milestone.done ? "line-through" : "none", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {milestone.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card border-soft shadow-float lift fade-in" style={{ borderRadius: 20, padding: 20 }}>
            <h3 className="font-display" style={{ fontSize: 15, fontWeight: 560, marginBottom: 10, color: "var(--text)" }}>Overdue</h3>
            {overdueTasks.length === 0 ? (
              <p className="text-ink-3" style={{ fontSize: 12 }}>Nothing overdue — all caught up.</p>
            ) : (
              <div className="flex flex-col" style={{ gap: 8 }}>
                {overdueTasks.slice(0, 4).map((task) => (
                  <div key={task.id} className="flex items-center justify-between" style={{ gap: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--text)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</span>
                    <Pill tone="dark">{task.due}</Pill>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
