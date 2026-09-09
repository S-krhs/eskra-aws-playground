-- DropIndex
DROP INDEX "media"."media_objects_logical_path_idx";

-- CreateIndex
CREATE INDEX "media_objects_logical_path_trashed_at_uploaded_at_id_idx" ON "media"."media_objects"("logical_path", "trashed_at", "uploaded_at", "id");
