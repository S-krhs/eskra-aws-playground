// In scope: request の parse、認証・認可、operation の実行、response の形成
// Out of scope: 署名検証アルゴリズム、interaction type ごとの応答決定、選択メッセージの文面生成
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { Resource } from "sst/resource";

import { verifyInteractionSignature } from "@/external-protocols/discord-signature/verify-interaction-signature.js";
import type {
	FunctionUrlEvent,
	FunctionUrlResponse,
} from "@/handlers/function-url/schema.js";
import { resolveInteractionResponse } from "./operations/resolve-interaction-response.js";
import { discordInteractionRequestSchema } from "./schema.js";

const logger = createBatchLogger("discord-interaction");

/** Discord interactions endpoint の route。 */
export const discordInteractionRoute = async (
	event: FunctionUrlEvent,
): Promise<FunctionUrlResponse> => {
	// 1. request を route 固有の入力へ parse する。
	logger.start();
	const parsedRequest = discordInteractionRequestSchema.safeParse(event);
	if (!parsedRequest.success) {
		logger.failure(new Error("Function URL request の形式が不正です。"));
		return {
			statusCode: 400,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ error: "リクエストが不正です。" }),
		};
	}

	const { signature, timestamp, rawBody, interaction } = parsedRequest.data;

	// 2. parse 済み request を認証・認可する。
	const publicKey = Resource.DiscordInteractionPublicKey.value;
	if (
		!verifyInteractionSignature({ publicKey, signature, timestamp, rawBody })
	) {
		logger.failure(new Error("interaction の署名検証に失敗しました。"));
		return {
			statusCode: 401,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ error: "署名が不正です。" }),
		};
	}

	// 3. interaction を operation で解決する。
	const result = resolveInteractionResponse(interaction);
	logger.complete({ interactionType: interaction.type, outcome: result.kind });

	// 4. 解決済み payload から 200 response を形成する。
	return {
		statusCode: 200,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(result.data),
	};
};
