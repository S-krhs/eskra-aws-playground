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
import { prefixes } from "./contracts/prefixes.js";
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

	// 3. interaction の種類と登録済み command・prefix から応答を解決する。
	// ping・autocomplete は 3 秒制限内に確定応答を返し、その他は deferred 応答で ACK して後追いジョブへ委譲する。
	// enqueue の失敗は deferred 応答を返せないため、その場で確定する ephemeral 応答へ落とす。
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
			interaction.customId?.prefix === prefixes.playCheckReminder
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

	// 4. 解決済み payload から 200 response を形成する。
	return {
		statusCode: 200,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(result.data),
	};
};
