// In scope: 指定の API URL から JSON を取得し、metric 一覧へ変換する
// Out of scope: HTTP クライアントの設定やリトライ、アプリ固有の定義変換を行う
import type { Metric } from "../../shared/intermediate-models/metric/metric.js";
import {
	type JsonParseOptions,
	type JsonValueTarget,
	parseJsonMetrics,
} from "./json-parser.js";

/** API から metric を取り出すための source 定義。 */
export type ApiSource = {
	type: "api";
	url: string;
	itemsPath: string;
	labelPath: string;
	value: JsonValueTarget;
};

/**
 * API の source 定義を受け取り、JSON を取得して metric 一覧を返す
 * @param source API から metric を取り出す定義
 * @returns 解析済みの `Metric[]`
 */
export const getApiMetrics = async (source: ApiSource): Promise<Metric[]> => {
	const response = await fetch(source.url);
	if (!response.ok) {
		throw new Error(`API metric 取得に失敗しました: ${response.status}`);
	}
	const jsonData: unknown = await response.json();
	const parseOptions: JsonParseOptions = {
		itemsPath: source.itemsPath,
		labelPath: source.labelPath,
		value: source.value,
	};

	return parseJsonMetrics(jsonData, parseOptions);
};
