import { prisma } from "../lib/prisma";

/**
 * Creates a project and auto-adds its creator as a project Owner
 * (Phase 10) — without this, a newly created project would have no
 * Owner at all, and since only an Owner can manage project membership,
 * it would be permanently unmanageable by anyone, including its own
 * creator. Mirrors how createWorkspace() already auto-adds its creator
 * as workspace OWNER.
 */
export const createProject = async (
  workspaceId: string,
  creatorId: string,
  name: string,
  description?: string,
) => {
  if (description !== undefined) {
    return prisma.project.create({
      data: {
        workspaceId,
        name,
        description,
        projectMembers: { create: { userId: creatorId, role: "Owner" } },
      },
    });
  }
  return prisma.project.create({
    data: {
      workspaceId,
      name,
      projectMembers: { create: { userId: creatorId, role: "Owner" } },
    },
  });
};

export const listProjectsForWorkspace = async (workspaceId: string) => {
  return prisma.project.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
  });
};

export const findProjectInWorkspace = async (workspaceId: string, projectId: string) => {
  return prisma.project.findFirst({ where: { id: projectId, workspaceId } });
};

export const updateProject = async (
  workspaceId: string,
  projectId: string,
  data: { name?: string; description?: string },
) => {
  const project = await findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  return prisma.project.update({ where: { id: projectId }, data });
};

export const deleteProject = async (workspaceId: string, projectId: string) => {
  const project = await findProjectInWorkspace(workspaceId, projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  await prisma.project.delete({ where: { id: projectId } });
};
