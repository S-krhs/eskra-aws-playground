// In scope: SQS event から dataSource 単位のアニメスクレイピングを実行する
// Out of scope: Lambda エントリポイント、SQS message の構築、個別 parser の詳細を持つ
import { DiscordWebhookClient } from "@lambda-batch-playground/integration-discord/discord-webhook-client.js";
import { createBatchLogger } from "@lambda-batch-playground/libs/logger/batch-logger.js";
import { dataSourceRepository } from "@lambda-batch-playground/repositories/anime/data-source.repository.js";
import { buildScrapingReport } from "../features/notifications/scraping-report.js";
import { getApiMetrics } from "../features/scrape-api/get-metrics.js";
import { getWebpageMetrics } from "../features/scrape-webpage/get-metrics.js";
import type {
	SqsBatchHandler,
	SqsBatchItemFailure,
} from "../shared/infra/lambda.js";
import { getDataSourceSettings } from "../shared/infra/secrets.js";
import { parseQueueMessage } from "../shared/intermediate-models/queue-message/queue-message.js";
import { batchNames } from "../shared/routes/batch-names.js";

const logger = createBatchLogger(batchNames.animeScrapingDataSource);

/** SQS message を dataSource 単位のアニメスクレイピングとして処理する。 */
export const dataSourceJob: SqsBatchHandler = async (event) => {
	const batchItemFailures: SqsBatchItemFailure[] = [];
	let discordWebhookClient: DiscordWebhookClient | undefined;

	for (const record of event.Records) {
		const { messageId } = record;

		try {
			// 1. SQS message body を dataSource スクレイピング job の入力へ正規化する。
			const message = parseQueueMessage(record.body);

			logger.start({
				messageId,
				dataSourceId: message.dataSourceId,
			});

			// 2. repository からスクレイピング定義を取得する。
			const dataSource = dataSourceRepository.findUnique(message.dataSourceId);
			if (!dataSource) {
				throw new Error(
					`指定された dataSourceId が存在しません: ${message.dataSourceId}`,
				);
			}

			// 3. 定義の取得方式に合わせて metric を取得する。
			const sourceType = dataSource.source.type;
			const metrics =
				sourceType === "api"
					? await getApiMetrics(dataSource.source)
					: await getWebpageMetrics(dataSource.source);

			// 4. Discord 通知文を生成して送信する。
			const reportMessage = buildScrapingReport({
				source: {
					websiteName: dataSource.websiteName,
					metricName: dataSource.metricName,
					timeframe: dataSource.timeframe,
				},
				metrics,
			});
			if (!discordWebhookClient) {
				const { discordWebhookUrl } = getDataSourceSettings();
				discordWebhookClient = new DiscordWebhookClient(discordWebhookUrl);
			}
			await discordWebhookClient.postMessage(reportMessage);

			logger.complete({
				messageId,
				dataSourceId: dataSource.id,
				websiteName: dataSource.websiteName,
				metricName: dataSource.metricName,
				resultCount: metrics.length,
			});
		} catch (error) {
			logger.failure(error, {
				messageId,
			});

			batchItemFailures.push({
				itemIdentifier: messageId,
			});
		}
	}

	// 5. SQS へ record ごとの処理結果を返す。
	return {
		batchItemFailures,
	};
};
