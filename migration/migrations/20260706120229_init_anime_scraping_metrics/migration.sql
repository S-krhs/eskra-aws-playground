-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "anime";

-- CreateTable
CREATE TABLE "anime"."scraping_metrics" (
    "id" BIGSERIAL NOT NULL,
    "data_source_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "scraped_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scraping_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scraping_metrics_data_source_id_scraped_date_idx" ON "anime"."scraping_metrics"("data_source_id", "scraped_date");
