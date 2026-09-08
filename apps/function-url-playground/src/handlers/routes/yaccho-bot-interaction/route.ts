// In scope: parsing the request, authentication and authorization, resolving a response per interaction type, shaping the response
// Out of scope: the signature-verification algorithm, building each feature's response content

import type { DiscordInteractionResponsePayload } from "@eskra-aws-playground/integration-discord/interaction-response.js";
import { verifyInteractionSignature } from "@eskra-aws-playground/integration-discord/verify-interaction-signature.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { parseCustomId } from "@eskra-aws-playground/shared-domains/discord/custom-id.js";
import { prefixes } from "@eskra-aws-playground/shared-domains/discord/custom-id-prefixes.js";
import { Resource } from "sst/resource";
import type { OperationResult } from "@/handlers/routes/intermediate-models/operation-result.js";
import type {
	FunctionUrlEvent,
	FunctionUrlResponse,
} from "@/handlers/schema.js";
import { commands } from "./contracts/commands.js";
import { autocompleteOperation } from "./operations/autocomplete-operation.js";
import { ephemeralOperation } from "./operations/ephemeral-operation.js";
import { gambleCheckDisableOperation } from "./operations/gamble-check-disable-operation.js";
import { gambleCheckEnableOperation } from "./operations/gamble-check-enable-operation.js";
import { helloCommandOperation } from "./operations/hello-command-operation.js";
import { pingOperation } from "./operations/ping-operation.js";
import { playCheckReminderOperation } from "./operations/play-check-reminder-operation.js";
import { discordInteractionRequestSchema } from "./schema.js";

const logger = createBatchLogger("yaccho-bot-interaction");

const unsupported = (): OperationResult<DiscordInteractionResponsePayload> => {
	return ephemeralOperation("自分で調べろｶｽ");
};

export const yacchoBotInteractionRoute = async (
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
	const publicKey = Resource.YacchoDiscordInteractionPublicKey.value;
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

	// 3. Resolve the response from the interaction type and the registered commands and prefixes.
	// ping and autocomplete answer finally inside the 3-second limit; everything else deferred-ACKs and
	// hands off to a follow-up job. An enqueue failure can't return a deferred response, so it falls
	// back to an ephemeral response settled on the spot.
	const { callback } = parsedRequest.data;
	let result: OperationResult<DiscordInteractionResponsePayload>;
	try {
		if (interaction.kind === "ping") {
			result = pingOperation();
		} else if (interaction.kind === "autocomplete") {
			result = autocompleteOperation();
		} else if (!callback) {
			logger.failure(
				new Error("interaction callback を取得できませんでした。"),
			);
			result = ephemeralOperation(
				"応答の準備に失敗しました。もう一度お試しください。",
			);
		} else if (
			interaction.kind === "application-command" &&
			interaction.command.name === commands.hello.name
		) {
			result = await helloCommandOperation(callback);
		} else if (
			interaction.kind === "application-command" &&
			interaction.command.name === commands.gambleCheckEnable.name
		) {
			result = await gambleCheckEnableOperation(interaction, callback);
		} else if (
			interaction.kind === "application-command" &&
			interaction.command.name === commands.gambleCheckDisable.name
		) {
			result = await gambleCheckDisableOperation(interaction, callback);
		} else if (
			interaction.kind === "message-component" &&
			parseCustomId(interaction.customId)?.prefix === prefixes.playCheckReminder
		) {
			result =
				(await playCheckReminderOperation(interaction, callback)) ??
				unsupported();
		} else {
			result = unsupported();
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
