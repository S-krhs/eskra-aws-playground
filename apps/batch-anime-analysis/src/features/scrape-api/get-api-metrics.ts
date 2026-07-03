// やること: 指定の API URL から JSON を取得し、metric 一覧へ変換する
// やらないこと: HTTP クライアントの設定やリトライ、アプリ固有の定義変換を行う
import type { Metric } from "../../shared/intermediate/metric.js";
import {
	type JsonMetricParseOptions,
	type JsonMetricValueTarget,
	parseJsonMetrics,
} from "./json-metric-parser.js";

export type ApiMetricSource = {
	type: "api";
	url: string;
	itemsPath: string;
	labelPath: string;
	value: JsonMetricValueTarget;
};

export const buildJsonMetricParseOptions = (
	source: ApiMetricSource,
): JsonMetricParseOptions => ({
	itemsPath: source.itemsPath,
	labelPath: source.labelPath,
	value: source.value,
});

/**
 * API の source 定義を受け取り、JSON を取得して metric 一覧を返す
 * @param source API から metric を取り出す定義
 * @returns 解析済みの `Metric[]`
 */
export const getApiMetrics = async (
	source: ApiMetricSource,
): Promise<Metric[]> => {
	const response = await fetch(source.url);
	if (!response.ok) {
		throw new Error(`API metric 取得に失敗しました: ${response.status}`);
	}
	const jsonData: unknown = await response.json();
	return parseJsonMetrics(jsonData, buildJsonMetricParseOptions(source));
};
