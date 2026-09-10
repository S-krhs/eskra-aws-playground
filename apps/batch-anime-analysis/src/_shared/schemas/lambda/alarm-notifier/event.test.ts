import { describe, expect, it } from "vitest";
import { alarmNotifierEventSchema } from "./event.js";

describe("alarmNotifierEventSchema", () => {
	it("validates the launch event and normalizes it down to the fields used", () => {
		const parsed = alarmNotifierEventSchema.parse({
			Records: [
				{
					Sns: {
						Message: "ALARM: batch failed",
						Subject: "ALARM",
						Timestamp: "2026-07-05T00:00:00.000Z",
						// The unused fields AWS attaches are dropped.
						SignatureVersion: "1",
					},
					EventSource: "aws:sns",
				},
			],
		});

		expect(parsed).toEqual({
			Records: [
				{
					Sns: {
						Message: "ALARM: batch failed",
						Subject: "ALARM",
						Timestamp: "2026-07-05T00:00:00.000Z",
					},
				},
			],
		});
	});

	it("errors on an event missing Records", () => {
		expect(() => {
			return alarmNotifierEventSchema.parse({});
		}).toThrow("Records");
	});

	it("errors on a record missing Sns.Message", () => {
		expect(() => {
			return alarmNotifierEventSchema.parse({
				Records: [{ Sns: { Subject: "ALARM" } }],
			});
		}).toThrow("Message");
	});
});
