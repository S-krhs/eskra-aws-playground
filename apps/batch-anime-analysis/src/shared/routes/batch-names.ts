// In scope: the one place listing the batch job names available in this app
// Out of scope: job implementations, interpreting the Lambda event

/** The job names this app supports. */
export const batchNames = {
	animeScrapingOrchestrator: "anime-scraping-orchestrator",
	animeScrapingDataSource: "anime-scraping-data-source",
	animeMetricBigQueryExport: "anime-metric-bigquery-export",
} as const;
