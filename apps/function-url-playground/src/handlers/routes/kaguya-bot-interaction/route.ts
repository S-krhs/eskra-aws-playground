// In scope: parsing the request, authentication and authorization, resolving a response per interaction type, shaping the response
// Out of scope: the signature-verification algorithm, building each feature's response content

import type { DiscordInteractionResponsePayload } from "@eskra-aws-playground/integration-discord/interaction-response.js";
import { verifyInteractionSignature } from "@eskra-aws-playground/integration-discord/verify-interaction-signature.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { Resource } from "sst/resource";
import type { OperationResult } from "@/handlers/routes/_shared/intermediate-models/operation-result.js";
import type {
	FunctionUrlEvent,
	FunctionUrlResponse,
} from "@/handlers/schema.js";
import { commands } from "./contracts/commands.js";
import { ephemeralOperation } from "./operations/ephemeral-operation.js";
import { inuihiroshiCommandOperation } from "./operations/inuihiroshi-command-operation.js";
import { pingOperation } from "./operations/ping-operation.js";
import { discordInteractionRequestSchema } from "./schema.js";

const logger = createBatchLogger("kaguya-bot-interaction");

export const kaguyaBotInteractionRoute = async (
	event: FunctionUrlEvent,
): Promise<FunctionUrlResponse> => {
	// 1. Parse the request into this route's own input.
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

	// 2. Authenticate and authorize the parsed request.
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

	// 3. Resolve the response from the interaction type and the registered commands.
	// ping answers finally inside the 3-second limit; a command deferred-ACKs and hands off to a
	// follow-up job. An enqueue failure can't return a deferred response, so it falls back to an
	// ephemeral response settled on the spot.
	const { callback } = parsedRequest.data;
	let result: OperationResult<DiscordInteractionResponsePayload>;
	try {
		if (interaction.kind === "ping") {
			result = pingOperation();
		} else if (!callback) {
			logger.failure(
				new Error("interaction callback を取得できませんでした。"),
			);
			result = ephemeralOperation(
				"応答の準備に失敗しました。もう一度お試しください。",
			);
		} else if (
			interaction.kind === "application-command" &&
			interaction.command.name === commands.inuihiroshi.name
		) {
			result = await inuihiroshiCommandOperation(callback);
		} else {
			result = ephemeralOperation("この操作には対応していません。");
		}
	} catch (error) {
		logger.failure(error);
		result = ephemeralOperation(
			"処理の受け付けに失敗しました。もう一度お試しください。",
		);
	}
	logger.complete({ interactionKind: interaction.kind, outcome: result.kind });

	// 4. Shape a 200 response out of the resolved payload.
	return {
		statusCode: 200,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(result.data),
	};
};
