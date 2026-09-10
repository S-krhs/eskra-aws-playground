import { describe, expect, it } from "vitest";

import {
	buildMetrics,
	normalizeMetricLabel,
	normalizeMetricValue,
} from "./metric.js";

describe("buildMetrics", () => {
	it("excludes an unconvertible input and counts it", () => {
		expect(
			buildMetrics([
				{ label: "Title A", value: "1,234" },
				{ label: "Title B", value: "N/A" },
				{ label: "", value: 10 },
			]),
		).toEqual({
			metrics: [
				{
					label: "Title A",
					value: 1234,
				},
			],
			skippedCount: 2,
		});
	});
});

describe("normalizeMetricLabel", () => {
	it("errors on an empty label", () => {
		expect(() => {
			return normalizeMetricLabel(" ");
		}).toThrow("metric label が空です");
	});
});

describe("normalizeMetricValue", () => {
	it("errors on a value that is not a number", () => {
		expect(() => {
			return normalizeMetricValue("not-number");
		}).toThrow("metric value を number に変換できません");
	});

	it("errors on an empty value rather than counting it as 0", () => {
		expect(() => {
			return normalizeMetricValue(" ");
		}).toThrow("metric value が空です");
	});

	it("errors on a missing value", () => {
		expect(() => {
			return normalizeMetricValue(undefined);
		}).toThrow("metric value が空です");
	});
});
