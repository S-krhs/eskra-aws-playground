// In scope: the intermediate metric type passed between steps inside this app, and its normalization
// Out of scope: fetching data, interpreting selectors, writing notifications

/** A numeric metric tied to a label, passed between steps inside this app. */
export interface Metric {
	label: string;
	value: number;
}

/** The unnormalized input a metric is built from. */
export interface MetricInput {
	label: unknown;
	value: unknown;
}

/** The metrics built from a list of unnormalized inputs, plus how many were excluded as unconvertible. */
export interface MetricBuildResult {
	metrics: Metric[];
	skippedCount: number;
}

/** Builds metrics from unnormalized inputs; an input that can't be converted is excluded and counted. */
export const buildMetrics = (
	inputs: readonly MetricInput[],
): MetricBuildResult => {
	const metrics: Metric[] = [];
	let skippedCount = 0;

	for (const input of inputs) {
		try {
			const metric = {
				label: normalizeMetricLabel(input.label),
				value: normalizeMetricValue(input.value),
			};
			metrics.push(metric);
		} catch {
			skippedCount += 1;
		}
	}

	return { metrics, skippedCount };
};

/** Converts any value into a metric label. */
export const normalizeMetricLabel = (value: unknown): string => {
	const label = String(value ?? "").trim();

	if (!label) {
		throw new Error("metric label が空です");
	}

	return label;
};

/** Converts any value into a metric value; an empty string or a missing value errors rather than counting as 0. */
export const normalizeMetricValue = (value: unknown): number => {
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new Error("metric value を number に変換できません");
		}

		return value;
	}

	const text = String(value ?? "")
		.replaceAll(",", "")
		.trim();

	if (!text) {
		throw new Error("metric value が空です");
	}

	const normalizedValue = Number(text);

	if (!Number.isFinite(normalizedValue)) {
		throw new Error("metric value を number に変換できません");
	}

	return normalizedValue;
};
