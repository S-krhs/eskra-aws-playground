import { describe, expect, it } from "vitest";

import { parseJsonMetrics } from "./json-metric-parser.js";

describe("parseJsonMetrics", () => {
	it("JSON と path 指定から metric 一覧を作る", () => {
		expect(
			parseJsonMetrics(
				{
					data: {
						items: [
							{
								title: "Title A",
								score: "1,234",
							},
							{
								title: "Title B",
								score: 567,
							},
						],
					},
				},
				{
					itemsPath: "data/items",
					labelPath: "title",
					value: {
						type: "path",
						path: "score",
					},
				},
			),
		).toEqual([
			{
				label: "Title A",
				value: 1234,
			},
			{
				label: "Title B",
				value: 567,
			},
		]);
	});

	it("item-index を metric value にできる", () => {
		expect(
			parseJsonMetrics(
				{
					data: [
						{
							title: "Title A",
						},
						{
							title: "Title B",
						},
					],
				},
				{
					itemsPath: "data",
					labelPath: "title",
					value: {
						type: "item-index",
					},
				},
			),
		).toEqual([
			{
				label: "Title A",
				value: 1,
			},
			{
				label: "Title B",
				value: 2,
			},
		]);
	});
});
