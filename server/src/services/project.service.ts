import { prisma } from "../lib/prisma";

// Phase 19 Frontend Integration audit fix (Priority 8): the fields
// CreateProjectDrawer.tsx collects beyond name/description. Optional on
// both create and update, same as description already was — a caller
// that doesn't send them just doesn't set/change them.
export type ProjectWriteFields = {
  description?: string;
  tag?: string | null;
  color?: string | null;
  startDate?: Date | null;
  dueDate?: Date | null;
};

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
  fields: ProjectWriteFields = {},
) => {
  return prisma.project.create({
    data: {
      workspaceId,
      name,
      ...fields,
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
  data: { name?: string } & ProjectWriteFields,
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
