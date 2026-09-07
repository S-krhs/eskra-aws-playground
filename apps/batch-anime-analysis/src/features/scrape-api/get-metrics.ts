// In scope: fetching JSON from an API URL (with a timeout and a response-size cap) and turning it into a metric list
// Out of scope: retry control, this app's own definition conversion
import type { MetricBuildResult } from "@/shared/intermediate-models/metric/metric.js";
import {
	type JsonParseOptions,
	type JsonValueTarget,
	parseJsonMetrics,
} from "./json-parser.js";

/** Fetch timeout, in milliseconds. */
const FETCH_TIMEOUT_MS = 10_000;

/** Largest API response accepted, roughly in bytes. */
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

/** The source definition pulling metrics out of an API. */
export type ApiSource = {
	type: "api";
	url: string;
	itemsPath: string;
	labelPath: string;
	value: JsonValueTarget;
};

/**
 * Takes an API source definition, fetches the JSON, and returns the metric list
 * @param source how to pull metrics out of the API
 * @returns the parsed metrics and how many were excluded as unconvertible
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
