import { describe, expect, it } from "vitest";

import { discordInteractionRequestSchema } from "./schema.js";

describe("discordInteractionRequestSchema", () => {
	it("pulls out the signature headers, the raw body and the parsed interaction", () => {
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
			interaction: { kind: "ping" },
		});
	});

	it("decodes a base64 body and pulls the interaction out of it", () => {
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
			interaction: { kind: "ping" },
		});
	});

	it("fails on a body that does not parse as an interaction", () => {
		expect(
			discordInteractionRequestSchema.safeParse({
				headers: {},
				body: "not-a-json",
				isBase64Encoded: false,
			}).success,
		).toBe(false);
	});
});
