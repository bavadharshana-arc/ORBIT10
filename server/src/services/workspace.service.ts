import { prisma } from "../lib/prisma";

export const WORKSPACE_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const isWorkspaceRole = (value: unknown): value is WorkspaceRole =>
  typeof value === "string" && (WORKSPACE_ROLES as readonly string[]).includes(value);

// Phase 19 (workspace settings, approved scope): the same fixed option
// sets client/src/data/settingsData.ts's DATE_FORMATS/WEEK_STARTS/
// TIMEZONES dropdowns offer, duplicated here (not imported — client and
// server are separate packages) so these fields are validated as real
// choices from the frontend's own option list rather than arbitrary
// strings. Keep in sync with the frontend lists by hand, same as
// user.service.ts's AVATAR_COLOR_OPTIONS duplication for Phase 18.
export const WORKSPACE_DATE_FORMATS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"] as const;
export type WorkspaceDateFormat = (typeof WORKSPACE_DATE_FORMATS)[number];
export const isWorkspaceDateFormat = (value: unknown): value is WorkspaceDateFormat =>
  typeof value === "string" && (WORKSPACE_DATE_FORMATS as readonly string[]).includes(value);

export const WORKSPACE_WEEK_STARTS = ["sunday", "monday"] as const;
export type WorkspaceWeekStart = (typeof WORKSPACE_WEEK_STARTS)[number];
export const isWorkspaceWeekStart = (value: unknown): value is WorkspaceWeekStart =>
  typeof value === "string" && (WORKSPACE_WEEK_STARTS as readonly string[]).includes(value);

export const WORKSPACE_TIMEZONES = [
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;
export const isWorkspaceTimezone = (value: unknown): value is (typeof WORKSPACE_TIMEZONES)[number] =>
  typeof value === "string" && (WORKSPACE_TIMEZONES as readonly string[]).includes(value);

/** Same shape client/src/data/settingsData.ts's slugify() produces: lowercase letters/digits, single dashes, no leading/trailing dash. */
export const WORKSPACE_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const memberWithUser = {
  include: {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        jobTitle: true,
        phone: true,
        location: true,
        bio: true,
        avatarBg: true,
        avatarFg: true,
      },
    },
  },
} as const;

const countOwners = async (workspaceId: string) => {
  return prisma.workspaceMember.count({ where: { workspaceId, role: "OWNER" } });
};

export const createWorkspace = async (userId: string, name: string) => {
  return prisma.workspace.create({
    data: {
      name,
      workspaceMembers: {
        create: { userId, role: "OWNER" },
      },
    },
  });
};

export const listWorkspacesForUser = async (userId: string) => {
  return prisma.workspace.findMany({
    where: { workspaceMembers: { some: { userId } } },
    orderBy: { createdAt: "asc" },
  });
};

export const findWorkspaceById = async (workspaceId: string) => {
  return prisma.workspace.findUnique({ where: { id: workspaceId } });
};

export const findMembership = async (workspaceId: string, userId: string) => {
  return prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
};

export type WorkspaceSettingsInput = {
  name: string;
  slug: string;
  timezone: string;
  dateFormat: WorkspaceDateFormat;
  weekStart: WorkspaceWeekStart;
};

/**
 * Full-replace, not partial — matches the pre-Phase-19 `name`-only
 * behavior (which also required `name` outright) and the frontend's
 * actual usage: WorkspaceSection.tsx's Save always sends all five
 * fields together as one settings form, never a sparse diff.
 */
export const updateWorkspace = async (workspaceId: string, input: WorkspaceSettingsInput) => {
  return prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      name: input.name,
      slug: input.slug,
      timezone: input.timezone,
      dateFormat: input.dateFormat,
      weekStart: input.weekStart,
    },
  });
};

export const deleteWorkspace = async (workspaceId: string) => {
  await prisma.workspace.delete({ where: { id: workspaceId } });
};

export const listMembers = async (workspaceId: string) => {
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    ...memberWithUser,
  });
};

export const addMember = async (workspaceId: string, userId: string, role: WorkspaceRole) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  const existing = await findMembership(workspaceId, userId);
  if (existing) {
    throw new Error("User is already a member of this workspace");
  }

  return prisma.workspaceMember.create({
    data: { workspaceId, userId, role },
    ...memberWithUser,
  });
};

export const updateMemberRole = async (
  workspaceId: string,
  memberId: string,
  newRole: WorkspaceRole,
  callerRole: WorkspaceRole,
) => {
  const member = await prisma.workspaceMember.findFirst({ where: { id: memberId, workspaceId } });
  if (!member) {
    throw new Error("Member not found");
  }

  const touchesOwner = member.role === "OWNER" || newRole === "OWNER";
  if (touchesOwner && callerRole !== "OWNER") {
    throw new Error("Only an OWNER can change OWNER roles");
  }

  if (member.role === "OWNER" && newRole !== "OWNER") {
    const ownerCount = await countOwners(workspaceId);
    if (ownerCount <= 1) {
      throw new Error("Cannot demote the last OWNER of a workspace");
    }
  }

  return prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role: newRole },
    ...memberWithUser,
  });
};

export const removeMember = async (
  workspaceId: string,
  memberId: string,
  callerRole: WorkspaceRole,
) => {
  const member = await prisma.workspaceMember.findFirst({ where: { id: memberId, workspaceId } });
  if (!member) {
    throw new Error("Member not found");
  }

  if (member.role === "OWNER") {
    if (callerRole !== "OWNER") {
      throw new Error("Only an OWNER can remove another OWNER");
    }

    const ownerCount = await countOwners(workspaceId);
    if (ownerCount <= 1) {
      throw new Error("Cannot remove the last OWNER of a workspace");
    }
  }

  await prisma.workspaceMember.delete({ where: { id: memberId } });
};
