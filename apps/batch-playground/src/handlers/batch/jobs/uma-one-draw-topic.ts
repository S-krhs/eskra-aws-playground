// In scope: UMA ワンドロのお題通知バッチをオーケストレーションする
// Out of scope: お題メッセージ生成や Discord Webhook HTTP 通信の詳細を持つ
import { DiscordWebhookClient } from "@eskra-aws-playground/integration-discord/discord-webhook-client.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { Resource } from "sst/resource";

import { buildTopicMessage } from "@/features/uma-one-draw-topic/topic-message.js";
import type { BatchResponse } from "@/handlers/batch/schema.js";

const logger = createBatchLogger("uma-one-draw-topic");

/** UMA ワンドロのお題を Discord へ通知するバッチジョブ。 */
export const umaOneDrawTopicJob = async (
	_event: unknown,
): Promise<BatchResponse> => {
	// 1. SST link から送信先 Discord Webhook URL を解決する。
	const discordWebhookUrl = Resource.UmaOneDrawTopicDiscordWebhook.value;

	logger.start();

	// 2. feature で UMA ワンドロのお題メッセージを生成する。
	const message = buildTopicMessage();

	// 3. Discord Webhook integration へ送信を委譲する。失敗しても throw せず、
	//    Lambda 非同期リトライによる重複通知を防ぐ。
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

	// 4. Lambda ハンドラーへ共通レスポンスを返す。
	return {
		ok: true,
		job: "uma-one-draw-topic",
		details: {
			messageLength: message.content.length,
			notificationSucceeded,
		},
	};
};
