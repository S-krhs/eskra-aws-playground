// In scope: app 内の処理間で受け渡す metric 中間表現の型と正規化処理を提供する
// Out of scope: データ取得、selector 解釈、通知文生成を扱う

/** app 内の処理間で受け渡す対象名に紐づく数値 metric。 */
export interface Metric {
	label: string;
	value: number;
}

/** metric 中間表現を作るための未正規化入力。 */
export interface MetricInput {
	label: unknown;
	value: unknown;
}

/** 未正規化入力一覧から作った metric 中間表現一覧と、変換できず除外した入力の件数。 */
export interface MetricBuildResult {
	metrics: Metric[];
	skippedCount: number;
}

/** 未正規化入力一覧から metric 中間表現一覧を作る。変換できない入力は除外して件数に数える。 */
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

/** 任意の値を metric label へ変換する。 */
export const normalizeMetricLabel = (value: unknown): string => {
	const label = String(value ?? "").trim();

	if (!label) {
		throw new Error("metric label が空です");
	}

	return label;
};

/** 任意の値を metric value へ変換する。空文字や欠損値は 0 とみなさずエラーにする。 */
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
