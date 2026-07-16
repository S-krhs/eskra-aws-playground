// In scope: 選択肢メッセージと interaction callback の Discord payload を build する
// Out of scope: interaction body の parse、custom_id の解釈、署名検証、HTTP 通信
import {
	CUSTOM_ID_SEPARATOR,
	DISCORD_BUTTON_STYLES,
	type DiscordChoiceDefinition,
} from "./choice.js";

const RESPONSE_TYPE_PONG = 1;
const RESPONSE_TYPE_CHANNEL_MESSAGE = 4;
const RESPONSE_TYPE_UPDATE_MESSAGE = 7;
const RESPONSE_TYPE_AUTOCOMPLETE_RESULT = 8;
const MESSAGE_FLAG_EPHEMERAL = 64;

/** Discord へ投稿する選択肢メッセージ。 */
export interface DiscordChoiceMessage extends DiscordChoiceDefinition {
	prompt: string;
}

/** Discord interaction callback の生成指示。 */
export type DiscordInteractionResponse =
	| { kind: "pong" }
	| { kind: "update-message"; content: string }
	| { kind: "ephemeral"; content: string }
	| { kind: "empty-autocomplete" };

/** Discord interaction callback の payload。 */
export type DiscordInteractionResponsePayload =
	| { type: 1 }
	| {
			type: 4;
			data: {
				content: string;
				flags: 64;
				allowed_mentions: { parse: readonly string[] };
			};
	  }
	| {
			type: 7;
			data: {
				content: string;
				components: readonly [];
				allowed_mentions: { parse: readonly string[] };
			};
	  }
	| { type: 8; data: { choices: readonly [] } };

/** 選択肢定義から Discord channel message payload を構築する。 */
export const buildChoiceMessage = (
	targetUserId: string,
	message: DiscordChoiceMessage,
) => {
	return {
		content: `<@${targetUserId}> ${message.prompt}`,
		components: [
			{
				type: 1 as const,
				components: message.choices.map((choice) => {
					return {
						type: 2 as const,
						style: DISCORD_BUTTON_STYLES[choice.tone],
						label: choice.label,
						custom_id: [message.customIdPrefix, targetUserId, choice.id].join(
							CUSTOM_ID_SEPARATOR,
						),
					};
				}),
			},
		],
		allowed_mentions: { parse: [] as readonly string[], users: [targetUserId] },
	};
};

/** Discord interaction callback の生成指示から payload を構築する。 */
export const buildInteractionResponse = (
	response: DiscordInteractionResponse,
): DiscordInteractionResponsePayload => {
	switch (response.kind) {
		case "pong":
			return { type: RESPONSE_TYPE_PONG };
		case "update-message":
			return {
				type: RESPONSE_TYPE_UPDATE_MESSAGE,
				data: {
					content: response.content,
					components: [],
					allowed_mentions: { parse: [] },
				},
			};
		case "ephemeral":
			return {
				type: RESPONSE_TYPE_CHANNEL_MESSAGE,
				data: {
					content: response.content,
					flags: MESSAGE_FLAG_EPHEMERAL,
					allowed_mentions: { parse: [] },
				},
			};
		case "empty-autocomplete":
			return {
				type: RESPONSE_TYPE_AUTOCOMPLETE_RESULT,
				data: { choices: [] },
			};
	}
};
