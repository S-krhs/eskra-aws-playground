import { getPreviousJstDateString } from "@eskra-aws-playground/libs/date/previous-jst-date.js";
import { describe, expect, it } from "vitest";
import { resolveExportRange } from "./export-range.js";

describe("resolveExportRange", () => {
	it("日付指定がなければ JST の前日 1 日分にする", () => {
		const previousDate = getPreviousJstDateString();

		expect(resolveExportRange({})).toEqual({
			startDate: previousDate,
			endDate: previousDate,
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
