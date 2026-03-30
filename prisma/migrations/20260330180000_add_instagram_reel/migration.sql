-- CreateTable
CREATE TABLE "InstagramReel" (
    "id" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "posterUrl" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramReel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstagramReel_sortOrder_idx" ON "InstagramReel"("sortOrder");
