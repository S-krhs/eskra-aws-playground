// In scope: 全 dataSource についてアニメスクレイピング用 SQS message を投入する
// Out of scope: SQS message の受信、スクレイピング実行、DB 登録、通知送信を行う
import { createBatchLogger } from "@lambda-batch-playground/libs/logger/batch-logger.js";
import { dataSourceRepository } from "@lambda-batch-playground/repositories/anime/data-source.repository.js";
import { buildQueueMessages } from "../features/queueing/queue-message.js";
import type { BatchHandler, BatchResponse } from "../shared/infra/lambda.js";
import { getOrchestratorSettings } from "../shared/infra/secrets.js";
import { AwsSqsMessageSender } from "../shared/infra/sqs.js";
import { batchNames } from "../shared/routes/batch-names.js";

const logger = createBatchLogger(batchNames.animeScrapingOrchestrator);

/** 全 dataSource のアニメスクレイピング実行要求を dataSource 単位で SQS へ投入する。 */
export const orchestratorJob: BatchHandler =
	async (): Promise<BatchResponse> => {
		// 1. repository から投入対象のスクレイピング定義を取得する。
		const dataSources = dataSourceRepository.findMany();
		const dataSourceIds = dataSources.map((dataSource) => {
			return dataSource.id;
		});

		// 2. dataSource 単位の実行要求 message を組み立てる。
		const queueMessages = buildQueueMessages(dataSourceIds);

		logger.start({ requestedCount: queueMessages.length });

		// 3. dataSource 単位の実行要求を SQS に投入する。
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

		logger.complete({ requestedCount: queueMessages.length });

		// 4. Lambda ハンドラーへ共通レスポンスを返す。
		return {
			ok: true,
			job: batchNames.animeScrapingOrchestrator,
			details: {
				requestedCount: queueMessages.length,
				dataSourceIds: queueMessages.map((message) => {
					return message.dataSourceId;
				}),
			},
		};
	};
