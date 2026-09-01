// In scope: BigQuery 連携 Lambda が返すレスポンスの型を提供する
// Out of scope: 起動イベントの検証、metric の読み出し、BigQuery への書き込みを行う

/** BigQuery 連携 Lambda が返すレスポンス。 */
export interface BigQueryExportResponse {
	ok: true;
	job: string;
	details?: Record<string, unknown>;
}
