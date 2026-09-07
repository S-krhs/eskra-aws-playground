// In scope: the identifier and structure of the BigQuery table anime metrics are exported to
// Out of scope: converting rows, resolving the dataset, calling the BigQuery API
import type { BigQueryTableDefinition } from "@eskra-aws-playground/integration-bigquery/bigquery-partition-loader.js";

/** The destination table's name; the dataset is switched per stage through an env var. */
export const scrapingMetricTableId = "scraping_metrics";

/** The destination table's structure; it is replaced one scraped-date DAY partition at a time. */
export const scrapingMetricTableDefinition: BigQueryTableDefinition = {
	fields: [
		{ name: "id", type: "INTEGER", mode: "REQUIRED" },
		{ name: "data_source_id", type: "STRING", mode: "REQUIRED" },
		{ name: "label", type: "STRING", mode: "REQUIRED" },
		{ name: "value", type: "FLOAT", mode: "REQUIRED" },
		{ name: "scraped_date", type: "DATE", mode: "REQUIRED" },
		{ name: "created_at", type: "TIMESTAMP", mode: "REQUIRED" },
	],
	partitionField: "scraped_date",
	clusteringFields: ["data_source_id"],
};
