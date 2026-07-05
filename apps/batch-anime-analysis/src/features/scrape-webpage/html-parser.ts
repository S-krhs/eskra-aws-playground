// In scope: HTML から metric 一覧を作る
// Out of scope: HTML 取得、browser 起動、app 固有の定義変換を行う

import * as cheerio from "cheerio";
import {
	buildMetrics,
	type MetricBuildResult,
} from "../../shared/intermediate-models/metric/metric.js";

/** HTML 上の要素を選ぶ指定。 */
export interface HtmlElementTarget {
	selector: string;
	index?: number;
}

/** HTML metric value の取得方法。 */
export type HtmlValueTarget =
	| {
			type: "item-index";
	  }
	| {
			type: "element-text";
			target: HtmlElementTarget;
	  };

/** HTML から metric を作るための指定。 */
export interface HtmlParseOptions {
	wrapper: HtmlElementTarget;
	itemsSelector: string;
	label: HtmlElementTarget;
	value: HtmlValueTarget;
}

/** HTML から metric 一覧を作る。変換できない item は除外して件数に数える。 */
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
