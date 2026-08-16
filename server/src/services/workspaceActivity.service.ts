import { prisma } from "../lib/prisma";

// Matches workspace.service.ts's memberWithUser convention — id/name/email
// only, for hydrating the frontend's Member/avatar shape.
const withMember = {
  include: { member: { select: { id: true, name: true, email: true } } },
} as const;

export const listActivityForWorkspace = async (workspaceId: string) => {
  return prisma.workspaceActivityEvent.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    ...withMember,
  });
};

export const createActivityEvent = async (
  workspaceId: string,
  text: string,
  memberId?: string | null,
) => {
  if (memberId !== undefined && memberId !== null) {
    return prisma.workspaceActivityEvent.create({
      data: { workspaceId, text, memberId },
      ...withMember,
    });
  }
  return prisma.workspaceActivityEvent.create({
    data: { workspaceId, text },
    ...withMember,
  });
};
