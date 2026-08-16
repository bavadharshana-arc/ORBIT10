import { prisma } from "../lib/prisma";
import { findMembership } from "./workspace.service";

export const PROJECT_ROLES = ["Owner", "Editor", "Commenter", "Viewer"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];
export const isProjectRole = (value: unknown): value is ProjectRole =>
  typeof value === "string" && (PROJECT_ROLES as readonly string[]).includes(value);

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

const countOwners = async (projectId: string) => {
  return prisma.projectMember.count({ where: { projectId, role: "Owner" } });
};

export const listMembers = async (projectId: string) => {
  return prisma.projectMember.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    ...memberWithUser,
  });
};

export const findProjectMembership = async (projectId: string, userId: string) => {
  return prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
};

/**
 * Adds a project member. `userId` must already be a member of the
 * project's workspace — project membership is a subset of workspace
 * membership, not an independent identity (mirrors how Task.assigneeId
 * is validated in task.controller.ts).
 */
export const addMember = async (
  workspaceId: string,
  projectId: string,
  userId: string,
  role: ProjectRole,
) => {
  const workspaceMembership = await findMembership(workspaceId, userId);
  if (!workspaceMembership) {
    throw new Error("User must be a member of this workspace");
  }

  const existing = await findProjectMembership(projectId, userId);
  if (existing) {
    throw new Error("User is already a member of this project");
  }

  return prisma.projectMember.create({
    data: { projectId, userId, role },
    ...memberWithUser,
  });
};

export const updateMemberRole = async (projectId: string, memberId: string, newRole: ProjectRole) => {
  const member = await prisma.projectMember.findFirst({ where: { id: memberId, projectId } });
  if (!member) {
    throw new Error("Member not found");
  }

  if (member.role === "Owner" && newRole !== "Owner") {
    const ownerCount = await countOwners(projectId);
    if (ownerCount <= 1) {
      throw new Error("Cannot demote the last Owner of a project");
    }
  }

  return prisma.projectMember.update({
    where: { id: memberId },
    data: { role: newRole },
    ...memberWithUser,
  });
};

export const removeMember = async (projectId: string, memberId: string) => {
  const member = await prisma.projectMember.findFirst({ where: { id: memberId, projectId } });
  if (!member) {
    throw new Error("Member not found");
  }

  if (member.role === "Owner") {
    const ownerCount = await countOwners(projectId);
    if (ownerCount <= 1) {
      throw new Error("Cannot remove the last Owner of a project");
    }
  }

  await prisma.projectMember.delete({ where: { id: memberId } });
};
