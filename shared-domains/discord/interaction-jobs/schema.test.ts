import { describe, expect, it } from "vitest";

import { interactionJobMessageSchema } from "./schema.js";

describe("interactionJobMessageSchema", () => {
	it("validates gamble-check-enable's required fields", () => {
		const parsed = interactionJobMessageSchema.parse({
			job: "gamble-check-enable",
			applicationId: "999",
			token: "tok",
			guildId: "111",
			channelId: "222",
			userId: "333",
		});

		expect(parsed.job).toBe("gamble-check-enable");
	});

	it("rejects a message missing the callback (applicationId/token)", () => {
		expect(() => {
			return interactionJobMessageSchema.parse({
				job: "yaccho-hello-reply",
				applicationId: "999",
			});
		}).toThrow();
	});

	it("rejects an unknown job", () => {
		expect(() => {
			return interactionJobMessageSchema.parse({
				job: "unknown-job",
				applicationId: "999",
				token: "tok",
			});
		}).toThrow();
	});
});
