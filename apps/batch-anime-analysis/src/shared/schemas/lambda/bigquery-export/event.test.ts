import { describe, expect, it } from "vitest";
import { bigQueryExportEventSchema } from "./event.js";

describe("bigQueryExportEventSchema", () => {
	it("accepts a launch event with no dates", () => {
		expect(bigQueryExportEventSchema.parse({})).toEqual({});
	});

	it("validates and normalizes the given dates", () => {
		expect(
			bigQueryExportEventSchema.parse({
				startDate: "2026-08-01",
				endDate: "2026-08-31",
				job: "anime-metric-bigquery-export",
			}),
		).toEqual({ startDate: "2026-08-01", endDate: "2026-08-31" });
	});

	it("errors on a date not in YYYY-MM-DD form", () => {
		expect(() => {
			return bigQueryExportEventSchema.parse({ startDate: "2026/08/01" });
		}).toThrow("startDate");

		expect(() => {
			return bigQueryExportEventSchema.parse({ endDate: "2026-13-01" });
		}).toThrow("endDate");
	});
});
