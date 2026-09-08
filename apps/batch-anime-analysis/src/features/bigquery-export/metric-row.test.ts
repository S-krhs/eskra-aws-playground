import { describe, expect, it } from "vitest";
import { toScrapingMetricRow } from "./metric-row.js";
import { scrapingMetricTableDefinition } from "./metric-table-definition.js";

describe("toScrapingMetricRow", () => {
	const metric = {
		id: "12345678901234",
		dataSourceId: "bilibili-rank",
		label: "作品A",
		value: 1.5,
		scrapedDate: "2026-09-01",
		createdAt: "2026-09-01T14:00:00.000Z",
	};

	it("converts to the destination table's column names", () => {
		expect(toScrapingMetricRow(metric)).toEqual({
			id: "12345678901234",
			data_source_id: "bilibili-rank",
			label: "作品A",
			value: 1.5,
			scraped_date: "2026-09-01",
			created_at: "2026-09-01T14:00:00.000Z",
		});
	});

	it("fills every column in the table definition", () => {
		const fieldNames = scrapingMetricTableDefinition.fields.map((field) => {
			return field.name;
		});

		expect(Object.keys(toScrapingMetricRow(metric)).sort()).toEqual(
			[...fieldNames].sort(),
		);
	});
});
