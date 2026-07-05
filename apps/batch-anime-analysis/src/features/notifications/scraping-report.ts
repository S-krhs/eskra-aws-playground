// In scope: アニメ指標スクレイピング結果から Discord 通知文を生成する
// Out of scope: スクレイピング実行、Webhook URL 解決、HTTP 通信を行う
import type { Metric } from "../../shared/intermediate-models/metric/metric.js";

const DISCORD_CONTENT_LIMIT = 2_000;
const DEFAULT_PREVIEW_LIMIT = 10;
const TRUNCATION_NOTE = "\n…（文字数上限のため以降を省略）";

/** スクレイピング結果レポートに添える取得元情報。 */
export interface ScrapingReportSource {
	websiteName: string;
	metricName: string;
}

/** アニメ指標スクレイピング結果レポートの入力。 */
export interface ScrapingReportInput {
	source: ScrapingReportSource;
	metrics: readonly Metric[];
	/** metric へ変換できず除外した件数。 */
	skippedCount?: number;
	previewLimit?: number;
}

/** アニメ指標スクレイピング結果から Discord 通知文を生成する。 */
export const buildScrapingReport = ({
	source,
	metrics,
	skippedCount = 0,
	previewLimit = DEFAULT_PREVIEW_LIMIT,
}: ScrapingReportInput): string => {
	const headerLines = [
		"📊 **アニメ指標スクレイピング結果**",
		`> 🌐 サイト：${source.websiteName}`,
		`> 📈 指標：${source.metricName}`,
		`> 🔢 件数：${formatNumber(metrics.length)} 件`,
	];
	if (skippedCount > 0) {
		headerLines.push(`> ⚠️ 変換除外：${formatNumber(skippedCount)} 件`);
	}
	const header = headerLines.join("\n");

	if (metrics.length === 0) {
		return `${header}\n\n> ⚠️ 対象のデータを取得できませんでした`;
	}

	const previewLines = metrics.slice(0, previewLimit).map((metric, index) => {
		return `\`${formatRank(index + 1)}\` ${metric.label} — **${formatNumber(metric.value)}**`;
	});
	const omittedCount = metrics.length - previewLines.length;
	const omittedLine =
		omittedCount > 0 ? [`…ほか ${formatNumber(omittedCount)} 件`] : [];
	const content = [header, "", ...previewLines, ...omittedLine].join("\n");

	if (content.length <= DISCORD_CONTENT_LIMIT) {
		return content;
	}

	return `${content.slice(0, DISCORD_CONTENT_LIMIT - TRUNCATION_NOTE.length)}${TRUNCATION_NOTE}`;
};

/** 桁区切り付きで数値を整形する。 */
const formatNumber = (value: number): string => {
	return value.toLocaleString("ja-JP");
};

/** プレビュー行の順位を右寄せ 2 桁で整形する。 */
const formatRank = (rank: number): string => {
	return String(rank).padStart(2, "0");
};
