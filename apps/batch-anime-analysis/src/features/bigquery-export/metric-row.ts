// In scope: 蓄積済み metric を連携先テーブルの列名に合わせた BigQuery の行へ変換する
// Out of scope: metric の読み出し、テーブル構造の定義、BigQuery API の呼び出しを行う

/** BigQuery の行へ変換する metric 1 件。repository の行をそのまま渡せる形にする。 */
export interface StoredMetric {
	id: string;
	dataSourceId: string;
	label: string;
	value: number;
	/** JST 基準の取得日(YYYY-MM-DD)。 */
	scrapedDate: string;
	/** 保存時刻(ISO 8601)。 */
	createdAt: string;
}

/** 蓄積済み metric を BigQuery へ書き込む行へ変換する。id は INTEGER 列へ文字列のまま渡す。 */
export const toScrapingMetricRow = (
	metric: StoredMetric,
): Record<string, unknown> => {
	return {
		id: metric.id,
		data_source_id: metric.dataSourceId,
		label: metric.label,
		value: metric.value,
		scraped_date: metric.scrapedDate,
		created_at: metric.createdAt,
	};
};
