import { describe, expect, it } from "vitest";

import {
	buildMetrics,
	normalizeMetricLabel,
	normalizeMetricValue,
} from "./metric.js";

describe("buildMetrics", () => {
	it("変換できない入力は除外して件数に数える", () => {
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
	it("空の label はエラーにする", () => {
		expect(() => {
			return normalizeMetricLabel(" ");
		}).toThrow("metric label が空です");
	});
});

describe("normalizeMetricValue", () => {
	it("数値に変換できない value はエラーにする", () => {
		expect(() => {
			return normalizeMetricValue("not-number");
		}).toThrow("metric value を number に変換できません");
	});

	it("空文字の value は 0 とみなさずエラーにする", () => {
		expect(() => {
			return normalizeMetricValue(" ");
		}).toThrow("metric value が空です");
	});

	it("欠損値の value はエラーにする", () => {
		expect(() => {
			return normalizeMetricValue(undefined);
		}).toThrow("metric value が空です");
	});
});
