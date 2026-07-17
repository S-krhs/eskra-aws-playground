// In scope: アニメ指標スクレイピング結果から Discord 通知文を生成する
// Out of scope: スクレイピング実行、Webhook URL 解決、HTTP 通信を行う
import type { Metric } from "@/shared/intermediate-models/metric/metric.js";

const DISCORD_CONTENT_LIMIT = 2_000;
const DEFAULT_PREVIEW_LIMIT = 5;
const TRUNCATION_NOTE = "\n…（文字数上限のため以降を省略）";
const RANK_MEDALS = ["🥇", "🥈", "🥉"];

/** スクレイピング結果レポートに添える取得元情報。 */
export interface ScrapingReportSource {
	websiteName: string;
	metricName: string;
	higherIsBetter: boolean;
}

/** アニメ指標スクレイピング結果レポートの入力。 */
export interface ScrapingReportInput {
	source: ScrapingReportSource;
	metrics: readonly Metric[];
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
	const summary = [`${source.websiteName}・${source.metricName}`];
	summary.push(`${formatNumber(metrics.length)} 件`);
	if (skippedCount > 0) {
		summary.push(`除外：${formatNumber(skippedCount)} 件`);
	}
	const header = `📊 **データ取得結果** ｜ ${summary.join(" ｜ ")}`;

	if (metrics.length === 0) {
		return `${header}\n\n> ⚠️ 対象のデータを取得できませんでした`;
	}

	const ranked = rankMetrics(metrics, source.higherIsBetter);
	const previewLines = ranked.slice(0, previewLimit).map((metric, index) => {
		return `${formatRank(index + 1)} ${metric.label} — **${formatNumber(metric.value)}**`;
	});
	const content = [header, "", ...previewLines].join("\n");

	if (content.length <= DISCORD_CONTENT_LIMIT) {
		return content;
	}

	return `${content.slice(0, DISCORD_CONTENT_LIMIT - TRUNCATION_NOTE.length)}${TRUNCATION_NOTE}`;
};

/** 指標の上位が先頭に来るよう metric を並べ替える。 */
const rankMetrics = (
	metrics: readonly Metric[],
	higherIsBetter: boolean,
): Metric[] => {
	const direction = higherIsBetter ? -1 : 1;
	return [...metrics].sort((a, b) => {
		return (a.value - b.value) * direction;
	});
};

/** 桁区切り付きで数値を整形する。 */
const formatNumber = (value: number): string => {
	return value.toLocaleString("ja-JP");
};

/** 上位 3 件はメダル、それ以降はキーキャップ絵文字で順位を表す。 */
const formatRank = (rank: number): string => {
	return RANK_MEDALS[rank - 1] ?? toKeycapEmoji(rank);
};

/** キーキャップ絵文字は 0〜10 しか無いため、超えたら番号表記へ落とす。 */
const toKeycapEmoji = (rank: number): string => {
	if (rank === 10) {
		return "🔟";
	}
	if (rank <= 9) {
		return `${rank}️⃣`;
	}
	return `\`${rank}\``;
};
