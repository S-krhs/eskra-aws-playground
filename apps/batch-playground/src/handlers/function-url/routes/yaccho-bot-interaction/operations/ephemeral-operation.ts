// In scope: Discord ephemeral interaction callback payload の生成
// Out of scope: interaction 種別のルーティング、メッセージ内容の決定、HTTP response の形成
import {
	type DiscordEphemeralResponsePayload,
	messageFlags,
	responseTypes,
} from "@/external-protocols/discord-message/interaction-response.js";
import type { OperationResult } from "@/handlers/function-url/routes/intermediate-models/operation-result.js";

/** 呼び出し元だけに表示する Discord interaction callback payload を生成する。 */
export const ephemeralOperation = (
	content: string,
): OperationResult<DiscordEphemeralResponsePayload> => {
	return {
		kind: "OK",
		data: {
			type: responseTypes.message,
			data: {
				content,
				flags: messageFlags.ephemeral,
				allowed_mentions: { parse: [] },
			},
		},
	};
};
