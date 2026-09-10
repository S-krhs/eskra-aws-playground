// In scope: building a metric list out of HTML
// Out of scope: fetching the HTML, launching a browser, this app's own definition conversion

import * as cheerio from "cheerio";
import {
	buildMetrics,
	type MetricBuildResult,
} from "@/_shared/intermediate-models/metric/metric.js";

/** Picks one element out of an HTML document. */
export interface HtmlElementTarget {
	selector: string;
	index?: number;
}

export type HtmlValueTarget =
	| {
			type: "item-index";
	  }
	| {
			type: "element-text";
			target: HtmlElementTarget;
	  };

/** How metrics are built out of HTML. */
export interface HtmlParseOptions {
	wrapper: HtmlElementTarget;
	itemsSelector: string;
	label: HtmlElementTarget;
	value: HtmlValueTarget;
}

/** Builds a metric list from HTML; an item that can't be converted is excluded and counted. */
export const parseHtmlMetrics = (
	html: string,
	options: HtmlParseOptions,
): MetricBuildResult => {
	const $ = cheerio.load(html);
	const wrapper = $(options.wrapper.selector).eq(options.wrapper.index ?? 0);
	const items = wrapper.find(options.itemsSelector).toArray();

	const metricInputs = items.map((item, index) => {
		const itemElement = $(item);
		return {
			label: readText(itemElement, options.label),
			value:
				options.value.type === "item-index"
					? index + 1
					: readText(itemElement, options.value.target),
		};
	});

	return buildMetrics(metricInputs);
};

const readText = (
	element: ReturnType<cheerio.CheerioAPI>,
	target: HtmlElementTarget,
): string => {
	return element
		.find(target.selector)
		.eq(target.index ?? 0)
		.text();
};
