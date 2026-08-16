import type { LucideIcon } from "lucide-react";

/** A single entry in the sidebar navigation. */
export interface NavItem {
  icon: LucideIcon;
  label: string;
}

/** A team member as rendered inside an avatar/avatar stack. */
export interface TeamMember {
  initials: string;
  bg: string;
  fg?: string;
}

export type ProjectStatus = "active" | "completed" | "archived";

/** Per-project permission level, keyed by member `initials` on Project.memberRoles. Independent of the workspace-wide Member.role in teamData.ts — a person can be an Editor here while being a workspace Admin overall. */
export type ProjectPermission = "Owner" | "Editor" | "Commenter" | "Viewer";

/** A single objective/goal shown on a project's Overview tab. */
export interface ProjectObjective {
  id: string;
  text: string;
  done: boolean;
}

/** A single milestone checkpoint shown on a project's Overview and Timeline. */
export interface ProjectMilestone {
  id: string;
  title: string;
  /** "YYYY-MM-DD" */
  dueDate?: string;
  done: boolean;
}

/** A project shown in the "Your projects" widget. */
export interface Project {
  /** Stable identifier used for routing (/projects/:projectId) — distinct from `name`, which stays the join key against Task.project. */
  id: string;
  name: string;
  tag: string;
  progress: number;
  tasks: string;
  due: string;
  people: TeamMember[];
  /** Optional — not set on the original seed projects. */
  description?: string;
  /** Optional accent color (hex) chosen when the project is created. */
  color?: string;
  /** "YYYY-MM-DD" */
  startDate?: string;
  /** "YYYY-MM-DD" — `due` stays the source of truth for display text. */
  dueDate?: string;
  /** Explicit status, e.g. from Archive. Falls back to progress-derived status when unset — see getProjectStatus(). */
  status?: ProjectStatus;
  /** ISO timestamp set when a project is created through the UI. Absent on the original seed projects — the Activity tab falls back to reading a timestamp out of `id` (see getProjectCreatedAt in workspaceData.ts), and omits the "project created" event entirely when neither is available. */
  createdAt?: string;
  /** Goals shown on the workspace Overview tab. */
  objectives?: ProjectObjective[];
  /** Checkpoints shown on the workspace Overview tab. */
  milestones?: ProjectMilestone[];
  /** Per-project permission override, keyed by TeamMember.initials. A member without an entry here defaults to "Editor" in the workspace Team/Settings tabs. */
  memberRoles?: Record<string, ProjectPermission>;
}

/** One day's worth of completed-task volume, used by the activity chart. */
export interface ActivityDatum {
  day: string;
  tasks: number;
}

/** An item in the "Upcoming" events list. Named to avoid clashing with the DOM's global `Event`. */
export interface UpcomingEvent {
  title: string;
  time: string;
  meta: string;
  when: string;
}

/** Visual variants supported by the <Pill /> component. */
export type PillTone = "surface" | "blue" | "dark";