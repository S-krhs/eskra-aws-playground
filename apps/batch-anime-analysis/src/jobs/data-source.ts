// In scope: SQS event から dataSource 単位のアニメスクレイピングを実行する
// Out of scope: Lambda エントリポイント、SQS message の構築、個別 parser の詳細を持つ
import { DiscordWebhookClient } from "@eskra-aws-playground/integration-discord/discord-webhook-client.js";
import { getCurrentJstDateString } from "@eskra-aws-playground/libs/date/current-jst-date.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { dataSourceRepository } from "@eskra-aws-playground/repositories/anime/data-source.repository.js";
import { scrapingMetricRepository } from "@eskra-aws-playground/repositories/anime/scraping-metric.repository.js";
import { buildScrapingReport } from "../features/notifications/scraping-report.js";
import { getApiMetrics } from "../features/scrape-api/get-metrics.js";
import { getWebpageMetrics } from "../features/scrape-webpage/get-metrics.js";
import { batchNames } from "../shared/routes/batch-names.js";
import { sqsWorkerEventSchema } from "../shared/schemas/lambda/sqs-worker/event.js";
import type { SqsWorkerResponse } from "../shared/schemas/lambda/sqs-worker/response.js";
import { dataSourceMessageSchema } from "../shared/schemas/sqs/data-source/message.js";
import { getDataSourceSettings } from "./runtime-settings/data-source-setting-resolver.js";

const logger = createBatchLogger(batchNames.animeScrapingDataSource);

/** SQS message を dataSource 単位のアニメスクレイピングとして処理する。 */
export const dataSourceJob = async (
	event: unknown,
): Promise<SqsWorkerResponse> => {
	// 起動イベント全体を worker の入力として検証し、処理する record を取り出す。
	const { Records } = sqsWorkerEventSchema.parse(event);

	const batchItemFailures: SqsWorkerResponse["batchItemFailures"] = [];
	let discordWebhookClient: DiscordWebhookClient | undefined;

	for (const record of Records) {
		const { messageId } = record;

		try {
			// 1. SQS message body を dataSource スクレイピング job の入力へ正規化する。
			const message = dataSourceMessageSchema.parse(JSON.parse(record.body));

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
			const { metrics, skippedCount } =
				sourceType === "api"
					? await getApiMetrics(dataSource.source)
					: await getWebpageMetrics(dataSource.source);
			// 取得日は job のメタパラメータとして metric 取得完了時に採る
			const scrapedDate = getCurrentJstDateString();

			// 4. スクレイピング結果を DB へ保存する。失敗は record 単位の retry に任せる。
			await scrapingMetricRepository.saveScrapingResult({
				dataSourceId: dataSource.id,
				scrapedDate,
				metrics,
			});

			// 5. Discord 通知は保存後の副作用として扱い、失敗しても record retry しない。
			let notificationSucceeded = false;
			try {
				const reportMessage = buildScrapingReport({
					source: {
						websiteName: dataSource.websiteName,
						metricName: dataSource.metricName,
						higherIsBetter: dataSource.higherIsBetter,
					},
					metrics,
					skippedCount,
				});
				if (!discordWebhookClient) {
					const { discordWebhookUrl } = getDataSourceSettings();
					discordWebhookClient = new DiscordWebhookClient(discordWebhookUrl);
				}
				await discordWebhookClient.postMessage(reportMessage);
				notificationSucceeded = true;
			} catch (notificationError) {
				logger.failure(notificationError, {
					messageId,
					dataSourceId: dataSource.id,
					operation: "discord-notification",
					retryable: false,
				});
			}

			logger.complete({
				messageId,
				dataSourceId: dataSource.id,
				websiteName: dataSource.websiteName,
				metricName: dataSource.metricName,
				resultCount: metrics.length,
				skippedCount,
				notificationSucceeded,
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

	// 6. SQS へ record ごとの処理結果を返す。
	return {
		batchItemFailures,
	};
};
