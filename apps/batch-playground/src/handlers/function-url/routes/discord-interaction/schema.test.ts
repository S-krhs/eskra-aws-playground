import { describe, expect, it } from "vitest";

import { discordInteractionRequestSchema } from "./schema.js";

describe("discordInteractionRequestSchema", () => {
	it("署名headersとraw bodyとparse済みinteractionを取り出す", () => {
		expect(
			discordInteractionRequestSchema.parse({
				headers: {
					"x-signature-ed25519": "signature",
					"x-signature-timestamp": "timestamp",
				},
				body: '{"type":1}',
				isBase64Encoded: false,
			}),
		).toEqual({
			signature: "signature",
			timestamp: "timestamp",
			rawBody: '{"type":1}',
			interaction: { type: 1, customId: undefined, pressedUserId: undefined },
		});
	});

	it("base64 bodyをdecodeしてinteractionを取り出す", () => {
		const body = Buffer.from('{"type":1}', "utf8").toString("base64");

		expect(
			discordInteractionRequestSchema.parse({
				headers: {},
				body,
				isBase64Encoded: true,
			}),
		).toEqual({
			signature: "",
			timestamp: "",
			rawBody: '{"type":1}',
			interaction: { type: 1, customId: undefined, pressedUserId: undefined },
		});
	});

	it("interaction として parse できない body は失敗する", () => {
		expect(
			discordInteractionRequestSchema.safeParse({
				headers: {},
				body: "not-a-json",
				isBase64Encoded: false,
			}).success,
		).toBe(false);
	});
});
