import { describe, expect, it } from "vitest";
import { bigQueryExportEventSchema } from "./event.js";

describe("bigQueryExportEventSchema", () => {
	it("日付指定のない起動イベントを受け付ける", () => {
		expect(bigQueryExportEventSchema.parse({})).toEqual({});
	});

	it("日付指定を検証して正規化する", () => {
		expect(
			bigQueryExportEventSchema.parse({
				startDate: "2026-08-01",
				endDate: "2026-08-31",
				job: "anime-metric-bigquery-export",
			}),
		).toEqual({ startDate: "2026-08-01", endDate: "2026-08-31" });
	});

	it("YYYY-MM-DD 形式でない日付はエラーにする", () => {
		expect(() => {
			return bigQueryExportEventSchema.parse({ startDate: "2026/08/01" });
		}).toThrow("startDate");

		expect(() => {
			return bigQueryExportEventSchema.parse({ endDate: "2026-13-01" });
		}).toThrow("endDate");
	});
});
