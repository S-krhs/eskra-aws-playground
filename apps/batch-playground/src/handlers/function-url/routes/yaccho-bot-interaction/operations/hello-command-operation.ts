// In scope: /hello コマンドから返す interaction callback payload の生成
// Out of scope: interaction 種別・コマンドのルーティング、payload の構造定義、HTTP response の形成
import {
	type DiscordChannelMessageResponsePayload,
	responseTypes,
} from "@/external-protocols/discord-message/interaction-response.js";
import type { OperationResult } from "@/handlers/function-url/routes/intermediate-models/operation-result.js";

/** /hello コマンドから返す interaction callback payload を生成する。 */
export const helloCommandOperation =
	(): OperationResult<DiscordChannelMessageResponsePayload> => {
		return {
			kind: "OK",
			data: {
				type: responseTypes.message,
				data: {
					content: "やおよろ～🌚",
					allowed_mentions: { parse: [] },
				},
			},
		};
	};
