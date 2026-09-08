// In scope: the response type the BigQuery export Lambda returns
// Out of scope: validating the launch event, reading metrics, writing to BigQuery

export interface BigQueryExportResponse {
	ok: true;
	job: string;
	details?: Record<string, unknown>;
}
