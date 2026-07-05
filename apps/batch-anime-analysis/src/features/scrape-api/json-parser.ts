// In scope: JSON データから metric 一覧を作る
// Out of scope: JSON 取得、HTML 解析、app 固有の定義変換を行う
import {
	buildMetrics,
	type MetricBuildResult,
} from "../../shared/intermediate-models/metric/metric.js";

/** JSON metric value の取得方法。 */
export type JsonValueTarget =
	| {
			type: "item-index";
	  }
	| {
			type: "path";
			path: string;
	  };

/** JSON データから metric input を取り出すための path 指定。 */
export interface JsonParseOptions {
	itemsPath: string;
	labelPath: string;
	value: JsonValueTarget;
}

/** JSON データから metric 一覧を作る。変換できない item は除外して件数に数える。 */
export const parseJsonMetrics = (
	jsonData: unknown,
	options: JsonParseOptions,
): MetricBuildResult => {
	const items = readJsonPath(jsonData, options.itemsPath);

	if (!Array.isArray(items)) {
		throw new Error("itemsPath の取得結果が配列ではありません");
	}

	const metricInputs = items.map((item, index) => {
		return {
			label: readJsonPath(item, options.labelPath),
			value: readValue(item, index, options.value),
		};
	});

	return buildMetrics(metricInputs);
};

/** metric value を取得方法に応じて取り出す。 */
const readValue = (
	item: unknown,
	index: number,
	value: JsonValueTarget,
): unknown => {
	if (value.type === "item-index") {
		return index + 1;
	}

	return readJsonPath(item, value.path);
};

/** "items/0/name" のような path を辿って値を取り出す。 */
const readJsonPath = (input: unknown, path: string): unknown => {
	const segments = path.split("/").filter((segment) => {
		return segment.length > 0;
	});

	return segments.reduce<unknown>(readSegment, input);
};

/** path の 1 階層分を辿る。到達できない場合は undefined を返す。 */
const readSegment = (current: unknown, segment: string): unknown => {
	if (Array.isArray(current)) {
		const index = Number(segment);
		return Number.isInteger(index) ? current[index] : undefined;
	}

	if (typeof current === "object" && current !== null) {
		return (current as Record<string, unknown>)[segment];
	}

	return undefined;
};
