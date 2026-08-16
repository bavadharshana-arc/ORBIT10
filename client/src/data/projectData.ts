import type { Project, ProjectStatus, TeamMember } from "../types/dashboard";
import { getDueGroup } from "./taskData";


export function getProjectStatus(project: Project): ProjectStatus {
  if (project.status) return project.status;
  return project.progress >= 100 ? "completed" : "active";
}


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




export const PROJECT_TAGS: string[] = ["Product", "Design", "Engineering", "Marketing", "Ops"];



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



export interface NewProjectInput {
  name: string;
  description: string;
  tag: string;
  color: string;
  startDate: string;
  dueDate: string;
  people: TeamMember[];
}

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



export function generateProjectId(): string {
  return `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}


// loadProjects/saveProjects (localStorage-backed mock project list) have
// zero remaining callers — Project data is fully real via ProjectContext/
// lib/projectApi.ts. Confirmed via grep before removal.
