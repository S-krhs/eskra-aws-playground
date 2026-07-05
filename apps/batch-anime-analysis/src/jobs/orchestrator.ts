// In scope: 該当スケジュールの dataSource についてアニメスクレイピング用 SQS message を投入する
// Out of scope: SQS message の受信、スクレイピング実行、DB 登録、通知送信を行う
import { createBatchLogger } from "@lambda-batch-playground/libs/logger/batch-logger.js";
import { dataSourceRepository } from "@lambda-batch-playground/repositories/anime/data-source.repository.js";
import type { BatchHandler, BatchResponse } from "../shared/infra/lambda.js";
import { getOrchestratorSettings } from "../shared/infra/secrets.js";
import { AwsSqsMessageSender } from "../shared/infra/sqs.js";
import { parseOrchestratorEvent } from "../features/parse-lambda-event/orchestrator-event.js";
import type { QueueMessage } from "../shared/intermediate-models/queue-message/queue-message.js";
import { batchNames } from "../shared/routes/batch-names.js";

const logger = createBatchLogger(batchNames.animeScrapingOrchestrator);

/** 該当スケジュールの dataSource のアニメスクレイピング実行要求を dataSource 単位で SQS へ投入する。 */
export const orchestratorJob: BatchHandler = async (
	event,
): Promise<BatchResponse> => {
	// 1. 起動イベントを orchestrator の実行入力として検証する。
	const { scheduleHour } = parseOrchestratorEvent(event);

	// 2. repository から該当スケジュールのスクレイピング定義を取得する。
	const dataSources = dataSourceRepository.findManyByScheduleHour(scheduleHour);

	// 3. dataSource 単位の実行要求 message を組み立てる。
	const queueMessages: QueueMessage[] = dataSources.map((dataSource) => {
		return { dataSourceId: dataSource.id };
	});

	logger.start({ scheduleHour, requestedCount: queueMessages.length });

	// 4. dataSource 単位の実行要求を SQS に投入する。
	const { queueUrl } = getOrchestratorSettings();
	const sender = new AwsSqsMessageSender(queueUrl);
	await sender.sendMessages(
		queueMessages.map((message, index) => {
			return {
				id: `message-${index}`,
				body: message,
			};
		}),
	);

	logger.complete({ scheduleHour, requestedCount: queueMessages.length });

	// 5. Lambda ハンドラーへ共通レスポンスを返す。
	return {
		ok: true,
		job: batchNames.animeScrapingOrchestrator,
		details: {
			scheduleHour,
			requestedCount: queueMessages.length,
			dataSourceIds: queueMessages.map((message) => {
				return message.dataSourceId;
			}),
		},
	};
};
