// In scope: 遊技リマインダーのボタン押下から返す interaction callback payload の生成
// Out of scope: interaction 種別・コマンドのルーティング、payload の構造定義、HTTP response の形成

import {
	type DiscordEphemeralResponsePayload,
	type DiscordUpdateMessageResponsePayload,
	messageFlags,
	responseTypes,
} from "@/external-protocols/discord-message/interaction-response.js";
import type { DiscordInteraction } from "@/external-protocols/discord-message/parse.js";
import { REMINDER_CHOICES } from "@/features/play-check-reminder/reminder-settings.js";
import type { OperationResult } from "@/handlers/function-url/routes/intermediate-models/operation-result.js";
import { prefixes } from "../shared/prefixes.js";

/**
 * 遊技リマインダーのボタン押下から返す interaction callback payload を生成する。
 * リマインダーの選択と解釈できない interaction には undefined を返す。
 */
export const playCheckReminderOperation = (
	interaction: DiscordInteraction,
):
	| OperationResult<
			DiscordUpdateMessageResponsePayload | DiscordEphemeralResponsePayload
	  >
	| undefined => {
	if (!interaction.customId || !interaction.pressedUserId) {
		return undefined;
	}

	if (
		interaction.customId.prefix !== prefixes.playCheckReminder ||
		!interaction.customId.target
	) {
		return undefined;
	}
	const { target: targetUserId, action } = interaction.customId;

	const choice = REMINDER_CHOICES.find((candidate) => {
		return candidate.id === action;
	});
	if (!choice) {
		return undefined;
	}

	if (interaction.pressedUserId !== targetUserId) {
		return {
			kind: "OK",
			data: {
				type: responseTypes.message,
				data: {
					content: `このリマインダーは <@${targetUserId}> さんしか使えないのです～、よよよ……`,
					flags: messageFlags.ephemeral,
					allowed_mentions: { parse: [] },
				},
			},
		};
	}

	return {
		kind: "OK",
		data: {
			type: responseTypes.update,
			data: {
				content: `でれれれれれ～、**${choice.label}**！`,
				components: [],
				allowed_mentions: { parse: [] },
			},
		},
	};
};
