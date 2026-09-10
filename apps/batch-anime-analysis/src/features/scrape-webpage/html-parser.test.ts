import { describe, expect, it } from "vitest";

import { parseHtmlMetrics } from "./html-parser.js";

describe("parseHtmlMetrics", () => {
	it("builds a metric list from HTML and its selectors", () => {
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

	it("excludes an item that can't be converted and counts it", () => {
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

	it("can use the item index as the metric value", () => {
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
