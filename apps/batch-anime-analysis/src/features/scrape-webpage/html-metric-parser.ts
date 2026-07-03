// In scope: HTML から metric 一覧を作る
// Out of scope: HTML 取得、browser 起動、app 固有の定義変換を行う

import * as cheerio from "cheerio";
import { buildMetrics, type Metric } from "../../shared/intermediate/metric.js";

/** HTML 上の要素を選ぶ指定。 */
export interface HtmlElementTarget {
	selector: string;
	index?: number;
}

export type HtmlMetricValueTarget =
	| {
			type: "item-index";
	  }
	| {
			type: "element-text";
			target: HtmlElementTarget;
	  };

/** HTML から metric を作るための指定。 */
export interface HtmlMetricParseOptions {
	wrapper: HtmlElementTarget;
	itemsSelector: string;
	label: HtmlElementTarget;
	value: HtmlMetricValueTarget;
}

/** HTML から metric 一覧を作る。 */
export const parseHtmlMetrics = (
	html: string,
	options: HtmlMetricParseOptions,
): Metric[] => {
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
): string =>
	element
		.find(target.selector)
		.eq(target.index ?? 0)
		.text();
