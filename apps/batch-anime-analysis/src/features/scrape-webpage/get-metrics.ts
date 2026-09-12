// In scope: fetching HTML from a webpage URL and turning it into a metric list
// Out of scope: launching a browser and controlling rendering, this app's own conversion rules
import { fetchWebpageHtml } from "@eskra-aws-playground/libs-browser/html-scraper/webpage-html.js";
import type { MetricBuildResult } from "@/_shared/intermediate-models/metric/metric.js";
import {
	type HtmlParseOptions,
	type HtmlValueTarget,
	parseHtmlMetrics,
} from "./html-parser.js";

/** Picks one element out of a webpage. */
export type WebpageElementSource = {
	selector: string;
	index?: number;
};

export type WebpageSource = {
	type: "webpage";
	url: string;
	wrapper: WebpageElementSource;
	itemsSelector: string;
	label: WebpageElementSource;
	value: HtmlValueTarget;
};

/** Turns a webpage source definition into the parser's HTML options. */
export const buildHtmlParseOptions = (
	source: WebpageSource,
): HtmlParseOptions => {
	return {
		wrapper: {
			selector: source.wrapper.selector,
			index: source.wrapper.index ?? 0,
		},
		itemsSelector: source.itemsSelector,
		label: {
			selector: source.label.selector,
			index: source.label.index ?? 0,
		},
		value:
			source.value.type === "item-index"
				? {
						type: "item-index",
					}
				: {
						type: "element-text",
						target: {
							selector: source.value.target.selector,
							index: source.value.target.index ?? 0,
						},
					},
	};
};

/** Fetches the HTML the source points at and builds the metric list out of it. */
export const getWebpageMetrics = async (
	source: WebpageSource,
): Promise<MetricBuildResult> => {
	const html = await fetchWebpageHtml(source.url);
	return parseHtmlMetrics(html, buildHtmlParseOptions(source));
};
