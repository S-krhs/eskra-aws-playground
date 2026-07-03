// やること: 指定の webpage URL から HTML を取得し、metric 一覧へ変換する
// やらないこと: ブラウザ起動やレンダリングの制御、アプリ固有の変換ルール定義
import { fetchWebpageHtml } from "@lambda-batch-playground/libs-browser/html-scraper/webpage-html.js";
import type { Metric } from "../../shared/intermediate/metric.js";
import {
	type HtmlMetricParseOptions,
	type HtmlMetricValueTarget,
	parseHtmlMetrics,
} from "./html-metric-parser.js";

export type WebpageElementSource = {
	selector: string;
	index?: number;
};

export type WebpageMetricSource = {
	type: "webpage";
	url: string;
	wrapper: WebpageElementSource;
	itemsSelector: string;
	label: WebpageElementSource;
	value: HtmlMetricValueTarget;
};

export const buildHtmlMetricParseOptions = (
	source: WebpageMetricSource,
): HtmlMetricParseOptions => ({
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
});

/**
 * Webpage source 定義を受け取り、HTML を取得して metric 一覧を返す
 * @param source Webpage から metric を取り出す定義
 * @returns 解析済みの `Metric[]`
 */
export const getWebpageMetrics = async (
	source: WebpageMetricSource,
): Promise<Metric[]> => {
	const html = await fetchWebpageHtml(source.url);
	return parseHtmlMetrics(html, buildHtmlMetricParseOptions(source));
};
