import { describe, expect, it } from "vitest";

import {
	buildMetric,
	normalizeMetricLabel,
	normalizeMetricValue,
} from "./metric.js";

describe("buildMetric", () => {
	it("未正規化入力から metric 中間表現を作る", () => {
		expect(
			buildMetric({
				label: " Title A ",
				value: "1,234",
			}),
		).toEqual({
			label: "Title A",
			value: 1234,
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
});
