// In scope: the runtime settings the BigQuery export job uses, and resolving them from the SST links and env vars
// Out of scope: interpreting the Lambda event, calling an external service, deciding the export dates
import { requireSecret } from "./require-linked-resource.js";

/** The runtime settings the BigQuery export job uses. */
export interface BigQueryExportSettings {
	serviceAccountKey: string;
	datasetId: string;
}

/** Resolves the runtime settings the BigQuery export job uses. */
export const getBigQueryExportSettings = (): BigQueryExportSettings => {
	const datasetId = process.env.BIGQUERY_DATASET?.trim();

	if (!datasetId) {
		throw new Error("BIGQUERY_DATASET が設定されていません。");
	}

	return {
		serviceAccountKey: requireSecret("GcpServiceAccountKey"),
		datasetId,
	};
};
