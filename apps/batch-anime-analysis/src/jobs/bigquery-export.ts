// In scope: 指定した日付範囲のアニメ指標を、取得日ごとに BigQuery のパーティションへ連携する
// Out of scope: Lambda エントリポイント、BigQuery API の詳細、行の列名変換、日付範囲の既定値決定
import { BigQueryPartitionLoader } from "@eskra-aws-playground/integration-bigquery/bigquery-partition-loader.js";
import { parseServiceAccountKey } from "@eskra-aws-playground/integration-bigquery/service-account-credentials.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { scrapingMetricRepository } from "@eskra-aws-playground/repositories/anime/scraping-metric.repository.js";
import { resolveExportRange } from "@/features/bigquery-export/export-range.js";
import { toScrapingMetricRow } from "@/features/bigquery-export/metric-row.js";
import {
	scrapingMetricTableDefinition,
	scrapingMetricTableId,
} from "@/features/bigquery-export/metric-table-definition.js";
import { batchNames } from "@/shared/routes/batch-names.js";
import { bigQueryExportEventSchema } from "@/shared/schemas/lambda/bigquery-export/event.js";
import type { BigQueryExportResponse } from "@/shared/schemas/lambda/bigquery-export/response.js";
import { getBigQueryExportSettings } from "./runtime-settings/bigquery-export-setting-resolver.js";

const logger = createBatchLogger(batchNames.animeMetricBigQueryExport);

// 1 日分をまとめてメモリに載せないための、1 回の読み出しあたりの行数
const readPageSize = 5_000;

/** 取得日の metric を、DB からページ単位で読みながら BigQuery の行として流す。 */
const readScrapingMetricRows = async function* (
	scrapedDate: string,
): AsyncGenerator<Record<string, unknown>> {
	let afterId: string | undefined;

	while (true) {
		const records = await scrapingMetricRepository.findManyByScrapedDate({
			scrapedDate,
			afterId,
			limit: readPageSize,
		});

		for (const record of records) {
			yield toScrapingMetricRow(record);
		}

		if (records.length < readPageSize) {
			return;
		}

		afterId = records[records.length - 1].id;
	}
};

/** 指定した日付範囲のアニメ指標を BigQuery へ連携する。 */
export const bigQueryExportJob = async (
	event: unknown,
): Promise<BigQueryExportResponse> => {
	// 1. 起動イベントを連携対象の日付範囲へ正規化する。
	const { startDate, endDate } = resolveExportRange(
		bigQueryExportEventSchema.parse(event),
	);

	logger.start({ startDate, endDate });

	// 2. 設定不足を DB へ問い合わせる前に検出するため、実行時設定を先に解決する。
	const { serviceAccountKey, datasetId } = getBigQueryExportSettings();
	const loader = new BigQueryPartitionLoader(
		parseServiceAccountKey(serviceAccountKey),
		{
			datasetId,
			tableId: scrapingMetricTableId,
			definition: scrapingMetricTableDefinition,
		},
	);

	// 3. 連携先テーブルを用意する。dataset は事前に作成済みであることを前提にする。
	// BigQuery client は遅延認証のため、鍵・dataset・権限の不備はこの呼び出しで初めて分かる。
	await loader.ensureTable();

	// 4. 範囲内で metric が存在する取得日だけを対象にする。
	const scrapedDates = await scrapingMetricRepository.findScrapedDates({
		startDate,
		endDate,
	});

	// 5. 取得日ごとにパーティションを置き換える。途中で失敗しても、済んだ取得日はそのまま残る。
	let exportedRowCount = 0;
	for (const scrapedDate of scrapedDates) {
		const { loadedRowCount } = await loader.replacePartition({
			partitionDate: scrapedDate,
			rows: readScrapingMetricRows(scrapedDate),
		});
		exportedRowCount += loadedRowCount;

		// 途中で timeout しても、どの取得日まで終えたかを追えるようにする
		logger.complete({ scrapedDate, loadedRowCount });
	}

	logger.complete({
		startDate,
		endDate,
		exportedDateCount: scrapedDates.length,
		exportedRowCount,
	});

	// 6. Lambda ハンドラーへレスポンスを返す。
	return {
		ok: true,
		job: batchNames.animeMetricBigQueryExport,
		details: {
			startDate,
			endDate,
			exportedDateCount: scrapedDates.length,
			exportedRowCount,
		},
	};
};
