// In scope: アニメ指標スクレイピング結果から Discord 通知文を生成する
// Out of scope: スクレイピング実行、Webhook URL 解決、HTTP 通信を行う
import type { Metric } from "../../shared/intermediate/metric.js";

const DISCORD_CONTENT_LIMIT = 2_000;
const DEFAULT_PREVIEW_LIMIT = 10;

/** アニメ指標スクレイピング通知に表示する取得元情報。 */
export interface AnimeScrapingNotificationSource {
	websiteName: string;
	metricName: string;
	timeframe: string;
}

/** アニメ指標スクレイピング結果通知の入力。 */
export interface AnimeScrapingNotificationInput {
	source: AnimeScrapingNotificationSource;
	metrics: readonly Metric[];
	previewLimit?: number;
}

/** Discord Webhook へ送るアニメ指標スクレイピング結果通知。 */
export interface AnimeScrapingNotificationMessage {
	content: string;
}

/** アニメ指標スクレイピング結果から Discord 通知文を生成する。 */
export const buildAnimeScrapingNotificationMessage = ({
	source,
	metrics,
	previewLimit = DEFAULT_PREVIEW_LIMIT,
}: AnimeScrapingNotificationInput): AnimeScrapingNotificationMessage => {
	const header = [
		"アニメ指標スクレイピング結果",
		`site: ${source.websiteName}`,
		`metric: ${source.metricName}`,
		`timeframe: ${source.timeframe}`,
		`count: ${metrics.length}`,
	].join("\n");
	const previewLines = metrics
		.slice(0, previewLimit)
		.map((metric, index) => `${index + 1}. ${metric.label}: ${metric.value}`);
	const omittedCount = Math.max(metrics.length - previewLines.length, 0);
	const footer = omittedCount > 0 ? [`...and ${omittedCount} more`] : [];
	const content = [header, ...previewLines, ...footer].join("\n");

	if (content.length <= DISCORD_CONTENT_LIMIT) {
		return {
			content,
		};
	}

	return {
		content: `${content.slice(0, DISCORD_CONTENT_LIMIT - 20)}\n...truncated`,
	};
};
