// In scope: アニメ指標の連携先 BigQuery テーブルの識別子と構造定義を持つ
// Out of scope: 行の変換、dataset の解決、BigQuery API の呼び出しを行う
import type { BigQueryTableDefinition } from "@eskra-aws-playground/integration-bigquery/bigquery-partition-loader.js";

/** アニメ指標の連携先テーブル名。dataset は stage ごとに環境変数で切り替える。 */
export const scrapingMetricTableId = "scraping_metrics";

/** アニメ指標の連携先テーブル構造。取得日の DAY パーティション単位で置き換える。 */
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
