import { describe, expect, it } from "vitest";
import { discordInteractionRequestSchema } from "./schema.js";

describe("discordInteractionRequestSchema", () => {
	it("署名headers・raw body・interactionを取り出す", () => {
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

	it("interactionとしてparseできないbodyは失敗する", () => {
		expect(
			discordInteractionRequestSchema.safeParse({
				headers: {},
				body: "not-a-json",
			}).success,
		).toBe(false);
	});
});
