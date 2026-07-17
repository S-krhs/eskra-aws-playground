// In scope: Discord PING interaction へ返す callback payload の生成
// Out of scope: interaction 種別のルーティング、HTTP response の形成
import {
	type DiscordPongResponsePayload,
	responseTypes,
} from "@/external-protocols/discord-message/interaction-response.js";
import type { OperationResult } from "@/handlers/function-url/routes/intermediate-models/operation-result.js";

/** Discord PING interaction へ返す PONG callback payload を生成する。 */
export const pingOperation =
	(): OperationResult<DiscordPongResponsePayload> => {
		return {
			kind: "OK",
			data: { type: responseTypes.pong },
		};
	};
