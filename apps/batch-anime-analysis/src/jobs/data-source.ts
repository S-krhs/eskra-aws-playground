// In scope: running one dataSource's anime scrape from an SQS event
// Out of scope: the Lambda entry point, building the SQS message, each parser's detail
import { DiscordWebhookClient } from "@eskra-aws-playground/integration-discord/discord-webhook-client.js";
import { getCurrentJstDateString } from "@eskra-aws-playground/libs/date/current-jst-date.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { dataSourceRepository } from "@eskra-aws-playground/repositories/anime/data-source.repository.js";
import { scrapingMetricRepository } from "@eskra-aws-playground/repositories/anime/scraping-metric.repository.js";
import { buildScrapingReport } from "@/features/notifications/scraping-report.js";
import { getApiMetrics } from "@/features/scrape-api/get-metrics.js";
import { getWebpageMetrics } from "@/features/scrape-webpage/get-metrics.js";
import { batchNames } from "@/shared/routes/batch-names.js";
import { sqsWorkerEventSchema } from "@/shared/schemas/lambda/sqs-worker/event.js";
import type { SqsWorkerResponse } from "@/shared/schemas/lambda/sqs-worker/response.js";
import { dataSourceMessageSchema } from "@/shared/schemas/sqs/data-source/message.js";
import { getDataSourceSettings } from "./runtime-settings/data-source-setting-resolver.js";

const logger = createBatchLogger(batchNames.animeScrapingDataSource);

/** Processes an SQS message as one dataSource's anime scrape. */
export const dataSourceJob = async (
	event: unknown,
): Promise<SqsWorkerResponse> => {
	// Validate the whole launch event as the worker's input and pull out the records to process.
	const { Records } = sqsWorkerEventSchema.parse(event);

	const batchItemFailures: SqsWorkerResponse["batchItemFailures"] = [];
	let discordWebhookClient: DiscordWebhookClient | undefined;

	for (const record of Records) {
		const { messageId } = record;

		try {
			// 1. Normalize the SQS message body into the scrape job's input.
			const message = dataSourceMessageSchema.parse(JSON.parse(record.body));

			logger.start({
				messageId,
				dataSourceId: message.dataSourceId,
			});

			// 2. Read the scraping definition from the repository.
			const dataSource = dataSourceRepository.findUnique(message.dataSourceId);
			if (!dataSource) {
				throw new Error(
					`指定された dataSourceId が存在しません: ${message.dataSourceId}`,
				);
			}

			// 3. Fetch the metrics the way the definition says to.
			const sourceType = dataSource.source.type;
			const { metrics, skippedCount } =
				sourceType === "api"
					? await getApiMetrics(dataSource.source)
					: await getWebpageMetrics(dataSource.source);
			// The scraped date is a job meta-parameter, taken once the metrics are in
			const scrapedDate = getCurrentJstDateString();

			// 4. Save the scrape result to the DB; a failure is left to the per-record retry.
			await scrapingMetricRepository.saveScrapingResult({
				dataSourceId: dataSource.id,
				scrapedDate,
				metrics,
			});

			// 5. The Discord notification is a side effect after the save, and a failure doesn't retry the record.
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

	// 6. Return the per-record outcome to SQS.
	return {
		batchItemFailures,
	};
};
