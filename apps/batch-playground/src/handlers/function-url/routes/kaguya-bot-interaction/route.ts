// In scope: request の parse、認証・認可、interaction 種別ごとの応答解決、response の形成
// Out of scope: 署名検証アルゴリズム、機能ごとの応答内容の生成
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { Resource } from "sst/resource";
import type { DiscordInteractionResponsePayload } from "@/external-protocols/discord-message/interaction-response.js";
import { verifyInteractionSignature } from "@/external-protocols/discord-signature/verify-interaction-signature.js";
import type { OperationResult } from "@/handlers/function-url/routes/intermediate-models/operation-result.js";
import type {
	FunctionUrlEvent,
	FunctionUrlResponse,
} from "@/handlers/function-url/schema.js";
import { commands } from "./contracts/commands.js";
import { ephemeralOperation } from "./operations/ephemeral-operation.js";
import { inuihiroshiCommandOperation } from "./operations/inuihiroshi-command-operation.js";
import { pingOperation } from "./operations/ping-operation.js";
import { discordInteractionRequestSchema } from "./schema.js";

const logger = createBatchLogger("kaguya-bot-interaction");

/** Kaguya Bot の Discord interactions endpoint route。 */
export const kaguyaBotInteractionRoute = async (
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
	const publicKey = Resource.KaguyaDiscordInteractionPublicKey.value;
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

	// 3. interaction の種類と登録済み command から応答を解決する。
	let result: OperationResult<DiscordInteractionResponsePayload>;
	if (interaction.kind === "ping") {
		result = pingOperation();
	} else if (
		interaction.kind === "application-command" &&
		interaction.command.name === commands.inuihiroshi.name
	) {
		result = inuihiroshiCommandOperation();
	} else {
		result = ephemeralOperation("この操作には対応していません。");
	}
	logger.complete({ interactionKind: interaction.kind, outcome: result.kind });

	// 4. 解決済み payload から 200 response を形成する。
	return {
		statusCode: 200,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(result.data),
	};
};
