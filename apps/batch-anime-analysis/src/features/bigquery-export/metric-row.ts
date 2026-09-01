// In scope: repository の metric 行を連携先テーブルの列名に合わせた BigQuery の行へ変換する
// Out of scope: metric の読み出し、テーブル構造の定義、BigQuery API の呼び出しを行う
import type { ScrapingMetricRecord } from "@eskra-aws-playground/repositories/anime/scraping-metric.repository.js";

/** repository の metric 行を BigQuery へ書き込む行へ変換する。id は INTEGER 列へ文字列のまま渡す。 */
export const toScrapingMetricRow = (
	record: ScrapingMetricRecord,
): Record<string, unknown> => {
	return {
		id: record.id,
		data_source_id: record.dataSourceId,
		label: record.label,
		value: record.value,
		scraped_date: record.scrapedDate,
		created_at: record.createdAt,
	};
};
