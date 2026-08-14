import type { Project, ProjectStatus, TeamMember } from "../types/dashboard";
import { projects as seedProjects } from "./dashboardData";
import { getDueGroup } from "./taskData";

/* ============================================================
   STATUS
   Archived is always explicit (`status: "archived"`, set by the
   Archive action). Active/Completed fall back to a progress-based
   read when `status` isn't set, so the original seed projects (and
   any project a user created before this field existed) still
   classify correctly without needing a migration.
============================================================ */

export function getProjectStatus(project: Project): ProjectStatus {
  if (project.status) return project.status;
  return project.progress >= 100 ? "completed" : "active";
}

/*
 * Active projects due soon — due today, tomorrow, or later this week
 * — nearest deadline first. Mirrors getUpcomingTasks() in taskData.ts
 * (same getDueGroup buckets, same "not done yet" intent) so the
 * Dashboard's "Upcoming" widget can merge task and project deadlines
 * on one consistent definition of "upcoming".
 */
export function getUpcomingProjects(
  projects: Project[],
  limit?: number
): Project[] {
  const upcoming = projects
    .filter((project) => {
      if (getProjectStatus(project) !== "active") return false;

      const group = getDueGroup(project.dueDate);
      return (
        group === "Today" ||
        group === "Tomorrow" ||
        group === "This Week"
      );
    })
    .sort(
      (a, b) =>
        (a.dueDate ?? "").localeCompare(b.dueDate ?? "")
    );

  return limit !== undefined
    ? upcoming.slice(0, limit)
    : upcoming;
}

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; color: string }> = {
  active: { label: "Active", color: "var(--blue-dark)" },
  completed: { label: "Completed", color: "var(--blue)" },
  archived: { label: "Archived", color: "var(--text-3)" },
};

/* ============================================================
   COLOR PALETTE
   User-chosen per-project accent colors — a curated, muted set
   in keeping with Orbit's soft aesthetic, kept as plain hex since
   they're per-entity identity colors (like Avatar's bg/fg), not
   app chrome, so they intentionally stay fixed across themes.
============================================================ */

export interface ProjectColorOption {
  name: string;
  value: string;
}

export const PROJECT_COLORS: ProjectColorOption[] = [
  { name: "Blue", value: "#8EA7BF" },
  { name: "Slate", value: "#667085" },
  { name: "Ink", value: "#20242B" },
  { name: "Teal", value: "#7FB8B0" },
  { name: "Amber", value: "#D8A657" },
  { name: "Rose", value: "#C98A96" },
  { name: "Violet", value: "#9B8FC4" },
  { name: "Sage", value: "#8FAE8B" },
];

export const DEFAULT_PROJECT_COLOR = PROJECT_COLORS[0].value;

/* ============================================================
   CATEGORY OPTIONS
   Mirrors the "tag" values already used by the seed projects.
============================================================ */

export const PROJECT_TAGS: string[] = ["Product", "Design", "Engineering", "Marketing", "Ops"];

/* ============================================================
   DUE-DATE FORMATTING
   Turns a real "YYYY-MM-DD" into the same kind of display string
   the seed data already hardcodes (e.g. "Due in 5 days"), so
   ProjectsWidget/Projects.tsx don't need to change how they render
   `project.due`.
============================================================ */

export function formatProjectDue(dueDate: string): string {
  const [year, month, day] = dueDate.split("-").map(Number);
  if (!year || !month || !day) return "No due date";

  const target = new Date(year, month - 1, day);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((target.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `Due in ${diffDays} days`;
}

/* ============================================================
   CREATION
============================================================ */

export interface NewProjectInput {
  name: string;
  description: string;
  tag: string;
  color: string;
  startDate: string;
  dueDate: string;
  people: TeamMember[];
}

/**
 * Builds a brand-new Project from CreateProjectDrawer's create-mode
 * values, with the creator set as Owner in memberRoles. Without that, a
 * newly created project would have no Owner at all — getProjectPermission()
 * falls back to "Editor" for everyone — and since only an Owner can ever
 * grant Owner elsewhere (ProjectTeamTab's and ProjectSettingsTab's
 * permission controls are themselves Owner-gated), the project would be
 * permanently unmanageable by anyone, including its own creator.
 *
 * The single entry point every project-creation call site should use
 * (Projects.tsx and Dashboard's ProjectsWidget both call this) rather than
 * each building the Project object by hand — that duplication is exactly
 * how the missing Owner assignment happened in the first place.
 */
export function buildNewProject(values: NewProjectInput, creatorInitials: string): Project {
  return {
    id: generateProjectId(),
    name: values.name,
    tag: values.tag,
    progress: 0,
    tasks: "0 / 0 tasks",
    due: values.dueDate ? formatProjectDue(values.dueDate) : "No due date",
    people: values.people,
    description: values.description || undefined,
    color: values.color,
    startDate: values.startDate || undefined,
    dueDate: values.dueDate || undefined,
    memberRoles: { [creatorInitials]: "Owner" },
  };
}

/* ============================================================
   PERSISTENCE
   Mirrors taskData.ts's loadTasks()/saveTasks() localStorage
   pattern exactly, seeded from dashboardData.ts's static array.
============================================================ */

const PROJECT_STORAGE_KEY = "orbit-projects";

export function generateProjectId(): string {
  return `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Backfills a stable `id` onto any project cached before the field
 * existed, and immediately re-persists it — so the id stays the same
 * on every subsequent load instead of being regenerated (which would
 * break any /projects/:projectId link pointing at it).
 */
export function loadProjects(): Project[] {
  try {
    const stored = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!stored) return seedProjects;

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return seedProjects;

    let needsResave = false;
    const normalized: Project[] = parsed.map((project: Partial<Project>) => {
      if (project.id) return project as Project;
      needsResave = true;
      return { ...project, id: generateProjectId() } as Project;
    });

    if (needsResave) saveProjects(normalized);

    return normalized;
  } catch (error) {
    console.error("Failed to load projects:", error);
    return seedProjects;
  }
}

export function saveProjects(projects: Project[]): void {
  try {
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error("Failed to save projects:", error);
  }
}
