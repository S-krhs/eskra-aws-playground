// In scope: 指定の webpage URL から HTML を取得し、metric 一覧へ変換する
// Out of scope: ブラウザ起動やレンダリングの制御、アプリ固有の変換ルール定義
import { fetchWebpageHtml } from "@eskra-aws-playground/libs-browser/html-scraper/webpage-html.js";
import type { MetricBuildResult } from "../../shared/intermediate-models/metric/metric.js";
import {
	type HtmlParseOptions,
	type HtmlValueTarget,
	parseHtmlMetrics,
} from "./html-parser.js";

/** Webpage 上の要素を選ぶ指定。 */
export type WebpageElementSource = {
	selector: string;
	index?: number;
};

/** Webpage から metric を取り出すための source 定義。 */
export type WebpageSource = {
	type: "webpage";
	url: string;
	wrapper: WebpageElementSource;
	itemsSelector: string;
	label: WebpageElementSource;
	value: HtmlValueTarget;
};

/** Webpage source 定義を parser 用の HTML 解析オプションへ変換する。 */
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

/**
 * Webpage source 定義を受け取り、HTML を取得して metric 一覧を返す
 * @param source Webpage から metric を取り出す定義
 * @returns 解析済み metric 一覧と変換できず除外した件数
 */
export const getWebpageMetrics = async (
	source: WebpageSource,
): Promise<MetricBuildResult> => {
	const html = await fetchWebpageHtml(source.url);
	return parseHtmlMetrics(html, buildHtmlParseOptions(source));
};
