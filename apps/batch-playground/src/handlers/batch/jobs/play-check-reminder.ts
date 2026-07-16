// In scope: 遊技チェックリマインダーの Discord 投稿バッチをオーケストレーションする
// Out of scope: リマインダーメッセージ生成や Discord Bot API HTTP 通信の詳細を持つ
import { DiscordBotClient } from "@eskra-aws-playground/integration-discord/discord-bot-client.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { Resource } from "sst/resource";

import { buildChoiceMessage } from "../../../external-protocols/discord-message/build.js";
import {
	REMINDER_CHOICES,
	REMINDER_CUSTOM_ID_PREFIX,
	REMINDER_QUESTION,
} from "../../../features/play-check-reminder/reminder-settings.js";
import type { BatchResponse } from "../schema.js";

const logger = createBatchLogger("play-check-reminder");

/** 遊技チェックリマインダーをボタン付きメッセージとして Discord チャンネルへ投稿するバッチジョブ。 */
export const playCheckReminderJob = async (
	_event: unknown,
): Promise<BatchResponse> => {
	// 1. SST link から Bot token・投稿先チャンネル ID・対象ユーザー ID を解決する。
	const discordBotToken = Resource.DiscordBotToken.value;
	const discordChannelId = Resource.PlayCheckReminderDiscordChannelId.value;
	const targetUserId = Resource.PlayCheckReminderTargetUserId.value;

	logger.start();

	// 2. 選択肢定義から Discord payload を構築し、integration へ渡して投稿する。
	try {
		const botClient = new DiscordBotClient(discordBotToken);
		const payload = buildChoiceMessage(targetUserId, {
			prompt: REMINDER_QUESTION,
			customIdPrefix: REMINDER_CUSTOM_ID_PREFIX,
			choices: REMINDER_CHOICES,
		});
		await botClient.postChannelMessage(discordChannelId, payload);
	} catch (notificationError) {
		logger.failure(notificationError);
		throw notificationError;
	}

	logger.complete({ choiceCount: REMINDER_CHOICES.length });

	// 3. Lambda ハンドラーへ共通レスポンスを返す。
	return {
		ok: true,
		job: "play-check-reminder",
		details: {
			choiceCount: REMINDER_CHOICES.length,
		},
	};
};
