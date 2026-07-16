import { describe, expect, it } from "vitest";

import { buildChoiceMessage, buildInteractionResponse } from "./build.js";

describe("buildChoiceMessage", () => {
	it("選択肢定義を Discord channel message payload へ変換する", () => {
		expect(
			buildChoiceMessage("987654321098765432", {
				prompt: "選択してください",
				customIdPrefix: "test-choice",
				choices: [
					{ id: "primary", label: "主要", tone: "primary" },
					{ id: "neutral", label: "中立", tone: "neutral" },
					{ id: "positive", label: "肯定", tone: "positive" },
					{ id: "negative", label: "否定", tone: "negative" },
				],
			}),
		).toEqual({
			content: "<@987654321098765432> 選択してください",
			components: [
				{
					type: 1,
					components: [
						{
							type: 2,
							style: 1,
							label: "主要",
							custom_id: "test-choice:987654321098765432:primary",
						},
						{
							type: 2,
							style: 2,
							label: "中立",
							custom_id: "test-choice:987654321098765432:neutral",
						},
						{
							type: 2,
							style: 3,
							label: "肯定",
							custom_id: "test-choice:987654321098765432:positive",
						},
						{
							type: 2,
							style: 4,
							label: "否定",
							custom_id: "test-choice:987654321098765432:negative",
						},
					],
				},
			],
			allowed_mentions: {
				parse: [],
				users: ["987654321098765432"],
			},
		});
	});
});

describe("buildInteractionResponse", () => {
	it("PONG response を構築する", () => {
		expect(buildInteractionResponse({ kind: "pong" })).toEqual({ type: 1 });
	});

	it("元メッセージ更新 response を構築する", () => {
		expect(
			buildInteractionResponse({
				kind: "update-message",
				content: "更新しました",
			}),
		).toEqual({
			type: 7,
			data: {
				content: "更新しました",
				components: [],
				allowed_mentions: { parse: [] },
			},
		});
	});

	it("ephemeral response を構築する", () => {
		expect(
			buildInteractionResponse({
				kind: "ephemeral",
				content: "対象外です",
			}),
		).toEqual({
			type: 4,
			data: {
				content: "対象外です",
				flags: 64,
				allowed_mentions: { parse: [] },
			},
		});
	});

	it("空の autocomplete response を構築する", () => {
		expect(buildInteractionResponse({ kind: "empty-autocomplete" })).toEqual({
			type: 8,
			data: { choices: [] },
		});
	});
});
