// In scope: 指定の API URL から JSON を取得し（timeout / 応答サイズ上限つき）、metric 一覧へ変換する
// Out of scope: リトライ制御やアプリ固有の定義変換を行う
import type { MetricBuildResult } from "../../shared/intermediate-models/metric/metric.js";
import {
	type JsonParseOptions,
	type JsonValueTarget,
	parseJsonMetrics,
} from "./json-parser.js";

/** API 取得のタイムアウト（ミリ秒）。 */
const FETCH_TIMEOUT_MS = 10_000;

/** 受け入れる API 応答の最大サイズ（バイト目安）。 */
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

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
 * @returns 解析済み metric 一覧と変換できず除外した件数
 */
export const getApiMetrics = async (
	source: ApiSource,
): Promise<MetricBuildResult> => {
	const response = await fetch(source.url, {
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
	});
	if (!response.ok) {
		throw new Error(`API metric 取得に失敗しました: ${response.status}`);
	}

	const declaredLength = Number(response.headers.get("content-length"));
	if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
		throw new Error(
			`API 応答サイズが上限を超えています: ${declaredLength} bytes`,
		);
	}

	const body = await response.text();
	if (body.length > MAX_RESPONSE_BYTES) {
		throw new Error("API 応答サイズが上限を超えています");
	}

	const jsonData: unknown = JSON.parse(body);
	const parseOptions: JsonParseOptions = {
		itemsPath: source.itemsPath,
		labelPath: source.labelPath,
		value: source.value,
	};

	return parseJsonMetrics(jsonData, parseOptions);
};
