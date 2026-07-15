import { describe, expect, it } from "vitest";

import {
	discordInteractionFunctionUrlEventSchema,
	discordInteractionSchema,
} from "./schema.js";

describe("discordInteractionFunctionUrlEventSchema", () => {
	it("headers と body と isBase64Encoded を受け付ける", () => {
		expect(
			discordInteractionFunctionUrlEventSchema.parse({
				headers: { "x-signature-ed25519": "abc" },
				body: '{"type":1}',
				isBase64Encoded: false,
			}),
		).toEqual({
			headers: { "x-signature-ed25519": "abc" },
			body: '{"type":1}',
			isBase64Encoded: false,
		});
	});

	it("body と isBase64Encoded は省略できる", () => {
		expect(
			discordInteractionFunctionUrlEventSchema.parse({ headers: {} }),
		).toEqual({ headers: {} });
	});

	it("headers が欠けたイベントはエラーにする", () => {
		expect(() => {
			return discordInteractionFunctionUrlEventSchema.parse({});
		}).toThrow();
	});

	it("headers が record でないイベントはエラーにする", () => {
		expect(() => {
			return discordInteractionFunctionUrlEventSchema.parse({ headers: "x" });
		}).toThrow();
	});
});

describe("discordInteractionSchema", () => {
	it("PING interaction を受け付ける", () => {
		expect(discordInteractionSchema.parse({ type: 1 })).toEqual({ type: 1 });
	});

	it("ボタン押下 interaction の custom_id と押下ユーザーを受け付ける", () => {
		expect(
			discordInteractionSchema.parse({
				type: 3,
				data: { custom_id: "play-check-reminder:123:won" },
				member: { user: { id: "123" } },
			}),
		).toEqual({
			type: 3,
			data: { custom_id: "play-check-reminder:123:won" },
			member: { user: { id: "123" } },
		});
	});

	it("DM からの interaction は user.id を受け付ける", () => {
		expect(
			discordInteractionSchema.parse({ type: 3, user: { id: "123" } }),
		).toEqual({ type: 3, user: { id: "123" } });
	});

	it("type が欠けた interaction はエラーにする", () => {
		expect(() => {
			return discordInteractionSchema.parse({});
		}).toThrow();
	});

	it("type が number でない interaction はエラーにする", () => {
		expect(() => {
			return discordInteractionSchema.parse({ type: "1" });
		}).toThrow();
	});
});
