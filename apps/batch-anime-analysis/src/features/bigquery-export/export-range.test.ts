import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveExportRange } from "./export-range.js";

describe("resolveExportRange", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("falls back to the previous JST day when no date is given", () => {
		vi.useFakeTimers();
		// 2026-09-02 09:00 in JST, so the previous day is 2026-09-01
		vi.setSystemTime(new Date("2026-09-02T00:00:00.000Z"));

		expect(resolveExportRange({})).toEqual({
			startDate: "2026-09-01",
			endDate: "2026-09-01",
		});
	});

	it("treats a start date alone as that single day", () => {
		expect(resolveExportRange({ startDate: "2026-08-01" })).toEqual({
			startDate: "2026-08-01",
			endDate: "2026-08-01",
		});
	});

	it("treats an end date alone as that single day", () => {
		expect(resolveExportRange({ endDate: "2026-08-31" })).toEqual({
			startDate: "2026-08-31",
			endDate: "2026-08-31",
		});
	});

	it("returns a fully specified range unchanged", () => {
		expect(
			resolveExportRange({ startDate: "2026-08-01", endDate: "2026-08-31" }),
		).toEqual({ startDate: "2026-08-01", endDate: "2026-08-31" });
	});

	it("errors when the end date precedes the start date", () => {
		expect(() => {
			return resolveExportRange({
				startDate: "2026-08-31",
				endDate: "2026-08-01",
			});
		}).toThrow("終了日が開始日より前");
	});
});
