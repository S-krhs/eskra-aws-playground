// In scope: BigQuery 連携 Lambda イベントを受け取り、BigQuery 連携 job を実行する
// Out of scope: 連携対象日の決定、metric の読み出し、BigQuery API の詳細を持つ
import { bigQueryExportJob } from "@/jobs/bigquery-export.js";
import type { BigQueryExportResponse } from "@/shared/schemas/lambda/bigquery-export/response.js";

/** アニメ指標 BigQuery 連携 Lambda のエントリポイント。 */
export const handler = async (
	event: unknown = {},
): Promise<BigQueryExportResponse> => {
	return bigQueryExportJob(event);
};
