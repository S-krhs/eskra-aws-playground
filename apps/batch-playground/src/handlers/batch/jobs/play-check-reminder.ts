// In scope: 遊技チェックリマインダーの Discord 投稿バッチをオーケストレーションする
// Out of scope: リマインダーメッセージ生成や Discord Bot API HTTP 通信の詳細を持つ
import { DiscordBotClient } from "@eskra-aws-playground/integration-discord/discord-bot-client.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { channelSettingRepository } from "@eskra-aws-playground/repositories/playground/channel-setting/repository.js";
import { applicationKeys } from "@eskra-aws-playground/repositories/playground/shared/literals/application-key.js";
import { settingKeys } from "@eskra-aws-playground/repositories/playground/shared/literals/setting-key.js";
import { REMINDER_CHOICES } from "@eskra-aws-playground/shared-domains/contracts/reminder-choices.js";
import { Resource } from "sst/resource";
import {
	buildReminderChoicesMessage,
	buildReminderQuestionMessage,
} from "@/features/play-check-reminder/reminder-message.js";
import type { BatchResponse } from "@/handlers/batch/schema.js";

const logger = createBatchLogger("play-check-reminder");

/** 遊技チェックリマインダーをボタン付きメッセージとして Discord チャンネルへ投稿するバッチジョブ。 */
export const playCheckReminderJob = async (
	_event: unknown,
): Promise<BatchResponse> => {
	logger.start();
	// 1. Yaccho Bot token と登録済みの利用者設定を解決する。
	const discordBotToken = Resource.YacchoDiscordBotToken.value;
	const configs = await channelSettingRepository.findMany({
		applicationKey: applicationKeys.yacchoBot,
		settingKey: settingKeys.playCheckReminder,
	});

	// 2. 全設定へ質問と選択肢を投稿し、1件の失敗で他の送信を止めない。
	const botClient = new DiscordBotClient(discordBotToken);
	const results = await Promise.allSettled(
		configs.map(async ({ channelId, userId }) => {
			await botClient.postChannelMessage(
				channelId,
				buildReminderQuestionMessage(userId),
			);
			await botClient.postChannelMessage(
				channelId,
				buildReminderChoicesMessage(userId),
			);
		}),
	);
	const failureCount = results.filter((result) => {
		return result.status === "rejected";
	}).length;
	if (failureCount > 0) {
		const notificationError = new Error(
			`${failureCount}件のリマインダー投稿に失敗しました。`,
		);
		logger.failure(notificationError, {
			configCount: configs.length,
			failureCount,
		});
		throw notificationError;
	}

	logger.complete({
		choiceCount: REMINDER_CHOICES.length,
		configCount: configs.length,
	});

	// 3. Lambda ハンドラーへ共通レスポンスを返す。
	return {
		ok: true,
		job: "play-check-reminder",
		details: {
			choiceCount: REMINDER_CHOICES.length,
			configCount: configs.length,
		},
	};
};
