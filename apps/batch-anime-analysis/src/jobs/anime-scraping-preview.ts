// やること: repository のスクレイピング定義を実行し、Discord 通知プレビューをオーケストレーションする
// やらないこと: API/HTML レスポンス解析詳細、DB 登録、Webhook HTTP 通信の詳細を持つ
import { DiscordWebhookClient } from "@lambda-batch-playground/integration-discord/discord-webhook-client.js";
import { dataSourceRepository } from "@lambda-batch-playground/repositories/anime/data-source.repository.js";
import { buildAnimeScrapingNotificationMessage } from "../features/notifications/scraping-notification.js";
import { getApiMetrics } from "../features/scrape-api/get-api-metrics.js";
import { getWebpageMetrics } from "../features/scrape-webpage/get-webpage-metrics.js";
import type {
	BatchHandler,
	BatchResponse,
	LambdaEvent,
} from "../shared/infra/lambda.js";
import { getEventString } from "../shared/infra/lambda.js";
import { resolveSecrets } from "../shared/infra/secrets.js";
import { batchRoutes } from "../shared/routes/batch-routes.js";

/** repository のスクレイピング定義を実行して Discord へ通知するプレビュージョブ。 */
export const animeScrapingPreviewJobHandler: BatchHandler = async (
	event: LambdaEvent,
): Promise<BatchResponse> => {
	// 1. repository からスクレイピング定義を取得する。
	const dataSourceId = getEventString(event, "dataSourceId");
	const dataSource = dataSourceRepository.findUnique(dataSourceId);
	if (!dataSource) {
		throw new Error(`指定された dataSourceId が存在しません: ${dataSourceId}`);
	}

	console.log("アニメ指標スクレイピングプレビュー 開始", {
		dataSourceId: dataSource.id,
		websiteName: dataSource.websiteName,
		metricName: dataSource.metricName,
		timeframe: dataSource.timeframe,
		type: dataSource.source.type,
	});

	// 2. 定義の取得方式に合わせて metric を取得する。
	const sourceType = dataSource.source.type;
	const metrics =
		sourceType === "api"
			? await getApiMetrics(dataSource.source)
			: await getWebpageMetrics(dataSource.source);

	// 3. Discord 通知文を生成して送信する。
	const { discordWebhookUrl } = resolveSecrets();
	const message = buildAnimeScrapingNotificationMessage({
		source: {
			websiteName: dataSource.websiteName,
			metricName: dataSource.metricName,
			timeframe: dataSource.timeframe,
		},
		metrics,
	});
	const webhookClient = new DiscordWebhookClient(discordWebhookUrl);
	await webhookClient.postMessage(message.content);

	console.log("アニメ指標スクレイピングプレビュー 完了", {
		dataSourceId: dataSource.id,
		websiteName: dataSource.websiteName,
		metricName: dataSource.metricName,
		resultCount: metrics.length,
	});

	// 4. Lambda ハンドラーへ共通レスポンスを返す。
	return {
		ok: true,
		job: batchRoutes.animeScrapingPreview,
		details: {
			dataSourceId: dataSource.id,
			websiteName: dataSource.websiteName,
			metricName: dataSource.metricName,
			timeframe: dataSource.timeframe,
			type: dataSource.source.type,
			resultCount: metrics.length,
			messageLength: message.content.length,
		},
	};
};
