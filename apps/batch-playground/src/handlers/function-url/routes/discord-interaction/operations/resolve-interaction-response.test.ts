import { describe, expect, it } from "vitest";

import { parseInteraction } from "../../../../../external-protocols/discord-message/parse.js";
import { resolveInteractionResponse } from "./resolve-interaction-response.js";

const resolve = (body: object) => {
	const interaction = parseInteraction(JSON.stringify(body));
	if (!interaction) {
		throw new Error("test interaction の parse に失敗しました");
	}

	return resolveInteractionResponse(interaction);
};

const componentBody = (customId: string, pressedUserId: string) => {
	return {
		type: 3,
		data: { custom_id: customId },
		user: { id: pressedUserId },
	};
};

const ephemeral = (content: string) => {
	return {
		type: 4,
		data: { content, flags: 64, allowed_mentions: { parse: [] } },
	};
};

describe("resolveInteractionResponse", () => {
	it("PING には OK と PONG payload を返す", () => {
		expect(resolve({ type: 1 })).toEqual({ kind: "OK", data: { type: 1 } });
	});

	it("autocomplete には OK と空の候補一覧 payload を返す", () => {
		expect(resolve({ type: 4 })).toEqual({
			kind: "OK",
			data: { type: 8, data: { choices: [] } },
		});
	});

	it("対象ユーザーの選択には OK と元メッセージを更新する payload を返す", () => {
		expect(
			resolve(componentBody("play-check-reminder:123:won", "123")),
		).toEqual({
			kind: "OK",
			data: {
				type: 7,
				data: {
					content: "でれれれれれ～、**はい（勝った）**！",
					components: [],
					allowed_mentions: { parse: [] },
				},
			},
		});
	});

	it("対象外ユーザーには FORBIDDEN と専用メッセージ payload を返す", () => {
		expect(
			resolve(componentBody("play-check-reminder:123:won", "999")),
		).toEqual({
			kind: "FORBIDDEN",
			data: ephemeral(
				"このリマインダーは <@123> さんしか使えないのです～、よよよ……",
			),
		});
	});

	it("解釈できない component には UNSUPPORTED と未対応メッセージ payload を返す", () => {
		expect(resolve(componentBody("unknown:payload", "123"))).toEqual({
			kind: "UNSUPPORTED",
			data: ephemeral("この操作には対応していません。"),
		});
	});

	it("未対応の interaction type には UNSUPPORTED と未対応メッセージ payload を返す", () => {
		expect(resolve({ type: 2 })).toEqual({
			kind: "UNSUPPORTED",
			data: ephemeral("この操作には対応していません。"),
		});
	});
});
