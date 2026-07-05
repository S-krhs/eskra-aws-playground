import { describe, expect, it } from "vitest";

import { parseHtmlMetrics } from "./html-parser.js";

describe("parseHtmlMetrics", () => {
	it("HTML と selector 指定から metric 一覧を作る", () => {
		const html = `
			<section class="ranking">
				<article class="item">
					<h2 class="title">Title A</h2>
					<span class="score">1,234</span>
				</article>
				<article class="item">
					<h2 class="title">Title B</h2>
					<span class="score">567</span>
				</article>
			</section>
		`;

		expect(
			parseHtmlMetrics(html, {
				wrapper: {
					selector: ".ranking",
					index: 0,
				},
				itemsSelector: ".item",
				label: {
					selector: ".title",
					index: 0,
				},
				value: {
					type: "element-text",
					target: {
						selector: ".score",
						index: 0,
					},
				},
			}),
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
		const html = `
			<section class="ranking">
				<article class="item">
					<h2 class="title">Title A</h2>
					<span class="score">N/A</span>
				</article>
				<article class="item">
					<h2 class="title">Title B</h2>
				</article>
				<article class="item">
					<h2 class="title">Title C</h2>
					<span class="score">567</span>
				</article>
			</section>
		`;

		expect(
			parseHtmlMetrics(html, {
				wrapper: {
					selector: ".ranking",
					index: 0,
				},
				itemsSelector: ".item",
				label: {
					selector: ".title",
					index: 0,
				},
				value: {
					type: "element-text",
					target: {
						selector: ".score",
						index: 0,
					},
				},
			}),
		).toEqual({
			metrics: [
				{
					label: "Title C",
					value: 567,
				},
			],
			skippedCount: 2,
		});
	});

	it("item-index を metric value にできる", () => {
		const html = `
			<section class="ranking">
				<article class="item"><h2 class="title">Title A</h2></article>
				<article class="item"><h2 class="title">Title B</h2></article>
			</section>
		`;

		expect(
			parseHtmlMetrics(html, {
				wrapper: {
					selector: ".ranking",
					index: 0,
				},
				itemsSelector: ".item",
				label: {
					selector: ".title",
					index: 0,
				},
				value: {
					type: "item-index",
				},
			}),
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
