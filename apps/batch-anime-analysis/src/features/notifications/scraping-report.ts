// In scope: writing the Discord notification for an anime-metric scrape result
// Out of scope: running the scrape, resolving the webhook URL, HTTP calls
import type { Metric } from "@/shared/intermediate-models/metric/metric.js";

const DISCORD_CONTENT_LIMIT = 2_000;
const DEFAULT_PREVIEW_LIMIT = 5;
const TRUNCATION_NOTE = "\n…（文字数上限のため以降を省略）";
const RANK_MEDALS = ["🥇", "🥈", "🥉"];

export interface ScrapingReportSource {
	websiteName: string;
	metricName: string;
	higherIsBetter: boolean;
}

export interface ScrapingReportInput {
	source: ScrapingReportSource;
	metrics: readonly Metric[];
	skippedCount?: number;
	previewLimit?: number;
}

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

/** Orders the metrics so the top of the ranking comes first. */
const rankMetrics = (
	metrics: readonly Metric[],
	higherIsBetter: boolean,
): Metric[] => {
	const direction = higherIsBetter ? -1 : 1;
	return [...metrics].sort((a, b) => {
		return (a.value - b.value) * direction;
	});
};

/** Formats a number with thousands separators. */
const formatNumber = (value: number): string => {
	return value.toLocaleString("ja-JP");
};

/** The top 3 get medals; everything after uses a keycap emoji for its rank. */
const formatRank = (rank: number): string => {
	return RANK_MEDALS[rank - 1] ?? toKeycapEmoji(rank);
};

/** Keycap emoji only run 0-10, so anything past that falls back to a plain number. */
const toKeycapEmoji = (rank: number): string => {
	if (rank === 10) {
		return "🔟";
	}
	if (rank <= 9) {
		return `${rank}️⃣`;
	}
	return `\`${rank}\``;
};
