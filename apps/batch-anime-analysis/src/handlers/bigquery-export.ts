// In scope: taking the BigQuery export Lambda's event and running the export job
// Out of scope: deciding the export dates, reading metrics, BigQuery API detail
import { bigQueryExportJob } from "@/jobs/bigquery-export.js";
import type { BigQueryExportResponse } from "@/shared/schemas/lambda/bigquery-export/response.js";

export const handler = async (
	event: unknown = {},
): Promise<BigQueryExportResponse> => {
	return bigQueryExportJob(event);
};
