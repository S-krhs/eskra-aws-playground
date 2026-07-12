// In scope: UMA ワンドロのお題通知バッチをオーケストレーションする
// Out of scope: お題メッセージ生成や Discord Webhook HTTP 通信の詳細を持つ
import { DiscordWebhookClient } from "@eskra-aws-playground/integration-discord/discord-webhook-client.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";

import { isUmaOneDrawTopicExecutionHour } from "../features/uma-one-draw-topic/execution-window.js";
import { buildTopicMessage } from "../features/uma-one-draw-topic/topic-message.js";
import { batchNames } from "../shared/routes/batch-names.js";
import type { BatchResponse } from "../shared/schemas/lambda/batch/response.js";
import { getUmaOneDrawTopicSettings } from "./runtime-settings/uma-one-draw-topic-setting-resolver.js";

const logger = createBatchLogger(batchNames.umaOneDrawTopic);

/** UMA ワンドロのお題を Discord へ通知するバッチジョブ。 */
export const umaOneDrawTopicJob = async (
	_event: unknown,
): Promise<BatchResponse> => {
	logger.start();

	// 1. JST 12-18 時のうち今日の実行対象時刻でなければ送信せず終了する。
	if (!isUmaOneDrawTopicExecutionHour(new Date())) {
		logger.complete({ skipped: true });

		return {
			ok: true,
			job: batchNames.umaOneDrawTopic,
			details: { skipped: true },
		};
	}

	// 2. 実行時設定から送信先 Discord Webhook URL を解決する。
	const { discordWebhookUrl } = getUmaOneDrawTopicSettings();

	// 3. feature で UMA ワンドロのお題メッセージを生成する。
	const message = buildTopicMessage();

	// 4. Discord Webhook integration へ送信を委譲する。
	const webhookClient = new DiscordWebhookClient(discordWebhookUrl);
	await webhookClient.postMessage(message.content);

	logger.complete({ messageLength: message.content.length });

	// 5. Lambda ハンドラーへ共通レスポンスを返す。
	return {
		ok: true,
		job: batchNames.umaOneDrawTopic,
		details: {
			messageLength: message.content.length,
		},
	};
};
