import type { TeamMember } from "../types/dashboard";
import type { AuthRole } from "../types/auth";
import { hasRole } from "../lib/permissions";

/* ============================================================
   TYPES
============================================================ */

export type MemberStatus = "Active" | "Away" | "Offline" | "Invited";

/** Reuses AuthRole (lib/permissions.ts's Role) directly rather than
 *  defining a separate vocabulary — a workspace member's roster role
 *  and the signed-in AuthContext role are the same 5 values (Owner,
 *  Admin, Project Manager, Member, Viewer). Kept as a local alias so
 *  call sites in this file and its consumers can keep saying
 *  "MemberRole" for the roster-specific meaning, without this module
 *  owning its own rank table (see canManageWorkspaceMembers() etc.
 *  below, which defer to lib/permissions.ts's hasRole()). */
export type MemberRole = AuthRole;

/** A workspace member shown on the Team page. Extends the lightweight
 *  TeamMember (initials/bg/fg) used for avatars elsewhere in the app, so a
 *  Member can be dropped anywhere a TeamMember is expected (AvatarStack, etc). */
export interface Member extends TeamMember {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  role: MemberRole;
  status: MemberStatus;
  location: string;
  phone: string;
  joinedDate: string;
  tasksActive: number;
  tasksCompleted: number;
}

/** A team/department grouping. Membership is derived from
 *  Member.department rather than stored, so it never goes stale. */
export interface OrbitTeam {
  id: string;
  name: string;
  description: string;
}

export interface TeamActivityEntry {
  id: string;
  memberId: string;
  text: string;
  timestamp: string;
}

/* ============================================================
   TEAMS (DEPARTMENTS)
============================================================ */

export const teams: OrbitTeam[] = [
  {
    id: "product",
    name: "Product",
    description: "Defines strategy, scope, and roadmap.",
  },
  {
    id: "engineering",
    name: "Engineering",
    description: "Builds and maintains the Orbit product.",
  },
  {
    id: "design",
    name: "Design",
    description: "Shapes the Orbit experience end to end.",
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Grows awareness and adoption.",
  },
  {
    id: "sales",
    name: "Sales",
    description: "Drives revenue and customer relationships.",
  },
  {
    id: "operations",
    name: "Operations",
    description: "Keeps the workspace running smoothly.",
  },
];

/* ============================================================
   AVATAR PALETTE
============================================================ */

const AVATAR_PALETTE: { bg: string; fg: string }[] = [
  { bg: "#AFC5DA", fg: "#20242B" },
  { bg: "#EEF2F6", fg: "#20242B" },
  { bg: "#20242B", fg: "#F7F8FA" },
  { bg: "#E4E8ED", fg: "#20242B" },
  { bg: "#8EA7BF", fg: "#20242B" },
];

export function getAvatarColors(index: number): { bg: string; fg: string } {
  return AVATAR_PALETTE[index % AVATAR_PALETTE.length];
}

/* ============================================================
   WORKSPACE ROLES
   MemberRole is AuthRole, so rank ordering isn't redefined here —
   lib/permissions.ts's hasRole() (built on its ROLE_RANK table) is
   the single source of truth for that, same as it is for
   AuthContext's role. This module only adds the roster-management
   resource checks specific to the Team page. Team.tsx (and anywhere
   else workspace-wide member management shows up) should gate
   through canManageWorkspaceMembers() rather than comparing
   MemberRole values directly.
============================================================ */

/** Invite, edit, remove workspace members, and change their roles — Admin and above. */
export function canManageWorkspaceMembers(role: MemberRole): boolean {
  return hasRole(role, "Admin");
}

/** Reset or permanently delete all workspace data (Settings > Danger Zone) — Admin and above, since it wipes every member's data, not just the acting user's own. Named separately from canManageWorkspaceMembers even though both currently resolve at the Admin rank, since they gate different actions that may not always need to move together. */
export function canManageWorkspaceData(role: MemberRole): boolean {
  return hasRole(role, "Admin");
}

/** Edit shared workspace settings (name, URL, timezone, date format, week start) in Settings > Workspace — Admin and above, since these apply to everyone in Orbit, not just the acting user. */
export function canManageWorkspaceSettings(role: MemberRole): boolean {
  return hasRole(role, "Admin");
}

/**
 * Resolves the current user's workspace-management role from
 * AuthContext's own `role` (pass `useAuth().role` in) rather than
 * looking anyone up in the roster — since MemberRole is AuthRole
 * (see above), AuthContext's authenticated identity already *is*
 * the answer, so there's nothing left to search for. Falls back to
 * "Viewer" (least privilege) rather than resolveEffectiveRole()'s
 * "Owner" default if somehow called while signed out, so a missing
 * session never silently grants management access — this function
 * gates real member-management actions, not permissions.ts's
 * pre-login demo pages.
 */
export function resolveCurrentMemberRole(authRole: AuthRole | null | undefined): MemberRole {
  return authRole ?? "Viewer";
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/* ============================================================
   INITIAL MEMBERS
============================================================ */

export const initialMembers: Member[] = [
  {
    id: "member-1",
    name: "Maya Chen",
    email: "maya.chen@orbit.io",
    jobTitle: "Product Lead",
    department: "Product",
    role: "Admin",
    status: "Active",
    location: "San Francisco, CA",
    phone: "+1 (415) 555-0142",
    joinedDate: "2023-02-10",
    initials: "MC",
    bg: "#AFC5DA",
    fg: "#20242B",
    tasksActive: 5,
    tasksCompleted: 42,
  },
  {
    id: "member-2",
    name: "Jonah Diaz",
    email: "jonah.diaz@orbit.io",
    jobTitle: "Senior Engineer",
    department: "Engineering",
    role: "Member",
    status: "Active",
    location: "Austin, TX",
    phone: "+1 (512) 555-0198",
    joinedDate: "2023-04-22",
    initials: "JD",
    bg: "#EEF2F6",
    fg: "#20242B",
    tasksActive: 7,
    tasksCompleted: 61,
  },
  {
    id: "member-3",
    name: "Rhea Shah",
    email: "rhea.shah@orbit.io",
    jobTitle: "Design Lead",
    department: "Design",
    role: "Admin",
    status: "Active",
    location: "New York, NY",
    phone: "+1 (212) 555-0176",
    joinedDate: "2023-01-05",
    initials: "RS",
    bg: "#20242B",
    fg: "#F7F8FA",
    tasksActive: 4,
    tasksCompleted: 38,
  },
  {
    id: "member-4",
    name: "Aidan Kim",
    email: "aidan.kim@orbit.io",
    jobTitle: "Backend Engineer",
    department: "Engineering",
    role: "Member",
    status: "Away",
    location: "Seattle, WA",
    phone: "+1 (206) 555-0134",
    joinedDate: "2023-07-18",
    initials: "AK",
    bg: "#E4E8ED",
    fg: "#20242B",
    tasksActive: 3,
    tasksCompleted: 29,
  },
  {
    id: "member-5",
    name: "Talia Lang",
    email: "talia.lang@orbit.io",
    jobTitle: "Marketing Manager",
    department: "Marketing",
    role: "Member",
    status: "Active",
    location: "Chicago, IL",
    phone: "+1 (312) 555-0187",
    joinedDate: "2023-09-11",
    initials: "TL",
    bg: "#8EA7BF",
    fg: "#20242B",
    tasksActive: 6,
    tasksCompleted: 33,
  },
  {
    id: "member-6",
    name: "Priya Nair",
    email: "priya.nair@orbit.io",
    jobTitle: "Frontend Engineer",
    department: "Engineering",
    role: "Member",
    status: "Active",
    location: "Remote",
    phone: "+1 (415) 555-0121",
    joinedDate: "2024-01-08",
    initials: "PN",
    bg: "#AFC5DA",
    fg: "#20242B",
    tasksActive: 8,
    tasksCompleted: 22,
  },
  {
    id: "member-7",
    name: "Ezra Cole",
    email: "ezra.cole@orbit.io",
    jobTitle: "Product Designer",
    department: "Design",
    role: "Member",
    status: "Offline",
    location: "Portland, OR",
    phone: "+1 (503) 555-0159",
    joinedDate: "2023-11-27",
    initials: "EC",
    bg: "#EEF2F6",
    fg: "#20242B",
    tasksActive: 2,
    tasksCompleted: 19,
  },
  {
    id: "member-8",
    name: "Noor Malik",
    email: "noor.malik@orbit.io",
    jobTitle: "QA Engineer",
    department: "Engineering",
    role: "Member",
    status: "Active",
    location: "Remote",
    phone: "+1 (628) 555-0163",
    joinedDate: "2024-03-14",
    initials: "NM",
    bg: "#E4E8ED",
    fg: "#20242B",
    tasksActive: 5,
    tasksCompleted: 14,
  },
  {
    id: "member-9",
    name: "Wes Okafor",
    email: "wes.okafor@orbit.io",
    jobTitle: "Sales Lead",
    department: "Sales",
    role: "Member",
    status: "Active",
    location: "Denver, CO",
    phone: "+1 (720) 555-0145",
    joinedDate: "2023-05-30",
    initials: "WO",
    bg: "#8EA7BF",
    fg: "#20242B",
    tasksActive: 3,
    tasksCompleted: 27,
  },
  {
    id: "member-10",
    name: "Ines Duarte",
    email: "ines.duarte@orbit.io",
    jobTitle: "Operations Manager",
    department: "Operations",
    role: "Viewer",
    status: "Away",
    location: "Miami, FL",
    phone: "+1 (305) 555-0112",
    joinedDate: "2023-08-02",
    initials: "ID",
    bg: "#20242B",
    fg: "#F7F8FA",
    tasksActive: 2,
    tasksCompleted: 16,
  },
];

/* ============================================================
   INITIAL ACTIVITY
============================================================ */

export const initialActivity: TeamActivityEntry[] = [
  {
    id: "activity-1",
    memberId: "member-6",
    text: "Priya Nair joined the Engineering team",
    timestamp: "2 days ago",
  },
  {
    id: "activity-2",
    memberId: "member-3",
    text: "Rhea Shah was promoted to Design Lead",
    timestamp: "5 days ago",
  },
  {
    id: "activity-3",
    memberId: "member-8",
    text: "Noor Malik joined the Engineering team",
    timestamp: "1 week ago",
  },
  {
    id: "activity-4",
    memberId: "member-1",
    text: "Maya Chen invited Wes Okafor to the workspace",
    timestamp: "2 weeks ago",
  },
];

/* ============================================================
   ID GENERATORS
============================================================ */

export function generateMemberId(): string {
  return `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateActivityId(): string {
  return `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ============================================================
   DATE FORMATTING
============================================================ */

export function formatJoinedDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ============================================================
   PERSISTENCE — MEMBERS
============================================================ */

const MEMBERS_STORAGE_KEY = "orbit-team-members";

export function loadMembers(): Member[] {
  try {
    const stored = localStorage.getItem(MEMBERS_STORAGE_KEY);

    if (!stored) {
      return initialMembers;
    }

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return initialMembers;
    }

    return parsed as Member[];
  } catch (error) {
    console.error("Failed to load team members:", error);
    return initialMembers;
  }
}

export function saveMembers(members: Member[]): void {
  try {
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(members));
  } catch (error) {
    console.error("Failed to save team members:", error);
  }
}

/* ============================================================
   PERSISTENCE — ACTIVITY
============================================================ */

const ACTIVITY_STORAGE_KEY = "orbit-team-activity";

export function loadActivity(): TeamActivityEntry[] {
  try {
    const stored = localStorage.getItem(ACTIVITY_STORAGE_KEY);

    if (!stored) {
      return initialActivity;
    }

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return initialActivity;
    }

    return parsed as TeamActivityEntry[];
  } catch (error) {
    console.error("Failed to load team activity:", error);
    return initialActivity;
  }
}

export function saveActivity(activity: TeamActivityEntry[]): void {
  try {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activity));
  } catch (error) {
    console.error("Failed to save team activity:", error);
  }
}
