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

import type { NavItem } from "../types/dashboard";



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

// `team` (mock TeamMember dict) and `projects` (mock Project[] list)
// were removed in the Phase 19 Frontend Integration audit fix (Priority
// 5 & 7) — `team` had exactly one caller left, Kanban.tsx's fake
// "Product/Engineering/Design/Marketing Team" filter (itself removed:
// the real backend has no team/department concept to group by, see
// teamData.ts's own comment on WORKSPACE_ROLE_GROUPS), and `projects`
// had zero callers anywhere — Project data is fully real via
// ProjectContext/lib/projectApi.ts. Confirmed via grep before removal.

