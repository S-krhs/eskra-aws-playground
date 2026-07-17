// In scope: request の parse、認証・認可、routing 層への委譲、response の形成
// Out of scope: operation の routing 定義、署名検証アルゴリズム、機能ごとの応答内容の解決
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { Resource } from "sst/resource";
import { verifyInteractionSignature } from "@/external-protocols/discord-signature/verify-interaction-signature.js";
import type {
	FunctionUrlEvent,
	FunctionUrlResponse,
} from "@/handlers/function-url/schema.js";
import { findInteractionOperation } from "./operation-routing.js";
import { ephemeralOperation } from "./operations/ephemeral-operation.js";
import { discordInteractionRequestSchema } from "./schema.js";

const logger = createBatchLogger("yaccho-bot-interaction");

/** Yaccho Bot の Discord interactions endpoint route。 */
export const yacchoBotInteractionRoute = async (
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

	// 3. フラットな route 定義から担当 operation を選択して解決する。
	const operation = findInteractionOperation(interaction);
	const result =
		operation?.(interaction) ??
		ephemeralOperation("この操作には対応していません。");
	logger.complete({ interactionType: interaction.type, outcome: result.kind });

	// 4. 解決済み payload から 200 response を形成する。
	return {
		statusCode: 200,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(result.data),
	};
};
