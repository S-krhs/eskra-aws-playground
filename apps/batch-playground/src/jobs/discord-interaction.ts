// In scope: Discord interaction の署名検証・イベント解釈・応答 payload 作成をオーケストレーションする
// Out of scope: 署名検証アルゴリズムや選択結果の判定ロジックの詳細を持つ
import { verifyInteractionSignature } from "@eskra-aws-playground/integration-discord/interaction-signature-verifier.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";

import { resolveComponentInteraction } from "../routing/interaction-router.js";
import {
	type DiscordInteraction,
	discordInteractionFunctionUrlEventSchema,
	discordInteractionSchema,
} from "../shared/schemas/lambda/discord-interaction/event.js";
import type { DiscordInteractionResponse } from "../shared/schemas/lambda/discord-interaction/response.js";
import { getDiscordInteractionSettings } from "./runtime-settings/discord-interaction-setting-resolver.js";

const logger = createBatchLogger("discord-interaction");

const INTERACTION_TYPE_PING = 1;
const INTERACTION_TYPE_MESSAGE_COMPONENT = 3;
const INTERACTION_TYPE_AUTOCOMPLETE = 4;
const RESPONSE_TYPE_PONG = 1;
const RESPONSE_TYPE_CHANNEL_MESSAGE = 4;
const RESPONSE_TYPE_UPDATE_MESSAGE = 7;
const RESPONSE_TYPE_AUTOCOMPLETE_RESULT = 8;
const MESSAGE_FLAG_EPHEMERAL = 64;

const UNSUPPORTED_INTERACTION_CONTENT = "この操作には対応していません。";

const jsonResponse = (
	statusCode: number,
	body: unknown,
): DiscordInteractionResponse => {
	return {
		statusCode,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	};
};

/** 本人にだけ見える ephemeral メッセージ応答を作る。 */
const ephemeralResponse = (content: string): DiscordInteractionResponse => {
	return jsonResponse(200, {
		type: RESPONSE_TYPE_CHANNEL_MESSAGE,
		data: {
			content,
			flags: MESSAGE_FLAG_EPHEMERAL,
			allowed_mentions: { parse: [] },
		},
	});
};

/** ボタン押下 interaction を router へ委譲し、応答内容を Discord 応答へ変換する。 */
const handleMessageComponent = (
	interaction: DiscordInteraction,
): DiscordInteractionResponse => {
	const customId = interaction.data?.custom_id;
	const pressedUserId = interaction.member?.user?.id ?? interaction.user?.id;

	if (!customId || !pressedUserId) {
		return ephemeralResponse(UNSUPPORTED_INTERACTION_CONTENT);
	}

	const reply = resolveComponentInteraction(customId, pressedUserId);

	switch (reply.kind) {
		case "update-message":
			// 元メッセージを選択結果の表示へ更新し、ボタンを取り除く。
			return jsonResponse(200, {
				type: RESPONSE_TYPE_UPDATE_MESSAGE,
				data: {
					content: reply.content,
					components: [],
					allowed_mentions: { parse: [] },
				},
			});
		case "ephemeral":
			return ephemeralResponse(reply.content);
		case "unsupported":
			return ephemeralResponse(UNSUPPORTED_INTERACTION_CONTENT);
	}
};

/** Discord interaction を受け取り、署名検証と interaction 種別に応じた応答を返すジョブ。 */
export const discordInteractionJob = async (
	event: unknown,
): Promise<DiscordInteractionResponse> => {
	// 1. 実行時設定から Discord application の public key を解決する。
	const { discordInteractionPublicKey } = getDiscordInteractionSettings();

	logger.start();

	// 2. Lambda Function URL イベントから署名ヘッダーと raw body を取り出す。
	const parsedEvent = discordInteractionFunctionUrlEventSchema.safeParse(event);

	if (!parsedEvent.success) {
		logger.failure(new Error("Lambda Function URL イベントの形式が不正です。"));
		return jsonResponse(400, { error: "リクエストの形式が不正です。" });
	}

	const { headers, body, isBase64Encoded } = parsedEvent.data;
	const signature = headers["x-signature-ed25519"] ?? "";
	const timestamp = headers["x-signature-timestamp"] ?? "";
	const rawBody = isBase64Encoded
		? Buffer.from(body ?? "", "base64").toString("utf8")
		: (body ?? "");

	// 3. Ed25519 署名を検証する。失敗した interaction は処理しない。
	const signatureValid = verifyInteractionSignature({
		publicKey: discordInteractionPublicKey,
		signature,
		timestamp,
		rawBody,
	});

	if (!signatureValid) {
		logger.failure(new Error("interaction の署名検証に失敗しました。"));
		return jsonResponse(401, { error: "署名が不正です。" });
	}

	// 4. raw body を JSON パースし、interaction schema で検証する。
	let parsedBody: unknown;
	try {
		parsedBody = JSON.parse(rawBody);
	} catch {
		logger.failure(
			new Error("interaction body の JSON パースに失敗しました。"),
		);
		return jsonResponse(400, { error: "interaction body が不正です。" });
	}

	const parsedInteraction = discordInteractionSchema.safeParse(parsedBody);

	if (!parsedInteraction.success) {
		logger.failure(new Error("interaction body の形式が不正です。"));
		return jsonResponse(400, { error: "interaction body が不正です。" });
	}

	const interaction = parsedInteraction.data;

	// 5. PING には PONG を返す(Discord の Interactions Endpoint URL 検証で使われる)。
	if (interaction.type === INTERACTION_TYPE_PING) {
		logger.complete({ interactionType: interaction.type });
		return jsonResponse(200, { type: RESPONSE_TYPE_PONG });
	}

	// 6. ボタン押下は feature の選択結果判定へ委譲する。
	if (interaction.type === INTERACTION_TYPE_MESSAGE_COMPONENT) {
		const response = handleMessageComponent(interaction);
		logger.complete({
			interactionType: interaction.type,
			statusCode: response.statusCode,
		});
		return response;
	}

	// 7. autocomplete にはメッセージ応答が許されないため、空の候補一覧を返す。
	if (interaction.type === INTERACTION_TYPE_AUTOCOMPLETE) {
		logger.complete({ interactionType: interaction.type });
		return jsonResponse(200, {
			type: RESPONSE_TYPE_AUTOCOMPLETE_RESULT,
			data: { choices: [] },
		});
	}

	// 8. 対応していない interaction 種別は ephemeral で対応外を返す。
	logger.complete({ interactionType: interaction.type });
	return ephemeralResponse(UNSUPPORTED_INTERACTION_CONTENT);
};
