import type { TeamMember } from "../types/dashboard";
import type { AuthRole } from "../types/auth";
import type { WorkspaceMemberRecord, WorkspaceRole } from "../lib/workspaceApi";


export type MemberStatus = "Active" | "Away" | "Offline" | "Invited";

export type MemberRole = AuthRole;

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


// canManageWorkspaceMembers/canManageWorkspaceData/canManageWorkspaceSettings/
// resolveCurrentMemberRole (mock AuthRole-based workspace-permission
// checks) were removed in Stage 6 (Permissions Alignment) — every call
// site now derives from the real WorkspaceRole instead (see
// hooks/useWorkspaceRole.ts).

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
   REAL WORKSPACE MEMBER MAPPING (Stage 1 — Real Team Roster)

   Adapts a real WorkspaceMemberRecord (lib/workspaceApi.ts) onto the
   existing Member shape so MemberCard/MemberRow/TeamsPanel/
   MemberDetailsDrawer keep working completely unchanged — same
   pattern as ProjectContext.tsx's mapProjectRecordToProject: map
   what's real, and for the handful of fields the backend genuinely
   has no column for, use an honest, clearly-reasoned value instead
   of fabricating one:

   - department: the backend has no team/department concept at all
     (no Prisma model). Repurposed to show the member's real
     WorkspaceRole (Owner/Admin/Member) in that same Pill/filter/
     TeamsPanel-grouping slot instead — real data, not invented.
   - status: always "Active". A WorkspaceMember row *is* full,
     active membership — there's no "Invited"/"Away"/"Offline" state
     in the data model, so "Active" is a true fact, not a guess.
   - tasksActive/tasksCompleted: 0. Real task-assignee data isn't
     wired yet (see the separate Task Assignees phase) — 0 reflects
     that nothing is currently known to be assigned, not a fabricated
     workload.
============================================================ */

const WORKSPACE_ROLE_LABEL: Record<WorkspaceRole, MemberRole> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

/** The 3 real WorkspaceRoles, shaped as OrbitTeam entries so the existing team/department UI (filter dropdown, TeamsPanel, MemberDetailsDrawer's "Team" select) can keep rendering `teams.map(...)` unchanged while actually listing roles. */
export const WORKSPACE_ROLE_GROUPS: OrbitTeam[] = [
  { id: "owner", name: "Owner", description: "Full control over this workspace." },
  { id: "admin", name: "Admin", description: "Manages members and workspace settings." },
  { id: "member", name: "Member", description: "Standard workspace access." },
];

/** The Role dropdown's valid options for a real member — the same 3 labels WORKSPACE_ROLE_GROUPS lists, kept as MemberRole values since that's what MemberDetailsDrawer's select already works in. */
export const WORKSPACE_MEMBER_ROLE_OPTIONS: MemberRole[] = ["Owner", "Admin", "Member"];

/** Reverse of WORKSPACE_ROLE_LABEL — MemberDetailsDrawer's Role select produces a MemberRole (AuthRole); saving a real member's role needs the WorkspaceRole PATCH .../members/:memberId actually accepts. Only ever called with one of WORKSPACE_MEMBER_ROLE_OPTIONS' 3 values. */
export function memberRoleToWorkspaceRole(role: MemberRole): WorkspaceRole {
  switch (role) {
    case "Owner":
      return "OWNER";
    case "Admin":
      return "ADMIN";
    default:
      return "MEMBER";
  }
}

const NEUTRAL_MEMBER_AVATAR = { bg: "#AFC5DA", fg: "#20242B" };

export function mapWorkspaceMemberToMember(record: WorkspaceMemberRecord): Member {
  const name = record.user.name ?? record.user.email;
  const role = WORKSPACE_ROLE_LABEL[record.role as WorkspaceRole] ?? "Member";

  return {
    id: record.id,
    name,
    email: record.user.email,
    jobTitle: record.user.jobTitle ?? "Team member",
    department: role,
    role,
    status: "Active",
    location: record.user.location ?? "—",
    phone: record.user.phone ?? "—",
    joinedDate: record.createdAt.slice(0, 10),
    initials: getInitials(name),
    bg: record.user.avatarBg ?? NEUTRAL_MEMBER_AVATAR.bg,
    fg: record.user.avatarFg ?? NEUTRAL_MEMBER_AVATAR.fg,
    tasksActive: 0,
    tasksCompleted: 0,
  };
}


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

// initialActivity/loadActivity/saveActivity/generateActivityId (fake
// seed data + localStorage persistence for Team.tsx's ActivityFeed) were
// removed in Stage 5 (Real Activity) — Team.tsx now fetches real events
// from lib/workspaceActivityApi.ts instead.


// generateMemberId (mock member-id generator, from before the Team.tsx
// roster went real in Stage 1) has zero remaining callers — confirmed
// via grep before removal.

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

// saveMembers has zero remaining callers — Team.tsx's own roster went
// real in Stage 1 (mapWorkspaceMemberToMember), leaving loadMembers()
// above as a read-only fallback identity source for resolveCurrentActor
// elsewhere in the app (matches a real account's own data whenever the
// email doesn't hit one of the 5 legacy seed accounts). Confirmed via
// grep before removal.


