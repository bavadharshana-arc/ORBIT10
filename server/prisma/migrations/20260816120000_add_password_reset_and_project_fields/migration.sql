-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordResetTokenHash" TEXT,
ADD COLUMN     "passwordResetExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "tag" TEXT,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "dueDate" TIMESTAMP(3);
