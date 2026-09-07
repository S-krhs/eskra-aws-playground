import { describe, expect, it } from "vitest";
import { discordInteractionRequestSchema } from "./schema.js";

describe("discordInteractionRequestSchema", () => {
	it("pulls out the signature headers, the raw body and the interaction", () => {
		expect(
			discordInteractionRequestSchema.parse({
				headers: {
					"x-signature-ed25519": "signature",
					"x-signature-timestamp": "timestamp",
				},
				body: '{"type":1}',
				isBase64Encoded: false,
			}),
		).toMatchObject({
			signature: "signature",
			timestamp: "timestamp",
			rawBody: '{"type":1}',
			interaction: { kind: "ping" },
		});
	});

	it("fails on a body that does not parse as an interaction", () => {
		expect(
			discordInteractionRequestSchema.safeParse({
				headers: {},
				body: "not-a-json",
			}).success,
		).toBe(false);
	});
});
