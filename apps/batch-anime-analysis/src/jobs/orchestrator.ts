// In scope: enqueuing the anime-scrape SQS messages for the dataSources on a given schedule
// Out of scope: receiving SQS messages, running the scrape, writing to the DB, sending notifications

import { SqsMessageSender } from "@eskra-aws-playground/integration-sqs/sqs-message-sender.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { dataSourceRepository } from "@eskra-aws-playground/repositories/anime/data-source.repository.js";
import { batchNames } from "@/_shared/routes/batch-names.js";
import { orchestratorEventSchema } from "@/_shared/schemas/lambda/orchestrator/event.js";
import type { OrchestratorResponse } from "@/_shared/schemas/lambda/orchestrator/response.js";
import type { DataSourceMessage } from "@/_shared/schemas/sqs/data-source/message.js";
import { getOrchestratorSettings } from "./runtime-settings/orchestrator-setting-resolver.js";

const logger = createBatchLogger(batchNames.animeScrapingOrchestrator);

/** Enqueues one scrape request per dataSource on the given schedule. */
export const orchestratorJob = async (
	event: unknown,
): Promise<OrchestratorResponse> => {
	// 1. Validate the launch event as the orchestrator's input.
	const { scheduleHour } = orchestratorEventSchema.parse(event);

	// 2. Read that schedule's scraping definitions from the repository.
	const dataSources = dataSourceRepository.findManyByScheduleHour(scheduleHour);

	// 3. Build one request message per dataSource.
	const dataSourceMessages: DataSourceMessage[] = dataSources.map(
		(dataSource) => {
			return { dataSourceId: dataSource.id };
		},
	);

	logger.start({ scheduleHour, requestedCount: dataSourceMessages.length });

	// 4. Enqueue those requests on SQS.
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

	// 5. Return the response to the Lambda handler.
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
