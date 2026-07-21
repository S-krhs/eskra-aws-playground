import { describe, expect, it } from "vitest";

import { interactionJobMessageSchema } from "./message.js";

describe("interactionJobMessageSchema", () => {
	it("gamble-check-enable の必須項目を検証する", () => {
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

	it("callback(applicationId・token)を欠く message は拒否する", () => {
		expect(() => {
			return interactionJobMessageSchema.parse({
				job: "yaccho-hello-reply",
				applicationId: "999",
			});
		}).toThrow();
	});

	it("未知の job は拒否する", () => {
		expect(() => {
			return interactionJobMessageSchema.parse({
				job: "unknown-job",
				applicationId: "999",
				token: "tok",
			});
		}).toThrow();
	});
});
