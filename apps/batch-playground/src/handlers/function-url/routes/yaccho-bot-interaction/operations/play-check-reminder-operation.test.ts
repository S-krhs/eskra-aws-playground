import { describe, expect, it } from "vitest";

import { parseInteraction } from "@/external-protocols/discord-message/parse.js";
import { playCheckReminderOperation } from "./play-check-reminder-operation.js";

const execute = (customId: string, pressedUserId: string) => {
	const interaction = parseInteraction(
		JSON.stringify({
			type: 3,
			data: { custom_id: customId },
			user: { id: pressedUserId },
		}),
	);
	if (!interaction) {
		throw new Error("test interaction の parse に失敗しました");
	}

	return playCheckReminderOperation(interaction);
};

describe("playCheckReminderOperation", () => {
	it("対象ユーザーの選択には OK と元メッセージを更新する payload を返す", () => {
		expect(execute("play-check-reminder:123:won", "123")).toEqual({
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

	it("対象外ユーザーには OK と専用メッセージ payload を返す", () => {
		expect(execute("play-check-reminder:123:won", "999")).toEqual({
			kind: "OK",
			data: {
				type: 4,
				data: {
					content:
						"このリマインダーは <@123> さんしか使えないのです～、よよよ……",
					flags: 64,
					allowed_mentions: { parse: [] },
				},
			},
		});
	});

	it("リマインダーの選択と解釈できない interaction には undefined を返す", () => {
		expect(execute("unknown:payload", "123")).toBeUndefined();
		expect(execute("play-check-reminder::won", "123")).toBeUndefined();
		expect(execute("play-check-reminder:123:unknown", "123")).toBeUndefined();
	});
});
