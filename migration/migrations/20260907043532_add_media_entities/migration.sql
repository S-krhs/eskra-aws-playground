-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "media";

-- CreateTable
CREATE TABLE "media"."media_objects" (
    "id" UUID NOT NULL,
    "object_key" VARCHAR(1024) NOT NULL,
    "logical_path" VARCHAR(512) NOT NULL,
    "file_name" VARCHAR(512) NOT NULL,
    "content_type" VARCHAR(128) NOT NULL,
    "byte_size" BIGINT NOT NULL,
    "etag" VARCHAR(128) NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration_ms" INTEGER,
    "thumbnail_key" VARCHAR(1024),
    "uploaded_at" TIMESTAMPTZ NOT NULL,
    "synced_at" TIMESTAMPTZ NOT NULL,
    "trashed_at" TIMESTAMPTZ,

    CONSTRAINT "media_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media"."media_folders" (
    "path" VARCHAR(512) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_folders_pkey" PRIMARY KEY ("path")
);

-- CreateTable
CREATE TABLE "media"."media_tags" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(64) NOT NULL,

    CONSTRAINT "media_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media"."media_object_tags" (
    "media_object_id" UUID NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "media_object_tags_pkey" PRIMARY KEY ("media_object_id","tag_id")
);

-- CreateTable
CREATE TABLE "media"."media_sync_runs" (
    "id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "scanned_count" INTEGER NOT NULL DEFAULT 0,
    "inserted_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "deleted_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "media_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_objects_object_key_key" ON "media"."media_objects"("object_key");

-- CreateIndex
CREATE INDEX "media_objects_logical_path_idx" ON "media"."media_objects"("logical_path");

-- CreateIndex
CREATE INDEX "media_objects_trashed_at_uploaded_at_idx" ON "media"."media_objects"("trashed_at", "uploaded_at");

-- CreateIndex
CREATE UNIQUE INDEX "media_tags_name_key" ON "media"."media_tags"("name");

-- CreateIndex
CREATE INDEX "media_object_tags_tag_id_idx" ON "media"."media_object_tags"("tag_id");

-- CreateIndex
CREATE INDEX "media_sync_runs_started_at_idx" ON "media"."media_sync_runs"("started_at");

-- AddForeignKey
ALTER TABLE "media"."media_object_tags" ADD CONSTRAINT "media_object_tags_media_object_id_fkey" FOREIGN KEY ("media_object_id") REFERENCES "media"."media_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media"."media_object_tags" ADD CONSTRAINT "media_object_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "media"."media_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
