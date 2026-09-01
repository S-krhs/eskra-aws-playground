// In scope: BigQuery 連携 job が使う実行時設定の型と、SST link・環境変数からの解決を提供する
// Out of scope: Lambda イベント解釈、外部サービス送信、連携対象日の決定を行う
import { requireSecret } from "./require-linked-resource.js";

/** BigQuery 連携 job が使う実行時設定。 */
export interface BigQueryExportSettings {
	serviceAccountKey: string;
	datasetId: string;
}

/** BigQuery 連携 job が使う実行時設定を解決する。 */
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
