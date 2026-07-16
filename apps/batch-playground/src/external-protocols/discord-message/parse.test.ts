import { describe, expect, it } from "vitest";

import { parseInteraction, resolveChoice } from "./parse.js";

const choiceDefinition = {
	customIdPrefix: "test-choice",
	choices: [
		{ id: "yes", label: "はい", tone: "positive" },
		{ id: "no", label: "いいえ", tone: "negative" },
	],
} as const;

describe("parseInteraction / resolveChoice", () => {
	it("PING interaction を parse する", () => {
		expect(parseInteraction('{"type":1}')).toEqual({
			type: 1,
			customId: undefined,
			pressedUserId: undefined,
		});
	});

	it("送信時と同じ選択肢定義からボタン選択情報を解決する", () => {
		const interaction = parseInteraction(
			'{"type":3,"data":{"custom_id":"test-choice:123:yes"},"member":{"user":{"id":"456"}}}',
		);
		if (!interaction) {
			throw new Error("test interaction の parse に失敗しました");
		}

		expect(resolveChoice(interaction, choiceDefinition)).toEqual({
			choiceId: "yes",
			choiceLabel: "はい",
			pressedUserId: "456",
			targetUserId: "123",
		});
	});

	it("DM interaction の user ID からボタン選択情報を解決する", () => {
		const interaction = parseInteraction(
			'{"type":3,"data":{"custom_id":"test-choice:123:no"},"user":{"id":"123"}}',
		);
		if (!interaction) {
			throw new Error("test interaction の parse に失敗しました");
		}

		expect(resolveChoice(interaction, choiceDefinition)).toEqual({
			choiceId: "no",
			choiceLabel: "いいえ",
			pressedUserId: "123",
			targetUserId: "123",
		});
	});

	it("定義にない prefix・choice ID は解決しない", () => {
		const unknownPrefix = parseInteraction(
			'{"type":3,"data":{"custom_id":"unknown:123:yes"},"user":{"id":"123"}}',
		);
		const unknownChoice = parseInteraction(
			'{"type":3,"data":{"custom_id":"test-choice:123:unknown"},"user":{"id":"123"}}',
		);
		if (!unknownPrefix || !unknownChoice) {
			throw new Error("test interaction の parse に失敗しました");
		}

		expect(resolveChoice(unknownPrefix, choiceDefinition)).toBeUndefined();
		expect(resolveChoice(unknownChoice, choiceDefinition)).toBeUndefined();
	});

	it("不正な JSON・interaction 構造は parse しない", () => {
		expect(parseInteraction("not-a-json")).toBeUndefined();
		expect(parseInteraction('{"type":"1"}')).toBeUndefined();
	});
});
