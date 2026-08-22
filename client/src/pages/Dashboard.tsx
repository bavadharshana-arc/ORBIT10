import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FolderKanban,
  CheckSquare,
  TrendingUp,
  Clock3,
} from "lucide-react";

import { GreetingCard } from "../components/dashboard/GreetingCard";
import { StatCard } from "../components/dashboard/StatCard";
import { ProjectsWidget } from "../components/dashboard/ProjectsWidget";
import { ActivityChart } from "../components/dashboard/ActivityChart";
import { MiniCalendar } from "../components/dashboard/MiniCalendar";
import { UpcomingEvents } from "../components/dashboard/UpcomingEvents";

import type { ActivityDatum, UpcomingEvent } from "../types/dashboard";
import { buildMonthGrid, groupTasksByDay, formatDateKey } from "../data/calendarGrid";
import { getDueGroup, getUpcomingTasks } from "../data/taskData";
import { getProjectStatus, getUpcomingProjects } from "../data/projectData";
import { getProjectCreatedAt, getTaskCreatedAt, getTaskCompletedAt } from "../data/workspaceData";
import { startOfDay, addDays, isSameDay, parseIsoDate, formatShortDate } from "../components/timeline/GanttTimeline";
import { useTaskContext } from "../context/taskContextValue";
import { useProjectContext } from "../context/projectContextValue";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** "Today" / "Tomorrow" for the near term, else a short date — reusing the same DueGroup buckets and date formatter the Timeline/Tasks pages already use instead of re-deriving a date label. */
function formatWhen(dueDate: string | undefined): string {
  const group = getDueGroup(dueDate);
  if (group === "Today") return "Today";
  if (group === "Tomorrow") return "Tomorrow";

  const parsed = parseIsoDate(dueDate);
  return parsed ? formatShortDate(parsed) : "Upcoming";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { tasks } = useTaskContext();
  const { projects } = useProjectContext();

  // Real "today" — used for the weekly-activity window and StatCard
  // math below, independent of whichever month the MiniCalendar is
  // currently browsing.
  const today = useMemo(() => new Date(), []);

  // The month the MiniCalendar displays — defaults to the real current
  // month, but is its own state so the prev/next buttons can browse
  // away from it without disturbing `today`.
  const [viewedMonth, setViewedMonth] = useState(today);
  const grid = useMemo(() => buildMonthGrid(viewedMonth), [viewedMonth]);
  const isViewingCurrentMonth =
    grid.year === today.getFullYear() && grid.month === today.getMonth();

  const tasksByDay = useMemo(
    () => groupTasksByDay(tasks, grid.year, grid.month),
    [tasks, grid]
  );
  const eventDays = useMemo(() => [...tasksByDay.keys()], [tasksByDay]);

  function handleSelectDay(day: number | null) {
    if (day === null) return;
    navigate(`/tasks?date=${formatDateKey(grid.year, grid.month, day)}`);
  }

  function handlePrevMonth() {
    setViewedMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  function handleNextMonth() {
    setViewedMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  /* ==========================================================
     STAT CARDS — every value is derived live from TaskContext /
     ProjectContext, reusing the same status helpers the Projects,
     Tasks, and Analytics pages already use (getProjectStatus,
     getDueGroup) instead of re-deriving that logic here.
  ========================================================== */

  const activeProjects = useMemo(
    () => projects.filter((project) => getProjectStatus(project) === "active"),
    [projects]
  );

  // Projects created in the last 7 days — undefined for the original
  // seed projects (no createdAt/timestamped id), so the delta stays
  // hidden until a real project is created, rather than showing a
  // fake "+N" that doesn't correspond to anything.
  const newActiveProjectsThisWeek = useMemo(() => {
    const now = Date.now();
    return activeProjects.filter((project) => {
      const createdAt = getProjectCreatedAt(project);
      return createdAt !== null && now - createdAt <= WEEK_MS;
    }).length;
  }, [activeProjects]);

  const tasksDueToday = useMemo(
    () => tasks.filter((task) => getDueGroup(task.dueDate) === "Today").length,
    [tasks]
  );

  const overdueTaskCount = useMemo(
    () => tasks.filter((task) => getDueGroup(task.dueDate) === "Overdue").length,
    [tasks]
  );

  // "Velocity" = share of the current task list that's Completed —
  // the same completion-rate calculation Analytics uses for its
  // all-time KPI.
  const completionRate = useMemo(() => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter((task) => task.status === "Completed").length;
    return Math.round((completed / tasks.length) * 100);
  }, [tasks]);

  const inProgressTasks = useMemo(
    () => tasks.filter((task) => task.status === "In Progress"),
    [tasks]
  );

  const highPriorityInProgressCount = useMemo(
    () => inProgressTasks.filter((task) => task.priority === "High").length,
    [inProgressTasks]
  );

  /* ==========================================================
     WEEKLY ACTIVITY — tasks created vs. completed per day over the
     trailing 7 days, read straight off each task's own real
     timestamps via getTaskCreatedAt()/getTaskCompletedAt() (the same
     completion helper the Project Analytics velocity chart uses)
     rather than a second, hardcoded activity data source.
  ========================================================== */

  const createdAtByTaskId = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of tasks) {
      const createdAt = getTaskCreatedAt(task);
      if (createdAt !== null) map.set(task.id, createdAt);
    }
    return map;
  }, [tasks]);

  const completedAtByTaskId = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of tasks) {
      const completedAt = getTaskCompletedAt(task);
      if (completedAt !== null) map.set(task.id, completedAt);
    }
    return map;
  }, [tasks]);

  const weeklyActivityData = useMemo<ActivityDatum[]>(() => {
    const todayStart = startOfDay(today);
    const creations = [...createdAtByTaskId.values()];
    const completions = [...completedAtByTaskId.values()];

    return Array.from({ length: 7 }, (_, index) => {
      const day = addDays(todayStart, index - 6);
      return {
        day: day.toLocaleDateString("en-US", { weekday: "short" }),
        created: creations.filter((ms) => isSameDay(new Date(ms), day)).length,
        completed: completions.filter((ms) => isSameDay(new Date(ms), day)).length,
      };
    });
  }, [createdAtByTaskId, completedAtByTaskId, today]);

  const createdThisWeek = useMemo(
    () => weeklyActivityData.reduce((sum, entry) => sum + entry.created, 0),
    [weeklyActivityData]
  );

  const completedThisWeek = useMemo(
    () => weeklyActivityData.reduce((sum, entry) => sum + entry.completed, 0),
    [weeklyActivityData]
  );

  const completedPreviousWeek = useMemo(() => {
    const todayStart = startOfDay(today);
    const windowStart = addDays(todayStart, -13);
    const windowEndExclusive = addDays(todayStart, -6);
    return [...completedAtByTaskId.values()].filter(
      (ms) => ms >= windowStart.getTime() && ms < windowEndExclusive.getTime()
    ).length;
  }, [completedAtByTaskId, today]);

  const changeVsLastWeekPct = useMemo(() => {
    if (completedPreviousWeek === 0) return completedThisWeek === 0 ? 0 : 100;
    return Math.round(((completedThisWeek - completedPreviousWeek) / completedPreviousWeek) * 100);
  }, [completedThisWeek, completedPreviousWeek]);

  /* ==========================================================
     UPCOMING — nearest task and project deadlines merged into one
     feed, reusing getUpcomingTasks()/getUpcomingProjects() so this
     widget agrees with Analytics on what counts as "upcoming".
  ========================================================== */

  const upcomingTasks = useMemo(() => getUpcomingTasks(tasks, 4), [tasks]);
  const upcomingProjects = useMemo(() => getUpcomingProjects(projects, 4), [projects]);

  const upcomingEvents = useMemo<UpcomingEvent[]>(() => {
    const items: { event: UpcomingEvent; sortKey: string }[] = [];

    upcomingTasks.forEach((task) => {
      const assigneeNames = task.assignees.map((assignee) => assignee.initials).join(", ");
      items.push({
        sortKey: task.dueDate ?? "",
        event: {
          title: task.title,
          time: `${task.priority} priority`,
          meta: assigneeNames ? `${task.project} · ${assigneeNames}` : task.project,
          when: formatWhen(task.dueDate),
        },
      });
    });

    upcomingProjects.forEach((project) => {
      items.push({
        sortKey: project.dueDate ?? "",
        event: {
          title: project.name,
          time: "Project deadline",
          meta: `${project.tag} · ${project.progress}% complete`,
          when: formatWhen(project.dueDate),
        },
      });
    });

    return items
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(0, 5)
      .map((item) => item.event);
  }, [upcomingTasks, upcomingProjects]);

  return (
    <>
      <GreetingCard
        tasksDueToday={tasksDueToday}
        activeProjectCount={activeProjects.length}
        hasAnyProjects={projects.length > 0}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 14, marginBottom: 18 }}>
        <StatCard
          label="Active projects"
          value={String(activeProjects.length)}
          delta={newActiveProjectsThisWeek > 0 ? `+${newActiveProjectsThisWeek} this wk` : undefined}
          trendUp={newActiveProjectsThisWeek > 0}
          icon={FolderKanban}
          graphic="trend"
        />

        <StatCard
          label="Tasks due today"
          value={String(tasksDueToday)}
          delta={overdueTaskCount > 0 ? `${overdueTaskCount} overdue` : undefined}
          deltaDot={overdueTaskCount > 0}
          icon={CheckSquare}
          graphic="checklist"
        />

        <StatCard
          label="Team velocity"
          value={`${completionRate}%`}
          icon={TrendingUp}
          ring={completionRate}
          graphic="bars"
        />

        <StatCard
          label="Tasks in progress"
          value={String(inProgressTasks.length)}
          delta={highPriorityInProgressCount > 0 ? `${highPriorityInProgressCount} high priority` : undefined}
          trendUp={highPriorityInProgressCount > 0}
          icon={Clock3}
          graphic="target"
        />
      </div>

      <div
        className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-1 lg:gap-[18px] xl:flex xl:flex-row"
        style={{ alignItems: "flex-start" }}
      >
        <div style={{ flex: 1.65, minWidth: 0, width: "100%" }}>
          <ProjectsWidget />
          <ActivityChart
            data={weeklyActivityData}
            createdThisWeek={createdThisWeek}
            completedThisWeek={completedThisWeek}
            changeVsLastWeekPct={changeVsLastWeekPct}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0, width: "100%" }} className="xl:min-w-[280px]">
          <MiniCalendar
            monthLabel={grid.monthLabel}
            rows={grid.rows}
            outsideKeys={grid.outsideKeys}
            today={today.getDate()}
            isCurrentMonth={isViewingCurrentMonth}
            eventDays={eventDays}
            onSelectDay={handleSelectDay}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />

          <UpcomingEvents events={upcomingEvents} />
        </div>
      </div>
    </>
  );
}
