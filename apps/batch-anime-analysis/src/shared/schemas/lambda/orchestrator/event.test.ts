import { describe, expect, it } from "vitest";
import { orchestratorEventSchema } from "./event.js";

describe("orchestratorEventSchema", () => {
	it("validates and normalizes the launch event", () => {
		expect(orchestratorEventSchema.parse({ scheduleHour: 9 })).toEqual({
			scheduleHour: 9,
		});
	});

	it("errors on an event missing scheduleHour", () => {
		expect(() => {
			return orchestratorEventSchema.parse({});
		}).toThrow("scheduleHour");
	});

	it("errors on an event whose scheduleHour is not a number", () => {
		expect(() => {
			return orchestratorEventSchema.parse({ scheduleHour: "9" });
		}).toThrow("scheduleHour");
	});

	it("errors on a scheduleHour that is not an integer from 0 to 23", () => {
		expect(() => {
			return orchestratorEventSchema.parse({ scheduleHour: 24 });
		}).toThrow("scheduleHour");

		expect(() => {
			return orchestratorEventSchema.parse({ scheduleHour: 9.5 });
		}).toThrow("scheduleHour");
	});
});
