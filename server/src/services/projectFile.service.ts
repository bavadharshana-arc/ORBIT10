import { prisma } from "../lib/prisma";

export const FILE_KINDS = ["document", "image", "pdf", "spreadsheet", "other"] as const;
export type FileKind = (typeof FILE_KINDS)[number];
export const isFileKind = (value: unknown): value is FileKind =>
  typeof value === "string" && (FILE_KINDS as readonly string[]).includes(value);

export const DEFAULT_FOLDER = "General";

// Matches workspace.service.ts's memberWithUser convention — id/name/email
// only, for hydrating the frontend's uploadedBy/WorkspaceActor shape.
const withUploader = {
  include: { uploader: { select: { id: true, name: true, email: true } } },
} as const;

export const listFilesForProject = async (projectId: string) => {
  return prisma.projectFile.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    ...withUploader,
  });
};

export const findFileInProject = async (projectId: string, fileId: string) => {
  return prisma.projectFile.findFirst({ where: { id: fileId, projectId } });
};

export type CreateFileInput = {
  name: string;
  extension: string;
  kind: FileKind;
  sizeBytes: number;
  folder: string;
  uploaderId?: string | null;
};

export const createFile = async (projectId: string, input: CreateFileInput) => {
  if (input.uploaderId !== undefined && input.uploaderId !== null) {
    return prisma.projectFile.create({
      data: {
        projectId,
        name: input.name,
        extension: input.extension,
        kind: input.kind,
        sizeBytes: input.sizeBytes,
        folder: input.folder,
        uploaderId: input.uploaderId,
      },
      ...withUploader,
    });
  }
  return prisma.projectFile.create({
    data: {
      projectId,
      name: input.name,
      extension: input.extension,
      kind: input.kind,
      sizeBytes: input.sizeBytes,
      folder: input.folder,
    },
    ...withUploader,
  });
};

export const deleteFile = async (projectId: string, fileId: string) => {
  const file = await findFileInProject(projectId, fileId);
  if (!file) {
    throw new Error("File not found");
  }

  await prisma.projectFile.delete({ where: { id: fileId } });
};
