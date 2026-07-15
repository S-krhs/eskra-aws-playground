// In scope: 遊技チェックリマインダーの Discord 投稿バッチをオーケストレーションする
// Out of scope: リマインダーメッセージ生成や Discord Bot API HTTP 通信の詳細を持つ
import {
	type DiscordActionRow,
	DiscordBotClient,
	type DiscordButtonComponent,
	type DiscordChannelMessagePayload,
} from "@eskra-aws-playground/integration-discord/discord-bot-client.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { Resource } from "sst/resource";

import {
	buildReminderMessage,
	type ReminderMessage,
} from "../../../features/play-check-reminder/reminder-message.js";
import type { BatchResponse } from "../schema.js";

const logger = createBatchLogger("play-check-reminder");

/** feature のプラットフォーム非依存メッセージを Discord のチャンネル投稿 payload へ変換する。 */
const toDiscordChannelMessagePayload = (
	message: ReminderMessage,
	targetUserId: string,
): DiscordChannelMessagePayload => {
	const actionRow: DiscordActionRow = {
		type: 1,
		components: message.choices.map((choice): DiscordButtonComponent => {
			return {
				type: 2,
				style: choice.style,
				label: choice.label,
				custom_id: choice.customId,
			};
		}),
	};

	return {
		content: message.content,
		components: [actionRow],
		allowed_mentions: { parse: [], users: [targetUserId] },
	};
};

/** 遊技チェックリマインダーをボタン付きメッセージとして Discord チャンネルへ投稿するバッチジョブ。 */
export const playCheckReminderJob = async (
	_event: unknown,
): Promise<BatchResponse> => {
	// 1. SST link から Bot token・投稿先チャンネル ID・対象ユーザー ID を解決する。
	const discordBotToken = Resource.DiscordBotToken.value;
	const discordChannelId = Resource.PlayCheckReminderDiscordChannelId.value;
	const targetUserId = Resource.PlayCheckReminderTargetUserId.value;

	logger.start();

	// 2. feature でメンションと選択肢ボタン付きのリマインダーメッセージを生成する。
	const message = buildReminderMessage(targetUserId);

	// 3. Discord Bot integration へ投稿を委譲する。失敗は throw して Lambda の
	//    Errors メトリクス経由でアラームへ届ける(非同期リトライは infra 側で 0 に
	//    設定しているため、throw しても投稿は重複しない)。
	try {
		const botClient = new DiscordBotClient(discordBotToken);
		await botClient.postChannelMessage(
			discordChannelId,
			toDiscordChannelMessagePayload(message, targetUserId),
		);
	} catch (notificationError) {
		logger.failure(notificationError);
		throw notificationError;
	}

	logger.complete({ choiceCount: message.choices.length });

	// 4. Lambda ハンドラーへ共通レスポンスを返す。
	return {
		ok: true,
		job: "play-check-reminder",
		details: {
			choiceCount: message.choices.length,
		},
	};
};
