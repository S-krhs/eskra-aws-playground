import { describe, expect, it } from "vitest";

import { buildScrapingReport } from "./scraping-report.js";

const source = {
	websiteName: "MyAnimeList",
	metricName: "score",
	higherIsBetter: true,
};

describe("buildScrapingReport", () => {
	it("orders by descending value and medals the top 3 when higherIsBetter is true", () => {
		const report = buildScrapingReport({
			source,
			metrics: [
				{ label: "B", value: 100 },
				{ label: "A", value: 300 },
				{ label: "C", value: 200 },
			],
		});

		expect(report).toBe(
			[
				"📊 **データ取得結果** ｜ MyAnimeList・score ｜ 3 件",
				"",
				"🥇 A — **300**",
				"🥈 C — **200**",
				"🥉 B — **100**",
			].join("\n"),
		);
	});

	it("orders a rank-style metric ascending when higherIsBetter is false", () => {
		const report = buildScrapingReport({
			source: { ...source, metricName: "rank", higherIsBetter: false },
			metrics: [
				{ label: "X", value: 3 },
				{ label: "Y", value: 1 },
				{ label: "Z", value: 2 },
			],
		});

		expect(report).toContain("🥇 Y — **1**");
		expect(report).toContain("🥈 Z — **2**");
		expect(report).toContain("🥉 X — **3**");
	});

	it("medals the actual top even when the input is unsorted", () => {
		const report = buildScrapingReport({
			source,
			metrics: [
				{ label: "低", value: 1 },
				{ label: "高", value: 9999 },
			],
		});

		expect(report).toContain("🥇 高 — **9,999**");
		expect(report).toContain("🥈 低 — **1**");
	});

	it("uses a keycap emoji instead of a medal from the fourth entry on", () => {
		const report = buildScrapingReport({
			source,
			metrics: [
				{ label: "1st", value: 40 },
				{ label: "2nd", value: 30 },
				{ label: "3rd", value: 20 },
				{ label: "4th", value: 10 },
			],
		});

		expect(report).toContain("4️⃣ 4th — **10**");
	});

	it("shows nothing past previewLimit", () => {
		const metrics = Array.from({ length: 12 }, (_, index) => {
			return {
				label: `title-${index}`,
				value: 100 - index,
			};
		});

		const report = buildScrapingReport({ source, metrics, previewLimit: 3 });

		expect(report).toContain("title-2");
		expect(report).not.toContain("title-3");
	});

	it("puts the excluded count in the header when skippedCount is set", () => {
		const report = buildScrapingReport({
			source,
			metrics: [{ label: "A", value: 1 }],
			skippedCount: 3,
		});

		expect(report).toContain("｜ 1 件 ｜ 除外：3 件");
	});

	it("returns the no-data message for empty metrics", () => {
		const report = buildScrapingReport({ source, metrics: [] });

		expect(report).toContain("0 件");
		expect(report).toContain("データを取得できませんでした");
	});
});
