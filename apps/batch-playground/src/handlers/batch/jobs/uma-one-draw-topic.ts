// In scope: orchestrating the UMA one-draw topic notification batch
// Out of scope: writing the topic message, Discord webhook HTTP detail
import { DiscordWebhookClient } from "@eskra-aws-playground/integration-discord/discord-webhook-client.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { Resource } from "sst/resource";

import { buildTopicMessage } from "@/features/uma-one-draw-topic/topic-message.js";
import type { BatchResponse } from "@/handlers/batch/schema.js";

const logger = createBatchLogger("uma-one-draw-topic");

export const umaOneDrawTopicJob = async (
	_event: unknown,
): Promise<BatchResponse> => {
	// 1. Resolve the destination Discord webhook URL from the SST link.
	const discordWebhookUrl = Resource.UmaOneDrawTopicDiscordWebhook.value;

	logger.start();

	// 2. Write the topic message in the feature.
	const message = await buildTopicMessage();

	// 3. Delegate sending to the Discord webhook integration. A failure doesn't throw, which keeps
	//    Lambda's async retry from posting the notification twice.
	let notificationSucceeded = false;
	try {
		const webhookClient = new DiscordWebhookClient(discordWebhookUrl);
		await webhookClient.postMessage(message.content);
		notificationSucceeded = true;
	} catch (notificationError) {
		logger.failure(notificationError, { retryable: false });
	}

	logger.complete({
		messageLength: message.content.length,
		notificationSucceeded,
	});

	// 4. Return the shared response to the Lambda handler.
	return {
		ok: true,
		job: "uma-one-draw-topic",
		details: {
			messageLength: message.content.length,
			notificationSucceeded,
		},
	};
};
