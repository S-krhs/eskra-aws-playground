// In scope: converting a stored metric into a BigQuery row matching the destination table's column names
// Out of scope: reading metrics, defining the table structure, calling the BigQuery API

/** One metric to convert; shaped so a repository row can be handed over as-is. */
export interface StoredMetric {
	id: string;
	dataSourceId: string;
	label: string;
	value: number;
	/** Scraped date in JST (YYYY-MM-DD). */
	scrapedDate: string;
	/** Time the row was stored (ISO 8601). */
	createdAt: string;
}

/** Converts a stored metric into the row written to BigQuery; id goes into the INTEGER column still as a string. */
export const toScrapingMetricRow = (
	metric: StoredMetric,
): Record<string, unknown> => {
	return {
		id: metric.id,
		data_source_id: metric.dataSourceId,
		label: metric.label,
		value: metric.value,
		scraped_date: metric.scrapedDate,
		created_at: metric.createdAt,
	};
};
