// やること: app 内の処理間で受け渡す metric 中間表現の型と正規化処理を提供する
// やらないこと: データ取得、selector 解釈、通知文生成を扱う

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

/** 未正規化入力から metric 中間表現を作る。 */
export const buildMetric = ({ label, value }: MetricInput): Metric => ({
	label: normalizeMetricLabel(label),
	value: normalizeMetricValue(value),
});

/** 未正規化入力一覧から metric 中間表現一覧を作る。 */
export const buildMetrics = (inputs: readonly MetricInput[]): Metric[] =>
	inputs.map((input) => buildMetric(input));

/** 任意の値を metric label へ変換する。 */
export const normalizeMetricLabel = (value: unknown): string => {
	const label = String(value ?? "").trim();

	if (!label) {
		throw new Error("metric label が空です");
	}

	return label;
};

/** 任意の値を metric value へ変換する。 */
export const normalizeMetricValue = (value: unknown): number => {
	const normalizedValue =
		typeof value === "number"
			? value
			: Number(String(value).replaceAll(",", "").trim());

	if (!Number.isFinite(normalizedValue)) {
		throw new Error("metric value を number に変換できません");
	}

	return normalizedValue;
};
