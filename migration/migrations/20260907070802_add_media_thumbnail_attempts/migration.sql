-- AlterTable
ALTER TABLE "media"."media_objects" ADD COLUMN     "thumbnail_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "thumbnail_enqueued_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "media"."media_sync_runs" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "media_sync_runs_finished_at_created_at_idx" ON "media"."media_sync_runs"("finished_at", "created_at");
