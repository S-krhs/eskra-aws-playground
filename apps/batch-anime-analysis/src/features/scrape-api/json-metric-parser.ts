// In scope: JSON データから metric 一覧を作る
// Out of scope: JSON 取得、HTML 解析、app 固有の定義変換を行う
import { buildMetrics, type Metric } from "../../shared/intermediate/metric.js";

/** JSON metric value の取得方法。 */
export type JsonMetricValueTarget =
	| {
			type: "item-index";
	  }
	| {
			type: "path";
			path: string;
	  };

/** JSON データから metric input を取り出すための path 指定。 */
export interface JsonMetricParseOptions {
	itemsPath: string;
	labelPath: string;
	value: JsonMetricValueTarget;
}

/** JSON データから metric 一覧を作る。 */
export const parseJsonMetrics = (
	jsonData: unknown,
	options: JsonMetricParseOptions,
): Metric[] => {
	const items = readJsonPath(jsonData, options.itemsPath);

	if (!Array.isArray(items)) {
		throw new Error("itemsPath の取得結果が配列ではありません");
	}

	const metricInputs = items.map((item, index) => ({
		label: readJsonPath(item, options.labelPath),
		value:
			options.value.type === "item-index"
				? index + 1
				: readJsonPath(item, options.value.path),
	}));

	return buildMetrics(metricInputs);
};

const readJsonPath = (input: unknown, path: string): unknown => {
	const pathSegments = path.split("/").filter((segment) => segment.length > 0);

	return pathSegments.reduce<unknown>((currentValue, segment) => {
		if (currentValue === undefined || currentValue === null) {
			return undefined;
		}

		if (Array.isArray(currentValue)) {
			const index = Number(segment);
			return Number.isInteger(index) ? currentValue[index] : undefined;
		}

		if (typeof currentValue === "object") {
			return (currentValue as Record<string, unknown>)[segment];
		}

		return undefined;
	}, input);
};
