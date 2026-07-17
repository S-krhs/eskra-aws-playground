// In scope: request の parse、認証・認可、interaction 種別・コマンド名による operation へのルーティング、response の形成
// Out of scope: 署名検証アルゴリズム、機能ごとの応答内容の解決、選択メッセージの文面生成
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { Resource } from "sst/resource";
import {
	buildInteractionResponse,
	type DiscordInteractionResponsePayload,
} from "@/external-protocols/discord-message/build.js";
import {
	DISCORD_INTERACTION_TYPES,
	type DiscordInteraction,
} from "@/external-protocols/discord-message/parse.js";
import { verifyInteractionSignature } from "@/external-protocols/discord-signature/verify-interaction-signature.js";
import type {
	Forbidden,
	OperationResult,
	Unsupported,
} from "@/handlers/function-url/routes/intermediate-models/operation-result.js";
import type {
	FunctionUrlEvent,
	FunctionUrlResponse,
} from "@/handlers/function-url/schema.js";
import { COMMAND_DEFINITIONS } from "./command-definitions.js";
import { resolveHelloCommand } from "./operations/resolve-hello-command.js";
import { resolveReminderChoice } from "./operations/resolve-reminder-choice.js";
import { discordInteractionRequestSchema } from "./schema.js";

const logger = createBatchLogger("discord-interaction");

type DiscordInteractionResult = OperationResult<
	DiscordInteractionResponsePayload,
	| Unsupported<DiscordInteractionResponsePayload>
	| Forbidden<DiscordInteractionResponsePayload>
>;

const unsupported: Unsupported<DiscordInteractionResponsePayload> = {
	kind: "UNSUPPORTED",
	data: buildInteractionResponse({
		kind: "ephemeral",
		content: "この操作には対応していません。",
	}),
};

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

	// 3. interaction 種別・コマンド名から担当 operation へルーティングして解決する。
	const result = routeInteraction(interaction);
	logger.complete({ interactionType: interaction.type, outcome: result.kind });

	// 4. 解決済み payload から 200 response を形成する。
	return {
		statusCode: 200,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(result.data),
	};
};

/** interaction 種別・コマンド名から担当 operation を呼び分ける。コマンドを追加したらここへ登録する。 */
const routeInteraction = (
	interaction: DiscordInteraction,
): DiscordInteractionResult => {
	switch (interaction.type) {
		case DISCORD_INTERACTION_TYPES.PING:
			return { kind: "OK", data: buildInteractionResponse({ kind: "pong" }) };
		case DISCORD_INTERACTION_TYPES.APPLICATION_COMMAND_AUTOCOMPLETE:
			return {
				kind: "OK",
				data: buildInteractionResponse({ kind: "empty-autocomplete" }),
			};
		case DISCORD_INTERACTION_TYPES.APPLICATION_COMMAND:
			switch (interaction.commandName) {
				case COMMAND_DEFINITIONS.hello.commandName:
					return resolveHelloCommand();
				default:
					return unsupported;
			}
		case DISCORD_INTERACTION_TYPES.MESSAGE_COMPONENT:
			return resolveReminderChoice(interaction) ?? unsupported;
		default:
			return unsupported;
	}
};
