-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "assigneeId" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "priority" TEXT,
ADD COLUMN     "status" TEXT;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
