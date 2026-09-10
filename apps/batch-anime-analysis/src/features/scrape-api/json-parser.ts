// In scope: building a metric list out of JSON data
// Out of scope: fetching the JSON, parsing HTML, this app's own definition conversion
import {
	buildMetrics,
	type MetricBuildResult,
} from "@/_shared/intermediate-models/metric/metric.js";

export type JsonValueTarget =
	| {
			type: "item-index";
	  }
	| {
			type: "path";
			path: string;
	  };

/** The paths that pull metric inputs out of JSON data. */
export interface JsonParseOptions {
	itemsPath: string;
	labelPath: string;
	value: JsonValueTarget;
}

/** Builds a metric list from JSON data; an item that can't be converted is excluded and counted. */
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

/** Walks a path like "items/0/name" to pull a value out. */
const readJsonPath = (input: unknown, path: string): unknown => {
	const segments = path.split("/").filter((segment) => {
		return segment.length > 0;
	});

	return segments.reduce<unknown>(readSegment, input);
};

/** Walks one level of a path; undefined when it can't be reached. */
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
