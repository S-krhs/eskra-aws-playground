// In scope: 該当スケジュールの dataSource についてアニメスクレイピング用 SQS message を投入する
// Out of scope: SQS message の受信、スクレイピング実行、DB 登録、通知送信を行う

import { SqsMessageSender } from "@eskra-aws-playground/integration-sqs/sqs-message-sender.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { dataSourceRepository } from "@eskra-aws-playground/repositories/anime/data-source.repository.js";
import { batchNames } from "@/shared/routes/batch-names.js";
import { orchestratorEventSchema } from "@/shared/schemas/lambda/orchestrator/event.js";
import type { OrchestratorResponse } from "@/shared/schemas/lambda/orchestrator/response.js";
import type { DataSourceMessage } from "@/shared/schemas/sqs/data-source/message.js";
import { getOrchestratorSettings } from "./runtime-settings/orchestrator-setting-resolver.js";

const logger = createBatchLogger(batchNames.animeScrapingOrchestrator);

/** 該当スケジュールの dataSource のアニメスクレイピング実行要求を dataSource 単位で SQS へ投入する。 */
export const orchestratorJob = async (
	event: unknown,
): Promise<OrchestratorResponse> => {
	// 1. 起動イベントを orchestrator の実行入力として検証する。
	const { scheduleHour } = orchestratorEventSchema.parse(event);

	// 2. repository から該当スケジュールのスクレイピング定義を取得する。
	const dataSources = dataSourceRepository.findManyByScheduleHour(scheduleHour);

	// 3. dataSource 単位の実行要求 message を組み立てる。
	const dataSourceMessages: DataSourceMessage[] = dataSources.map(
		(dataSource) => {
			return { dataSourceId: dataSource.id };
		},
	);

	logger.start({ scheduleHour, requestedCount: dataSourceMessages.length });

	// 4. dataSource 単位の実行要求を SQS に投入する。
	const { queueUrl } = getOrchestratorSettings();
	const sender = new SqsMessageSender(queueUrl);
	await sender.sendMessages(
		dataSourceMessages.map((message, index) => {
			return {
				id: `message-${index}`,
				body: message,
			};
		}),
	);

	logger.complete({ scheduleHour, requestedCount: dataSourceMessages.length });

	// 5. Lambda ハンドラーへレスポンスを返す。
	return {
		ok: true,
		job: batchNames.animeScrapingOrchestrator,
		details: {
			scheduleHour,
			requestedCount: dataSourceMessages.length,
			dataSourceIds: dataSourceMessages.map((message) => {
				return message.dataSourceId;
			}),
		},
	};
};
