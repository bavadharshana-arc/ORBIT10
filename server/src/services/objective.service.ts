import { prisma } from "../lib/prisma";

export type ObjectiveWriteInput = {
  text?: string;
  done?: boolean;
};

/**
 * Builds a Prisma data object containing only the fields the caller
 * actually set — mirrors task.service.ts's buildData, keeping every
 * assigned value definitely non-undefined for exactOptionalPropertyTypes.
 */
const buildData = (input: ObjectiveWriteInput): ObjectiveWriteInput => {
  const data: ObjectiveWriteInput = {};
  if (input.text !== undefined) data.text = input.text;
  if (input.done !== undefined) data.done = input.done;
  return data;
};

export const listObjectivesForProject = async (projectId: string) => {
  return prisma.projectObjective.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
};

export const findObjectiveInProject = async (projectId: string, objectiveId: string) => {
  return prisma.projectObjective.findFirst({ where: { id: objectiveId, projectId } });
};

export const createObjective = async (projectId: string, text: string) => {
  return prisma.projectObjective.create({ data: { projectId, text } });
};

export const updateObjective = async (
  projectId: string,
  objectiveId: string,
  input: ObjectiveWriteInput,
) => {
  const objective = await findObjectiveInProject(projectId, objectiveId);
  if (!objective) {
    throw new Error("Objective not found");
  }

  return prisma.projectObjective.update({ where: { id: objectiveId }, data: buildData(input) });
};

export const deleteObjective = async (projectId: string, objectiveId: string) => {
  const objective = await findObjectiveInProject(projectId, objectiveId);
  if (!objective) {
    throw new Error("Objective not found");
  }

  await prisma.projectObjective.delete({ where: { id: objectiveId } });
};
