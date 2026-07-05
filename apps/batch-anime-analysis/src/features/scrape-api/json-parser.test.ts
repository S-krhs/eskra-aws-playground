import { describe, expect, it } from "vitest";

import { parseJsonMetrics } from "./json-parser.js";

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
		).toEqual({
			metrics: [
				{
					label: "Title A",
					value: 1234,
				},
				{
					label: "Title B",
					value: 567,
				},
			],
			skippedCount: 0,
		});
	});

	it("metric に変換できない item は除外して件数に数える", () => {
		expect(
			parseJsonMetrics(
				{
					items: [
						{
							title: "Title A",
							score: "N/A",
						},
						{
							title: "Title B",
							score: 567,
						},
					],
				},
				{
					itemsPath: "items",
					labelPath: "title",
					value: {
						type: "path",
						path: "score",
					},
				},
			),
		).toEqual({
			metrics: [
				{
					label: "Title B",
					value: 567,
				},
			],
			skippedCount: 1,
		});
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
		).toEqual({
			metrics: [
				{
					label: "Title A",
					value: 1,
				},
				{
					label: "Title B",
					value: 2,
				},
			],
			skippedCount: 0,
		});
	});
});
