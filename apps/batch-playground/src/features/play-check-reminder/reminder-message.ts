// In scope: 遊技チェックリマインダーとして Discord へ投稿するメッセージ payload の生成
// Out of scope: Discord API 通信、interaction response、押下結果の判定
import type { DiscordChannelMessagePayload } from "@eskra-aws-playground/integration-discord/discord-bot-client.js";
import { buttonStyles } from "@/external-protocols/discord-message/button.js";
import { buildCustomId } from "@/external-protocols/discord-message/custom-id.js";
import { prefixes } from "@/handlers/function-url/routes/yaccho-bot-interaction/contracts/prefixes.js";

import { REMINDER_CHOICES, REMINDER_QUESTION } from "./reminder-settings.js";

/** 対象ユーザーへ質問する遊技チェックリマインダーメッセージを生成する。 */
export const buildReminderQuestionMessage = (
	targetUserId: string,
): DiscordChannelMessagePayload => {
	return {
		content: `<@${targetUserId}> ${REMINDER_QUESTION}`,
		allowed_mentions: { parse: [], users: [targetUserId] },
	};
};

/** 遊技チェックリマインダーの選択肢ボタンメッセージを生成する。 */
export const buildReminderChoicesMessage = (
	targetUserId: string,
): DiscordChannelMessagePayload => {
	return {
		components: [
			{
				type: 1,
				components: REMINDER_CHOICES.map((choice) => {
					return {
						type: 2,
						style: buttonStyles[choice.tone],
						label: choice.label,
						custom_id: buildCustomId({
							prefix: prefixes.playCheckReminder,
							target: targetUserId,
							action: choice.id,
						}),
					};
				}),
			},
		],
		allowed_mentions: { parse: [] },
	};
};
