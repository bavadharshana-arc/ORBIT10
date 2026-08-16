-- CreateTable
CREATE TABLE "WorkspaceActivityEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "memberId" TEXT,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceActivityEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WorkspaceActivityEvent" ADD CONSTRAINT "WorkspaceActivityEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceActivityEvent" ADD CONSTRAINT "WorkspaceActivityEvent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
