// In scope: Discord interaction を解釈し、返す interaction callback payload を解決する
// Out of scope: request の parse、署名検証、payload の構造定義、HTTP response の形成
import {
	buildInteractionResponse,
	type DiscordInteractionResponsePayload,
} from "../../../../../external-protocols/discord-message/build.js";
import {
	DISCORD_INTERACTION_TYPES,
	type DiscordInteraction,
	resolveChoice,
} from "../../../../../external-protocols/discord-message/parse.js";
import {
	REMINDER_CHOICES,
	REMINDER_CUSTOM_ID_PREFIX,
	REMINDER_QUESTION,
} from "../../../../../features/play-check-reminder/reminder-settings.js";
import type {
	Forbidden,
	OperationResult,
	Unsupported,
} from "../../intermediate-models/operation-result.js";

const unsupported: Unsupported<DiscordInteractionResponsePayload> = {
	kind: "UNSUPPORTED",
	data: buildInteractionResponse({
		kind: "ephemeral",
		content: "この操作には対応していません。",
	}),
};

/** Discord interaction から返す interaction callback payload を解決する。 */
export const resolveInteractionResponse = (
	interaction: DiscordInteraction,
): OperationResult<
	DiscordInteractionResponsePayload,
	| Unsupported<DiscordInteractionResponsePayload>
	| Forbidden<DiscordInteractionResponsePayload>
> => {
	switch (interaction.type) {
		case DISCORD_INTERACTION_TYPES.PING:
			return { kind: "OK", data: buildInteractionResponse({ kind: "pong" }) };
		case DISCORD_INTERACTION_TYPES.APPLICATION_COMMAND_AUTOCOMPLETE:
			return {
				kind: "OK",
				data: buildInteractionResponse({ kind: "empty-autocomplete" }),
			};
		case DISCORD_INTERACTION_TYPES.MESSAGE_COMPONENT: {
			const selection = resolveChoice(interaction, {
				customIdPrefix: REMINDER_CUSTOM_ID_PREFIX,
				choices: REMINDER_CHOICES,
			});
			if (!selection) {
				return unsupported;
			}
			if (selection.pressedUserId !== selection.targetUserId) {
				return {
					kind: "FORBIDDEN",
					data: buildInteractionResponse({
						kind: "ephemeral",
						content: `このリマインダーは <@${selection.targetUserId}> さんしか使えないのです～、よよよ……`,
					}),
				};
			}
			return {
				kind: "OK",
				data: buildInteractionResponse({
					kind: "update-message",
					content: `でれれれれれ～、**${selection.choiceLabel}！**`,
				}),
			};
		}
		default:
			return unsupported;
	}
};
