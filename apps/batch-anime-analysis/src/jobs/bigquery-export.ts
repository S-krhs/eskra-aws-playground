// In scope: exporting a date range of anime metrics into BigQuery, one scraped-date partition at a time
// Out of scope: the Lambda entry point, BigQuery API detail, column-name conversion, the default date range
import { BigQueryPartitionLoader } from "@eskra-aws-playground/integration-bigquery/bigquery-partition-loader.js";
import { parseServiceAccountKey } from "@eskra-aws-playground/integration-bigquery/service-account-credentials.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { scrapingMetricRepository } from "@eskra-aws-playground/repositories/anime/scraping-metric.repository.js";
import { resolveExportRange } from "@/features/bigquery-export/export-range.js";
import { toScrapingMetricRow } from "@/features/bigquery-export/metric-row.js";
import {
	scrapingMetricTableDefinition,
	scrapingMetricTableId,
} from "@/features/bigquery-export/metric-table-definition.js";
import { batchNames } from "@/shared/routes/batch-names.js";
import { bigQueryExportEventSchema } from "@/shared/schemas/lambda/bigquery-export/event.js";
import type { BigQueryExportResponse } from "@/shared/schemas/lambda/bigquery-export/response.js";
import { getBigQueryExportSettings } from "./runtime-settings/bigquery-export-setting-resolver.js";

const logger = createBatchLogger(batchNames.animeMetricBigQueryExport);

// Rows per read, so a whole day never sits in memory at once
const readPageSize = 5_000;

/** Streams a scraped date's metrics out as BigQuery rows, reading the DB a page at a time. */
const readScrapingMetricRows = async function* (
	scrapedDate: string,
): AsyncGenerator<Record<string, unknown>> {
	let afterId: string | undefined;

	while (true) {
		const records = await scrapingMetricRepository.findManyByScrapedDate({
			scrapedDate,
			afterId,
			limit: readPageSize,
		});

		for (const record of records) {
			yield toScrapingMetricRow(record);
		}

		if (records.length < readPageSize) {
			return;
		}

		afterId = records[records.length - 1].id;
	}
};

/** Exports a date range of anime metrics to BigQuery. */
export const bigQueryExportJob = async (
	event: unknown,
): Promise<BigQueryExportResponse> => {
	// 1. Normalize the launch event into the date range to export.
	const { startDate, endDate } = resolveExportRange(
		bigQueryExportEventSchema.parse(event),
	);

	logger.start({ startDate, endDate });

	// 2. Resolve the runtime settings first, so a missing one surfaces before the DB is queried.
	const { serviceAccountKey, datasetId } = getBigQueryExportSettings();
	const loader = new BigQueryPartitionLoader(
		parseServiceAccountKey(serviceAccountKey),
		{
			datasetId,
			tableId: scrapingMetricTableId,
			definition: scrapingMetricTableDefinition,
		},
	);

	// 3. Prepare the destination table, assuming the dataset was created beforehand.
	// The BigQuery client authenticates lazily, so a bad key, dataset or permission first surfaces on this call.
	await loader.ensureTable();

	// 4. Narrow to the scraped dates in range that actually hold metrics.
	const scrapedDates = await scrapingMetricRepository.findScrapedDates({
		startDate,
		endDate,
	});

	// 5. Replace one partition per scraped date; a failure partway leaves the finished dates in place.
	let exportedRowCount = 0;
	for (const scrapedDate of scrapedDates) {
		const { loadedRowCount } = await loader.replacePartition({
			partitionDate: scrapedDate,
			rows: readScrapingMetricRows(scrapedDate),
		});
		exportedRowCount += loadedRowCount;

		// So a run that times out partway still shows which scraped date it got to
		logger.complete({ scrapedDate, loadedRowCount });
	}

	logger.complete({
		startDate,
		endDate,
		exportedDateCount: scrapedDates.length,
		exportedRowCount,
	});

	// 6. Return the response to the Lambda handler.
	return {
		ok: true,
		job: batchNames.animeMetricBigQueryExport,
		details: {
			startDate,
			endDate,
			exportedDateCount: scrapedDates.length,
			exportedRowCount,
		},
	};
};
