import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveExportRange } from "./export-range.js";

describe("resolveExportRange", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("日付指定がなければ JST の前日 1 日分にする", () => {
		vi.useFakeTimers();
		// JST では 2026-09-02 09:00。前日は 2026-09-01 になる
		vi.setSystemTime(new Date("2026-09-02T00:00:00.000Z"));

		expect(resolveExportRange({})).toEqual({
			startDate: "2026-09-01",
			endDate: "2026-09-01",
		});
	});

	it("開始日だけの指定はその 1 日にする", () => {
		expect(resolveExportRange({ startDate: "2026-08-01" })).toEqual({
			startDate: "2026-08-01",
			endDate: "2026-08-01",
		});
	});

	it("終了日だけの指定はその 1 日にする", () => {
		expect(resolveExportRange({ endDate: "2026-08-31" })).toEqual({
			startDate: "2026-08-31",
			endDate: "2026-08-31",
		});
	});

	it("両端を指定した範囲をそのまま返す", () => {
		expect(
			resolveExportRange({ startDate: "2026-08-01", endDate: "2026-08-31" }),
		).toEqual({ startDate: "2026-08-01", endDate: "2026-08-31" });
	});

	it("終了日が開始日より前ならエラーにする", () => {
		expect(() => {
			return resolveExportRange({
				startDate: "2026-08-31",
				endDate: "2026-08-01",
			});
		}).toThrow("終了日が開始日より前");
	});
});
