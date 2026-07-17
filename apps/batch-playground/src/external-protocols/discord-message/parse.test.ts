import { describe, expect, it } from "vitest";

import { parseInteraction } from "./parse.js";

describe("parseInteraction", () => {
	it("PING interaction を parse する", () => {
		expect(parseInteraction('{"type":1}')).toEqual({
			type: 1,
			customId: undefined,
			pressedUserId: undefined,
		});
	});

	it("application command interaction からコマンド名を parse する", () => {
		expect(parseInteraction('{"type":2,"data":{"name":"hello"}}')).toEqual({
			type: 2,
			commandName: "hello",
			customId: undefined,
			pressedUserId: undefined,
		});
	});

	it("message component から custom_id と member の user ID を取り出す", () => {
		expect(
			parseInteraction(
				'{"type":3,"data":{"custom_id":"test-choice:123:yes"},"member":{"user":{"id":"456"}}}',
			),
		).toEqual({
			type: 3,
			commandName: undefined,
			customId: {
				prefix: "test-choice",
				target: "123",
				action: "yes",
			},
			pressedUserId: "456",
		});
	});

	it("DM interaction ではトップレベルの user ID を取り出す", () => {
		expect(
			parseInteraction(
				'{"type":3,"data":{"custom_id":"test-choice:123:no"},"user":{"id":"123"}}',
			),
		).toEqual({
			type: 3,
			commandName: undefined,
			customId: {
				prefix: "test-choice",
				target: "123",
				action: "no",
			},
			pressedUserId: "123",
		});
	});

	it("target のない custom_id も共通規約で parse する", () => {
		expect(
			parseInteraction(
				'{"type":3,"data":{"custom_id":"refresh-panel::refresh"}}',
			),
		).toEqual({
			type: 3,
			commandName: undefined,
			customId: { prefix: "refresh-panel", action: "refresh" },
			pressedUserId: undefined,
		});
	});

	it("共通規約に合わない custom_id は未解釈として扱う", () => {
		expect(
			parseInteraction('{"type":3,"data":{"custom_id":"invalid-custom-id"}}'),
		).toEqual({
			type: 3,
			commandName: undefined,
			customId: undefined,
			pressedUserId: undefined,
		});
	});

	it("不正な JSON・interaction 構造は parse しない", () => {
		expect(parseInteraction("not-a-json")).toBeUndefined();
		expect(parseInteraction('{"type":"1"}')).toBeUndefined();
	});
});
