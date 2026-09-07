import { describe, expect, it } from "vitest";

import { batchEventSchema } from "./schema.js";

describe("batchEventSchema", () => {
	it("normalizes the event's job by trimming and lowercasing", () => {
		expect(batchEventSchema.parse({ job: " UMA-ONE-DRAW-TOPIC " })).toEqual({
			job: "uma-one-draw-topic",
		});
	});

	it("errors on an event missing job", () => {
		expect(() => {
			return batchEventSchema.parse({});
		}).toThrow();
	});

	it("errors on an event whose job is not a string", () => {
		expect(() => {
			return batchEventSchema.parse({ job: 1 });
		}).toThrow();
	});

	it("errors on an event whose job is only whitespace", () => {
		expect(() => {
			return batchEventSchema.parse({ job: "   " });
		}).toThrow();
	});
});
