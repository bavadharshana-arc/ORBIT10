-- CreateTable
CREATE TABLE "DiscussionAttachment" (
    "id" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscussionAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscussionAttachment_discussionId_fileId_key" ON "DiscussionAttachment"("discussionId", "fileId");

-- AddForeignKey
ALTER TABLE "DiscussionAttachment" ADD CONSTRAINT "DiscussionAttachment_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionAttachment" ADD CONSTRAINT "DiscussionAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "ProjectFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
