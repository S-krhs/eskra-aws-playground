-- AlterTable
ALTER TABLE "media"."media_sync_runs" ADD COLUMN     "running" BOOLEAN;

-- CreateIndex
CREATE UNIQUE INDEX "media_sync_runs_running_key" ON "media"."media_sync_runs"("running");
