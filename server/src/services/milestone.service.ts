import { prisma } from "../lib/prisma";

export type MilestoneWriteInput = {
  title?: string;
  done?: boolean;
  dueDate?: Date | null;
};

/**
 * Builds a Prisma data object containing only the fields the caller
 * actually set — mirrors task.service.ts's buildData, keeping every
 * assigned value definitely non-undefined for exactOptionalPropertyTypes.
 */
const buildData = (input: MilestoneWriteInput): MilestoneWriteInput => {
  const data: MilestoneWriteInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.done !== undefined) data.done = input.done;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate;
  return data;
};

export const listMilestonesForProject = async (projectId: string) => {
  return prisma.projectMilestone.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
};

export const findMilestoneInProject = async (projectId: string, milestoneId: string) => {
  return prisma.projectMilestone.findFirst({ where: { id: milestoneId, projectId } });
};

export const createMilestone = async (
  projectId: string,
  title: string,
  dueDate?: Date | null,
) => {
  if (dueDate !== undefined) {
    return prisma.projectMilestone.create({ data: { projectId, title, dueDate } });
  }
  return prisma.projectMilestone.create({ data: { projectId, title } });
};

export const updateMilestone = async (
  projectId: string,
  milestoneId: string,
  input: MilestoneWriteInput,
) => {
  const milestone = await findMilestoneInProject(projectId, milestoneId);
  if (!milestone) {
    throw new Error("Milestone not found");
  }

  return prisma.projectMilestone.update({ where: { id: milestoneId }, data: buildData(input) });
};

export const deleteMilestone = async (projectId: string, milestoneId: string) => {
  const milestone = await findMilestoneInProject(projectId, milestoneId);
  if (!milestone) {
    throw new Error("Milestone not found");
  }

  await prisma.projectMilestone.delete({ where: { id: milestoneId } });
};
