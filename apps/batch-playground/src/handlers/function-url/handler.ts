// In scope: Lambda Function URL の公開エンドポイントとして、署名検証・イベント解釈・応答 payload 作成をオーケストレーションする
// Out of scope: 署名検証アルゴリズムや選択結果の判定ロジックの詳細を持つ
import { verifyInteractionSignature } from "@eskra-aws-playground/integration-discord/interaction-signature-verifier.js";
import { createBatchLogger } from "@eskra-aws-playground/libs/logger/batch-logger.js";
import { Resource } from "sst/resource";

import { resolveComponentInteraction } from "./routes.js";
import {
	type DiscordInteractionResponse,
	discordInteractionFunctionUrlEventSchema,
	discordInteractionSchema,
} from "./schema.js";

const logger = createBatchLogger("function-url");

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

/** Lambda Function URL のエントリポイント。署名検証と interaction 種別に応じた応答を返す。 */
export const handler = async (
	event: unknown = {},
): Promise<DiscordInteractionResponse> => {
	// 1. SST link から Discord application の public key を解決する。
	const discordInteractionPublicKey =
		Resource.DiscordInteractionPublicKey.value;

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

	// 6. ボタン押下は custom_id の prefix から担当 feature を解決し、応答内容を Discord 応答へ変換する。
	if (interaction.type === INTERACTION_TYPE_MESSAGE_COMPONENT) {
		const customId = interaction.data?.custom_id;
		const pressedUserId = interaction.member?.user?.id ?? interaction.user?.id;

		let response: DiscordInteractionResponse;
		const reply =
			customId && pressedUserId
				? resolveComponentInteraction(customId, pressedUserId)
				: { kind: "unsupported" as const };

		switch (reply.kind) {
			case "update-message":
				// 元メッセージを選択結果の表示へ更新し、ボタンを取り除く。
				response = jsonResponse(200, {
					type: RESPONSE_TYPE_UPDATE_MESSAGE,
					data: {
						content: reply.content,
						components: [],
						allowed_mentions: { parse: [] },
					},
				});
				break;
			case "ephemeral":
				response = ephemeralResponse(reply.content);
				break;
			case "unsupported":
				response = ephemeralResponse(UNSUPPORTED_INTERACTION_CONTENT);
				break;
		}

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
