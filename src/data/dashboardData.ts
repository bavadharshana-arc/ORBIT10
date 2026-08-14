import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  LayoutGrid,
  CalendarDays,
  TrendingUp,
  Users,
  PieChart,
  FileText,
} from "lucide-react";

import type {
  NavItem,
  TeamMember,
  Project,
} from "../types/dashboard";

/* ============================================================
   NAVIGATION
============================================================ */

export const navItems: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    icon: FolderKanban,
    label: "Projects",
  },
  {
    icon: CheckSquare,
    label: "Tasks",
  },
  {
    icon: LayoutGrid,
    label: "Kanban Board",
  },
  {
    icon: CalendarDays,
    label: "Calendar",
  },
  {
    icon: TrendingUp,
    label: "Timeline",
  },
  {
    icon: Users,
    label: "Team",
  },
  {
    icon: PieChart,
    label: "Analytics",
  },
  {
    icon: FileText,
    label: "Files",
  },
];

/* ============================================================
   TEAM
============================================================ */

export const team: Record<string, TeamMember> = {
  maya: {
    initials: "MC",
    bg: "#AFC5DA",
    fg: "#20242B",
  },

  jonah: {
    initials: "JD",
    bg: "#EEF2F6",
    fg: "#20242B",
  },

  rhea: {
    initials: "RS",
    bg: "#20242B",
    fg: "#F7F8FA",
  },

  aidan: {
    initials: "AK",
    bg: "#E4E8ED",
    fg: "#20242B",
  },

  talia: {
    initials: "TL",
    bg: "#8EA7BF",
    fg: "#20242B",
  },
};

/* ============================================================
   PROJECTS
============================================================ */

export const projects: Project[] = [
  {
    id: "orbit-mobile-app",
    name: "Orbit Mobile App",
    tag: "Product",
    progress: 68,
    tasks: "24 / 36 tasks",
    due: "Due in 5 days",
    people: [
      team.maya,
      team.jonah,
      team.rhea,
    ],
  },

  {
    id: "marketing-site-redesign",
    name: "Marketing Site Redesign",
    tag: "Design",
    progress: 42,
    tasks: "11 / 26 tasks",
    due: "Due in 9 days",
    people: [
      team.aidan,
      team.talia,
    ],
  },

  {
    id: "api-v2-migration",
    name: "API v2 Migration",
    tag: "Engineering",
    progress: 90,
    tasks: "18 / 20 tasks",
    due: "Due tomorrow",
    people: [
      team.rhea,
      team.maya,
      team.jonah,
      team.aidan,
    ],
  },

  {
    id: "q3-investor-deck",
    name: "Q3 Investor Deck",
    tag: "Ops",
    progress: 20,
    tasks: "3 / 15 tasks",
    due: "Due in 14 days",
    people: [
      team.maya,
    ],
  },
];

/*
 * The Dashboard's ActivityChart and UpcomingEvents widgets used to
 * render static demo fixtures (`weeklyActivity`, `events`) from here.
 * They now derive live data straight from TaskContext/ProjectContext
 * in src/pages/Dashboard.tsx (getTaskCompletedAt for the weekly
 * chart, getUpcomingTasks/getUpcomingProjects for the upcoming feed),
 * so no static fixture is needed.
 */

/*
 * The Dashboard's MiniCalendar used to render a hardcoded "July 2026"
 * grid from here. It now builds a real grid for the actual current
 * month via `buildMonthGrid()` in `data/calendarGrid.ts`, so no static
 * fixture is needed.
 */

